-- Tabela de avisos da Cúpula (mensagens de aviso gerenciadas pelo admin via banco de dados)
CREATE TABLE IF NOT EXISTS public.cupula_notices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    niche text NOT NULL,
    message text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca rápida por nicho
CREATE INDEX IF NOT EXISTS cupula_notices_niche_idx ON public.cupula_notices (niche);

-- RLS: habilita segurança por linha
ALTER TABLE public.cupula_notices ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER os avisos (mas não editar)
CREATE POLICY "Authenticated users can read notices"
    ON public.cupula_notices
    FOR SELECT
    TO authenticated
    USING (true);

-- Insere um aviso vazio de exemplo para cada nicho (inativo por padrão)
INSERT INTO public.cupula_notices (niche, message, is_active)
VALUES
    ('Consórcio', '', false),
    ('Administrativo', '', false)
ON CONFLICT DO NOTHING;

-- Comentário explicativo
COMMENT ON TABLE public.cupula_notices IS 'Avisos e comunicados da Cúpula de Leads, gerenciados pelo admin diretamente no banco. Para alterar uma mensagem: UPDATE public.cupula_notices SET message = ''Seu aviso aqui'', is_active = true WHERE niche = ''Consórcio'';';
