# 🚨 CRITICAL AI SAFETY RULES 🚨

**This document was created as a mandatory protocol after a severe data loss incident (May 27, 2026).** 
**Every AI agent operating in this repository MUST read and strictly adhere to these rules before executing any task.**

## 1. NUNCA APAGUE DADOS DE USUÁRIOS
- É estritamente **PROIBIDO** executar comandos de `DELETE`, `TRUNCATE` ou `DROP TABLE` em tabelas de produção que contenham dados de usuários (ex: `cupula_leads`, `cupula_leads_private`, `profiles`, etc).
- É estritamente **PROIBIDO** executar comandos de `UPDATE` em massa que definam colunas como `NULL` ou vazias (`''`) sem antes garantir, testar e comprovar que os dados estão salvos de forma redundante e segura.

## 2. CUIDADO EXTREMO COM GATILHOS (TRIGGERS) E CASCADE
- **A Lição Aprendida:** Um `UPDATE` em massa (ex: atualizar uma formatação de texto em todas as linhas) irá acionar todos os gatilhos `BEFORE/AFTER UPDATE` para **cada linha individualmente**.
- Se o gatilho tiver lógica de cópia/sincronização de dados, o `UPDATE` em massa pode acidentalmente sobrescrever ou apagar dados em tabelas secundárias (como aconteceu com o cofre de leads).
- **Regra:** Antes de rodar um `UPDATE` em massa, o AI **DEVE** inspecionar todos os gatilhos ativos na tabela e prever o efeito em cadeia para variáveis como `NEW.phone`, `NEW.email`, etc.

## 3. SEPARAÇÃO E TESTES
- Nunca faça testes de scripts estruturais diretamente na tabela inteira. 
- Para validar um gatilho ou script SQL, use um `WHERE id = 'id-de-teste'` para garantir que o efeito esperado ocorreu apenas em um ambiente isolado.

## 4. TRANSPARÊNCIA E PERMISSÃO
- O AI nunca deve assumir que "está seguro" sem provas matemáticas e lógicas. 
- Se uma tarefa envolver risco de perda de dados, o AI deve parar e alertar o usuário, pedindo que um backup manual (exportação CSV ou PITR no Supabase) seja confirmado antes de prosseguir.

---
*Assinado: Antigravity AI (Para não repetir os mesmos erros e garantir a total segurança do sistema).*
