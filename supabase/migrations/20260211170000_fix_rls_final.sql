-- SOLUÇÃO ROBUSTA PARA RLS
-- Resolve o problema de permissão cruzada entre tabelas (Profiles vs LeadRequests)

-- 1. Cria uma função segura para buscar o telefone do usuário
-- (Usa SECURITY DEFINER para ler o perfil mesmo se a tabela profiles estiver bloqueada)
CREATE OR REPLACE FUNCTION public.get_my_phone_secure()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone_number FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Dá permissão para usar essa função
GRANT EXECUTE ON FUNCTION public.get_my_phone_secure TO postgres, authenticated, anon, service_role;

-- 3. Limpa policies antigas
DROP POLICY IF EXISTS "Users can view requests by ID or Phone" ON public.lead_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lead_requests;
DROP POLICY IF EXISTS "Debug: Allow All" ON public.lead_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.lead_requests;

-- 4. Reativa RLS
ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

-- 5. Cria a política usando a função segura
CREATE POLICY "Users can view requests by ID or Phone"
ON public.lead_requests
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR 
  (
     -- Compara os últimos 11 dígitos (DDD + Número), ignorando formatação e prefixo 55
     RIGHT(regexp_replace(phone_number, '\D','','g'), 11) = 
     RIGHT(regexp_replace(public.get_my_phone_secure(), '\D','','g'), 11)
  )
);
