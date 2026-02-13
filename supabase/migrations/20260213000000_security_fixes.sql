-- 1. Garante que a coluna external_reference_id existe e é única em subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'external_reference_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN external_reference_id TEXT;
    END IF;
END $$;

-- Adiciona constraint UNIQUE se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_external_reference_id_key') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_external_reference_id_key UNIQUE (external_reference_id);
    END IF;
END $$;

-- 2. Otimização de Performance para RLS (Busca por telefone)
-- Cria uma função imutável para normalizar telefone (necessário para criar índice funcional)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT RIGHT(regexp_replace(phone, '\D','','g'), 11);
$$;

-- Cria índices usando a função de normalização
CREATE INDEX IF NOT EXISTS idx_lead_requests_phone_normalized 
ON public.lead_requests (public.normalize_phone(phone_number));

CREATE INDEX IF NOT EXISTS idx_profiles_phone_normalized 
ON public.profiles (public.normalize_phone(phone_number));

-- 3. Atualiza a Policy RLS para usar a função otimizada (e o índice)
DROP POLICY IF EXISTS "Users can view requests by ID or Phone" ON public.lead_requests;

CREATE POLICY "Users can view requests by ID or Phone"
ON public.lead_requests
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR 
  (
     -- Agora usa a função indexável
     public.normalize_phone(phone_number) = 
     public.normalize_phone(public.get_my_phone_secure())
  )
);
