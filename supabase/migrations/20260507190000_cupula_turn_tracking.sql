-- =============================================
-- CÚPULA: TURN TRACKING NO BANCO DE DADOS
-- Fonte de verdade para "de quem é a vez"
-- =============================================

-- 1. Novos campos na tabela de leads
ALTER TABLE cupula_leads 
  ADD COLUMN IF NOT EXISTS current_turn_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS turn_expires_at TIMESTAMPTZ;

-- 2. Índice para busca rápida de turnos expirados
CREATE INDEX IF NOT EXISTS idx_cupula_leads_turn_expires 
  ON cupula_leads(turn_expires_at) 
  WHERE status = 'novos' AND owner_id IS NULL;

-- 3. Preencher dados existentes: leads novos sem dono ganham turno do assigned_to
UPDATE cupula_leads 
SET 
  current_turn_user_id = assigned_to,
  turn_expires_at = COALESCE(assigned_at, created_at) + interval '3 minutes'
WHERE status = 'novos' 
  AND owner_id IS NULL 
  AND assigned_to IS NOT NULL
  AND current_turn_user_id IS NULL;

-- 4. Função de rotação de turnos
CREATE OR REPLACE FUNCTION rotate_cupula_turns()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_lead RECORD;
  active_members UUID[];
  member_count INTEGER;
  current_index INTEGER;
  next_index INTEGER;
  next_user_id UUID;
  rotated_count INTEGER := 0;
BEGIN
  -- Busca membros ativos ordenados por data de entrada
  SELECT ARRAY_AGG(user_id ORDER BY created_at ASC)
  INTO active_members
  FROM cupula_access
  WHERE status = 'active' AND user_id IS NOT NULL;

  -- Se não tem membros, sai
  IF active_members IS NULL OR array_length(active_members, 1) IS NULL THEN
    RETURN 0;
  END IF;

  member_count := array_length(active_members, 1);

  -- Para cada lead com turno expirado
  FOR expired_lead IN
    SELECT id, current_turn_user_id
    FROM cupula_leads
    WHERE status = 'novos'
      AND owner_id IS NULL
      AND turn_expires_at IS NOT NULL
      AND turn_expires_at < now()
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED  -- Lock para evitar race conditions
  LOOP
    -- Encontra o índice do usuário atual na lista de membros
    current_index := NULL;
    FOR i IN 1..member_count LOOP
      IF active_members[i] = expired_lead.current_turn_user_id THEN
        current_index := i;
        EXIT;
      END IF;
    END LOOP;

    -- Próximo da fila (circular)
    IF current_index IS NOT NULL THEN
      next_index := (current_index % member_count) + 1;
    ELSE
      -- Se o usuário atual não está mais ativo, começa do primeiro
      next_index := 1;
    END IF;

    next_user_id := active_members[next_index];

    -- Atualiza o lead com o novo dono do turno
    UPDATE cupula_leads
    SET 
      current_turn_user_id = next_user_id,
      turn_expires_at = now() + interval '3 minutes',
      updated_at = now()
    WHERE id = expired_lead.id;

    rotated_count := rotated_count + 1;
  END LOOP;

  RETURN rotated_count;
END;
$$;

-- 5. Agendar a rotação a cada minuto via pg_cron
-- (pg_cron mínimo é 1 minuto, mas a função rotate_cupula_turns
--  também é chamada pelo cupula-queue a cada request, garantindo frescor)
SELECT cron.schedule(
  'rotate-cupula-turns',
  '* * * * *',
  'SELECT rotate_cupula_turns()'
);
