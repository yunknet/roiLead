-- Corrige e expande os ENUMs para evitar erros de inserção/atualização no banco de dados

-- 1. Expande payment_status_type (Tabela subscriptions)
ALTER TYPE public.payment_status_type ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE public.payment_status_type ADD VALUE IF NOT EXISTS 'canceled';

-- 2. Expande subscription_status_type (Tabela subscriptions)
ALTER TYPE public.subscription_status_type ADD VALUE IF NOT EXISTS 'canceled';
ALTER TYPE public.subscription_status_type ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE public.subscription_status_type ADD VALUE IF NOT EXISTS 'trialing';

-- 3. Expande access_status_enum (Tabela profiles)
ALTER TYPE public.access_status_enum ADD VALUE IF NOT EXISTS 'PAID_USER'; -- Alinhando com o que o webhook tentava usar
ALTER TYPE public.access_status_enum ADD VALUE IF NOT EXISTS 'TRIAL';

-- 4. Expande payment_status_enum (Tabela profiles)
ALTER TYPE public.payment_status_enum ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE public.payment_status_enum ADD VALUE IF NOT EXISTS 'CANCELED';

-- Nota: O PostgreSQL não permite remover valores de ENUM facilmente ou fazer ADD VALUE dentro de transações em versões antigas, 
-- mas estes comandos ADD VALUE IF NOT EXISTS são o padrão para correções de schema em Supabase.
