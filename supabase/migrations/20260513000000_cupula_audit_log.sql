-- =============================================
-- CÚPULA: AUDITORIA DE TURNOS
-- Registra cada vez que um lead é atribuído a um consultor
-- Prova transparente de que leads passaram por cada membro
-- =============================================

-- Tabela de log de turnos
CREATE TABLE IF NOT EXISTS public.cupula_turn_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  lead_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  niche TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ctl_niche_date ON cupula_turn_log (niche, created_at);
CREATE INDEX IF NOT EXISTS idx_ctl_user_date ON cupula_turn_log (user_id, created_at);

-- RLS: habilita mas permite leitura para usuários autenticados
ALTER TABLE cupula_turn_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros podem ver auditoria" ON cupula_turn_log
  FOR SELECT TO authenticated USING (true);


-- =============================================
-- RPC: get_cupula_audit
-- Retorna auditoria do dia agrupada por consultor
-- =============================================
CREATE OR REPLACE FUNCTION get_cupula_audit(niche_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'lead_name', ctl.lead_name,
      'user_id', ctl.user_id,
      'consultant_name', COALESCE(ca.full_name, 'Membro'),
      'created_at', ctl.created_at,
      'claimed_at', cl.claimed_at,
      'lead_id', ctl.lead_id,
      'was_captured', (cl.owner_id IS NOT NULL AND cl.owner_id = ctl.user_id)
    ) ORDER BY ctl.created_at DESC), '[]'::json)
    FROM cupula_turn_log ctl
    LEFT JOIN cupula_access ca ON ca.user_id = ctl.user_id
    LEFT JOIN cupula_leads cl ON cl.id = ctl.lead_id
    WHERE ctl.niche = niche_param
      AND ctl.created_at >= CURRENT_DATE
  );
END;
$$;


-- =============================================
-- ATUALIZA distribute_lead_on_insert COM LOG
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
  SELECT ARRAY_AGG(user_id ORDER BY created_at ASC)
  INTO members_arr
  FROM public.cupula_access
  WHERE status = 'active'
    AND user_id IS NOT NULL
    AND NEW.niche = ANY(niches);

  IF members_arr IS NULL OR array_length(members_arr, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  member_count := array_length(members_arr, 1);

  SELECT last_index INTO current_ptr
  FROM public.cupula_niche_tracking
  WHERE niche::text = NEW.niche::text
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.cupula_niche_tracking (niche, last_index)
    VALUES (NEW.niche, 0)
    ON CONFLICT (niche) DO NOTHING;
    current_ptr := 0;
  END IF;

  current_ptr := COALESCE(current_ptr, 0);
  next_pos := (current_ptr % member_count) + 1;
  next_user_id := members_arr[next_pos];

  NEW.current_turn_user_id := next_user_id;
  NEW.turn_expires_at := now() + interval '3 minutes';
  NEW.assigned_to := next_user_id;
  NEW.assigned_at := now();

  UPDATE public.cupula_niche_tracking
  SET last_index = next_pos, last_user_id = next_user_id
  WHERE niche::text = NEW.niche::text;

  -- LOG DE AUDITORIA: registra que este consultor recebeu o turno
  INSERT INTO public.cupula_turn_log (lead_id, lead_name, user_id, niche)
  VALUES (NEW.id, NEW.name, next_user_id, NEW.niche::text);

  RETURN NEW;
END;
$$;


-- =============================================
-- ATUALIZA rotate_cupula_turns COM LOG
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
  FOR expired_lead IN
    SELECT id, niche, current_turn_user_id, name
    FROM cupula_leads
    WHERE status = 'novos'
      AND owner_id IS NULL
      AND turn_expires_at IS NOT NULL
      AND turn_expires_at < now()
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
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
    next_pos := (current_ptr % member_count) + 1;
    next_user_id := niche_members[next_pos];

    UPDATE cupula_leads
    SET
      current_turn_user_id = next_user_id,
      turn_expires_at = now() + interval '3 minutes',
      updated_at = now()
    WHERE id = expired_lead.id;

    UPDATE cupula_niche_tracking
    SET last_index = next_pos, last_user_id = next_user_id
    WHERE niche::text = expired_lead.niche::text;

    -- LOG DE AUDITORIA: registra que este consultor recebeu o turno na rotação
    INSERT INTO public.cupula_turn_log (lead_id, lead_name, user_id, niche)
    VALUES (expired_lead.id, expired_lead.name, next_user_id, expired_lead.niche::text);

    rotated_count := rotated_count + 1;
  END LOOP;

  RETURN rotated_count;
END;
$$;
