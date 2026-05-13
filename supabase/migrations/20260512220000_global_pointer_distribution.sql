-- =============================================
-- CÚPULA: PONTEIRO GLOBAL CONTÍNUO
-- Distribuição perfeitamente circular e justa
-- Lead novo e retry na mesma esteira
-- =============================================
--
-- Regra de Ouro:
--   17 consultores. Ponteiro em 10.
--   Lead novo → consultor #11, ponteiro = 11
--   Lead expira → consultor #12, ponteiro = 12
--   Sempre avança. Sem privilegiar ninguém.
--
-- Tabela de referência: cupula_niche_tracking (já existe)
--   niche TEXT PRIMARY KEY
--   last_index INTEGER (posição 1-based do último que recebeu, 0 = ninguém ainda)
--   last_user_id UUID
-- =============================================

-- Garante que os nichos existem na tabela de ponteiro
INSERT INTO cupula_niche_tracking (niche, last_index)
VALUES ('Consórcio', 0), ('Administrativo', 0)
ON CONFLICT (niche) DO NOTHING;


-- =============================================
-- 1. TRIGGER: distribute_lead_on_insert
--    Roda ANTES do INSERT em cupula_leads
--    Atribui o lead ao próximo da fila via ponteiro global
-- =============================================
CREATE OR REPLACE FUNCTION distribute_lead_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  members_arr UUID[];
  member_count INTEGER;
  current_ptr INTEGER;
  next_pos INTEGER;
  next_user_id UUID;
