# Relatório de Auditoria de Segurança e Consistência (roiLead)
Data: 13/02/2026

Este relatório detalha as vulnerabilidades, inconsistências e riscos identificados no código atual, com recomendações de correção imediata.

## 🚨 1. Crítico: Falta de Validação no Webhook de Pagamentos

**Local**: `supabase/functions/hubla-webhook/index.ts`
**Severidade**: **ALTÍSSIMA**

**Problema**:
O endpoint do webhook não verifica se a requisição originou realmente da Hubla.
Qualquer pessoa que descobrir a URL da sua função (ex: `https://seu-projeto.supabase.co/functions/v1/hubla-webhook`) pode enviar uma requisição `POST` falsa simulando um pagamento aprovado e liberar acesso premium para si mesma ou cancelar contas de outros usuários, sem pagar nada.

**Impacto**:
- Perda financeira (acesso não pago).
- Corrupção de dados (sobrescrita de assinaturas de usuários legítimos).
- Negação de serviço (cancelamento em massa de contas).

**Recomendação de Correção**:
Adicionar validação de assinatura (`Hubla-Signature`) no header da requisição ou, se a Hubla não suportar assinatura, utilizar um token secreto (Secret Token) na URL ou no Header que só a Hubla conheça.

---

## ⚠️ 2. Importante: Inconsistência no Banco de Dados

**Local**: Tabela `public.subscriptions` vs `hubla-webhook/index.ts`
**Severidade**: **ALTA**

**Problema**:
O código do webhook tenta realizar um `upsert` (inserção ou atualização) utilizando a coluna `external_reference_id` como chave única de conflito:
```typescript
}, { onConflict: 'external_reference_id' })
```
Porém, essa coluna **não consta nas migrations versionadas** (`supabase/migrations/*.sql`).
Se a coluna não existir no banco de produção, o webhook falhará. Se existir mas **não tiver uma constraint UNIQUE**, o comando `upsert` falhará e os pagamentos não serão processados corretamente.

**Impacto**:
- Falha no processamento de pagamentos reais.
- Duplicação de registros de assinaturas.

**Recomendação de Correção**:
Criar uma nova migration que adicione a coluna `external_reference_id` (se não existir) e garanta que ela tenha uma restrição `UNIQUE`.

---

## ⚠️ 3. Vazamento de Dados Pessoais (PII) nos Logs

**Local**: `supabase/functions/hubla-webhook/index.ts`
**Severidade**: **MÉDIA**

**Problema**:
O webhook imprime dados sensíveis dos usuários (Nome completo, Email, Valor pago) diretamente nos logs do servidor:
```typescript
console.log(`💰 Aprovado roiLead: ${fullName} | ${email} | R$ ${amount}`)
```
Isso viola boas práticas de privacidade (LGPD/GDPR), pois os logs podem ser acessados por desenvolvedores ou retidos por tempo indeterminado pelo provedor de cloud.

**Recomendação de Correção**:
Mascarar dados sensíveis nos logs (ex: `j***@gmail.com`).

---

## ℹ️ 4. Performance e RLS (Lead Requests)

**Local**: Migration `20260211170000_fix_rls_final.sql`
**Severidade**: **BAIXA / MÉDIA (Longo Prazo)**

**Problema**:
A política de segurança (RLS) da tabela `lead_requests` utiliza uma função de expressão regular (`regexp_replace`) para comparar telefones a cada leitura:
```sql
RIGHT(regexp_replace(phone_number, '\D','','g'), 11) = ...
```
Isso impede o uso de índices eficientes no banco de dados. Conforme a tabela crescer para milhares/milhões de registros, essa consulta ficará extremamente lenta, consumindo muita CPU do banco.

**Recomendação de Correção**:
Criar uma coluna gerada ou um índice funcional para armazenar o telefone normalizado, permitindo buscas indexadas rápidas.

---

## Resumo das Ações Propostas

1. **[IMEDIATO]** Criar migration para corrigir a tabela `subscriptions` (adicionar `external_reference_id` Unique).
2. **[IMEDIATO]** Atualizar `hubla-webhook` para validar um Segredo de Webhook (que você deve configurar na Hubla e no `.env` do Supabase).
3. **[IMEDIATO]** Mascarar logs sensíveis.
