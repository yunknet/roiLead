-- Política para permitir que usuários excluam seus próprios históricos de pesquisa
-- Espelha a lógica de visualização (SELECT), permitindo exclusão por ID de usuário OU telefone correspondente

CREATE POLICY "Users can delete own requests"
ON public.lead_requests
FOR DELETE
USING (
  (auth.uid() = user_id) 
  OR 
  (
     -- Compara os últimos 11 dígitos (DDD + Número), ignorando formatação e prefixo 55
     RIGHT(regexp_replace(phone_number, '\D','','g'), 11) = 
     RIGHT(regexp_replace(public.get_my_phone_secure(), '\D','','g'), 11)
  )
);