BEGIN
  -- 1. Busca membros ativos do nicho, SEMPRE na mesma ordem fixa (created_at)
  --    Isso garante posições determinísticas: #1, #2, ..., #17
  SELECT ARRAY_AGG(user_id ORDER BY created_at ASC)
  INTO members_arr
  FROM public.cupula_access
  WHERE status = 'active'
    AND user_id IS NOT NULL
    AND NEW.niche = ANY(niches);

  -- Se não tem membros ativos, retorna sem atribuir
  IF members_arr IS NULL OR array_length(members_arr, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  member_count := array_length(members_arr, 1);

  -- 2. Lê o ponteiro global do nicho
  SELECT last_index INTO current_ptr
  FROM public.cupula_niche_tracking
  WHERE niche::text = NEW.niche::text
  FOR UPDATE;  -- Lock para evitar race condition entre leads simultâneos

  -- Se não existe registro para este nicho, cria
  IF NOT FOUND THEN
    INSERT INTO public.cupula_niche_tracking (niche, last_index)
    VALUES (NEW.niche, 0)
    ON CONFLICT (niche) DO NOTHING;
    current_ptr := 0;
  END IF;

  current_ptr := COALESCE(current_ptr, 0);

  -- 3. Avança o ponteiro: próximo consultor na fila circular
  --    Fórmula: (ponteiro_atual % total) + 1
  --    Exemplo: ponteiro=10, total=17 → (10 % 17) + 1 = 11
  --    Exemplo: ponteiro=17, total=17 → (17 % 17) + 1 = 1 (volta pro início!)
  next_pos := (current_ptr % member_count) + 1;  -- 1-based (arrays PG são 1-based)
  next_user_id := members_arr[next_pos];

  -- 4. Carimba o lead com o consultor da vez
  NEW.current_turn_user_id := next_user_id;
  NEW.turn_expires_at := now() + interval '3 minutes';
  NEW.assigned_to := next_user_id;
  NEW.assigned_at := now();

  -- 5. Salva o ponteiro global atualizado
  UPDATE public.cupula_niche_tracking
  SET last_index = next_pos,
      last_user_id = next_user_id
  WHERE niche::text = NEW.niche::text;

  RETURN NEW;
END;
$$;


-- =============================================
-- 2. ROTAÇÃO: rotate_cupula_turns
--    Chamada pelo pg_cron (1min) e pelo frontend
--    Quando timer de 3min expira, avança o MESMO ponteiro global
-- =============================================
CREATE OR REPLACE FUNCTION rotate_cupula_turns()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_lead RECORD;
  niche_members UUID[];
  member_count INTEGER;
  current_ptr INTEGER;
  next_pos INTEGER;
  next_user_id UUID;
  rotated_count INTEGER := 0;
BEGIN
  -- Para cada lead com turno expirado
  FOR expired_lead IN
    SELECT id, niche, current_turn_user_id
    FROM cupula_leads
    WHERE status = 'novos'
      AND owner_id IS NULL
      AND turn_expires_at IS NOT NULL
      AND turn_expires_at < now()
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED  -- Lock para evitar race conditions
  LOOP
    -- 1. Busca membros ativos do nicho em ordem fixa
    SELECT ARRAY_AGG(user_id ORDER BY created_at ASC)
    INTO niche_members
    FROM cupula_access
    WHERE status = 'active'
      AND user_id IS NOT NULL
      AND expired_lead.niche::text = ANY(niches::text[]);

    IF niche_members IS NULL OR array_length(niche_members, 1) IS NULL THEN
      CONTINUE;
    END IF;

    member_count := array_length(niche_members, 1);

    -- 2. Lê o ponteiro global do nicho (com lock)
    SELECT last_index INTO current_ptr
    FROM cupula_niche_tracking
    WHERE niche::text = expired_lead.niche::text
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO cupula_niche_tracking (niche, last_index)
      VALUES (expired_lead.niche, 0)
      ON CONFLICT (niche) DO NOTHING;
      current_ptr := 0;
    END IF;

    current_ptr := COALESCE(current_ptr, 0);

    -- 3. Avança o ponteiro (MESMA esteira que lead novo!)
    --    Retry NÃO tem fila separada. Preserva equidade matemática.
    next_pos := (current_ptr % member_count) + 1;
    next_user_id := niche_members[next_pos];

    -- 4. Atualiza o lead com novo dono do turno + renova timer
    UPDATE cupula_leads
    SET
      current_turn_user_id = next_user_id,
      turn_expires_at = now() + interval '3 minutes',
      updated_at = now()
    WHERE id = expired_lead.id;

    -- 5. Salva o ponteiro global
    UPDATE cupula_niche_tracking
    SET last_index = next_pos,
        last_user_id = next_user_id
    WHERE niche::text = expired_lead.niche::text;

    rotated_count := rotated_count + 1;
  END LOOP;

  RETURN rotated_count;
END;
$$;


-- =============================================
-- 3. QUEUE: get_cupula_queue
--    RPC chamada pelo frontend para saber quem são os membros
--    e qual é a posição atual do ponteiro
-- =============================================
CREATE OR REPLACE FUNCTION get_cupula_queue(niche_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_users_list JSON;
  active_user_ids UUID[];
  base_turn_idx INTEGER;
  current_ptr INTEGER;
  member_count INTEGER;
BEGIN
  -- 1. Busca membros ativos do nicho em ordem fixa
  SELECT
    json_agg(json_build_object(
      'user_id', user_id,
      'name', COALESCE(full_name, 'Membro'),
      'joined_at', created_at
    ) ORDER BY created_at ASC),
    array_agg(user_id ORDER BY created_at ASC)
  INTO active_users_list, active_user_ids
  FROM public.cupula_access
  WHERE status = 'active'
    AND user_id IS NOT NULL
    AND niches::text[] @> ARRAY[niche_param]::text[];

  member_count := COALESCE(array_length(active_user_ids, 1), 0);

  -- 2. Lê o ponteiro global do nicho
  SELECT last_index INTO current_ptr
  FROM cupula_niche_tracking
  WHERE niche::text = niche_param;

  current_ptr := COALESCE(current_ptr, 0);

  -- 3. Calcula quem é o próximo (0-based para o frontend)
  --    O frontend espera base_turn_index como 0-based
  IF member_count > 0 THEN
    base_turn_idx := current_ptr % member_count;
  ELSE
    base_turn_idx := 0;
  END IF;

  RETURN json_build_object(
    'active_users', COALESCE(active_users_list, '[]'::json),
    'base_turn_index', base_turn_idx,
    'server_now', (extract(epoch from now()) * 1000)::bigint
  );
END;
$$;
