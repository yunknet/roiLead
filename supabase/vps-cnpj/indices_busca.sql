-- =====================================================================
-- ÍNDICES DE BUSCA PARA O BANCO CNPJ DA VPS (geral-supabase.8ffod1.easypanel.host)
-- =====================================================================
-- ATENÇÃO: este arquivo NÃO é uma migration do projeto principal do Supabase.
-- Ele fica fora de supabase/migrations de propósito, para nunca rodar no `supabase db push`.
-- Execute manualmente no SQL Editor do Supabase da VPS.
--
-- O que faz: só cria índices. NÃO altera, apaga nem atualiza nenhuma linha
-- (não aciona triggers de UPDATE/DELETE).
--
-- Antes de rodar (AI_SAFETY_RULES.md):
--   1. Faça backup do banco da VPS.
--   2. Confira o espaço em disco livre: cada índice trigram pode ocupar alguns GB
--      em tabelas com dezenas de milhões de linhas.
--   3. Rode um comando por vez. CONCURRENTLY não bloqueia a tabela, mas demora
--      (pode levar de minutos a horas) e não pode rodar dentro de uma transação.
--      Se o SQL Editor reclamar de transação, rode pelo psql.
--   4. Se o painel cortar por tempo, use psql com: SET statement_timeout = 0;
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Filtro de bairro (hoje um bairro inexistente leva ~17s porque varre a tabela inteira)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfb_estab_bairro_trgm
  ON public.rfb_estabelecimentos USING gin (bairro gin_trgm_ops);

-- Busca por palavra-chave no nome fantasia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfb_estab_nome_fantasia_trgm
  ON public.rfb_estabelecimentos USING gin (nome_fantasia gin_trgm_ops);

-- Busca por razão social (necessário antes de ligar BUSCA_RAZAO_SOCIAL=true na Edge Function)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfb_empresas_razao_social_trgm
  ON public.rfb_empresas USING gin (razao_social gin_trgm_ops);

-- Conferência: lista os índices criados
-- SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
--   FROM pg_indexes WHERE indexname LIKE 'idx_rfb_%_trgm';

-- Depois de criar o índice de razão social, ligue a busca na Edge Function:
--   npx supabase secrets set BUSCA_RAZAO_SOCIAL=true --project-ref bwpgbtgfdijcnbsmhgsg
