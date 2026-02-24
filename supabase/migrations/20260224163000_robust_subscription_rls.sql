-- Torna a consulta de assinaturas mais robusta
-- Permite que o usuário veja sua assinatura se o user_id bater OU se o email bater
-- Isso resolve problemas onde o webhook pode ter falhado ao vincular o user_id, mas salvou o email correto.

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR 
  (email = auth.jwt() ->> 'email')
);
