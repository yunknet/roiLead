-- Simplifica a política de RLS para lead_requests
-- Remove a busca por telefone (que permitia "sequestro" de dados ao trocar número no perfil)
-- Agora a visualização é restrita EXCLUSIVAMENTE ao user_id do proprietário

-- 1. Remove políticas antigas que usavam telefone
DROP POLICY IF EXISTS "Users can view requests by ID or Phone" ON public.lead_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.lead_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON public.lead_requests;

-- 2. Cria nova política de visualização restrita ao user_id
CREATE POLICY "Users can view own requests"
ON public.lead_requests
FOR SELECT
USING (
  auth.uid() = user_id
);

-- 3. Cria nova política de exclusão restrita ao user_id
CREATE POLICY "Users can delete own requests"
ON public.lead_requests
FOR DELETE
USING (
  auth.uid() = user_id
);

-- OBS: Para que os leads gerados via WhatsApp (Bot) apareçam no Dashboard,
-- o sistema do Bot deve preencher a coluna user_id ao criar o registro,
-- baseando-se no telefone que está cadastrado na tabela profiles.
