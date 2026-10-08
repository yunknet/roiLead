-- Correção do Bug de Rotação de Turnos (Fila Travada)
-- Execute este script no SQL Editor do seu painel Supabase.

CREATE OR REPLACE FUNCTION rotate_cupula_turns()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  expired_lead RECORD;
  niche_members UUID[];
  member_count INTEGER;
  current_user_index INTEGER;
  next_pos INTEGER;
  next_user_id UUID;
  rotated_count INTEGER := 0;
BEGIN
  FOR expired_lead IN
    SELECT id, niche, current_turn_user_id, name
    FROM cupula_leads
    WHERE status = 'novos' AND owner_id IS NULL
      AND turn_expires_at IS NOT NULL AND turn_expires_at < now()
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- 1. Obter membros ativos do nicho em ordem fixa (por created_at)
    SELECT ARRAY_AGG(user_id ORDER BY created_at ASC) INTO niche_members
    FROM cupula_access
    WHERE status = 'active' AND user_id IS NOT NULL
      AND expired_lead.niche::text = ANY(niches::text[]);

    IF niche_members IS NULL OR array_length(niche_members, 1) IS NULL THEN 
      CONTINUE; 
    END IF;
    member_count := array_length(niche_members, 1);

    -- 2. Encontrar a posição na lista do consultor que DEIXOU o lead expirar
    current_user_index := array_position(niche_members, expired_lead.current_turn_user_id);
    
    IF current_user_index IS NULL THEN
      -- Se o usuário não está mais na lista (foi desativado), começamos do 0
      current_user_index := 0;
    END IF;

    -- 3. Passar o lead para a PRÓXIMA pessoa na lista (Relativo a este lead específico)
    -- NÃO mexe mais no ponteiro global (cupula_niche_tracking)!
    next_pos := (current_user_index % member_count) + 1;
    next_user_id := niche_members[next_pos];

    -- 4. Atualizar o lead com o novo consultor e reiniciar o timer
    UPDATE cupula_leads SET
      current_turn_user_id = next_user_id,
      turn_expires_at = now() + interval '3 minutes',
      updated_at = now()
    WHERE id = expired_lead.id;

    -- 5. Salvar no Audit Log de Turnos
    INSERT INTO public.cupula_turn_log (lead_id, lead_name, user_id, niche)
    VALUES (expired_lead.id, expired_lead.name, next_user_id, expired_lead.niche::text);

    rotated_count := rotated_count + 1;
  END LOOP;
  RETURN rotated_count;
END;
$$;
