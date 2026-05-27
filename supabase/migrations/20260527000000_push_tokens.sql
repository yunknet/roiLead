-- Tabela para armazenar os tokens Push (Expo) dos consultores
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expo_token TEXT NOT NULL UNIQUE,
    platform TEXT, -- 'ios' ou 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Usuários podem ver seus próprios tokens
CREATE POLICY "Users can view their own push tokens"
    ON public.push_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários podem inserir/atualizar seus próprios tokens
CREATE POLICY "Users can insert their own push tokens"
    ON public.push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
    ON public.push_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- O Trigger para disparar o Webhook será configurado no Painel Supabase
-- (Interface Gráfica: Database -> Webhooks) para melhor controle.
