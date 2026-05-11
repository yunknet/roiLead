# Guia de Operação: Cúpula de Leads (CRM)

Este documento contém os comandos e procedimentos essenciais para gerenciar a Cúpula de Leads diretamente via banco de dados.

---

## 1. Como Inserir Leads Manualmente (Com Roleta Ativa)
Sempre que precisar inserir leads via SQL Editor, use este formato para que eles já entrem com o **timer de 3 minutos** e atribuídos a um consultor.

```sql
INSERT INTO public.cupula_leads (niche, name, phone, notes, status, current_turn_user_id, turn_expires_at) VALUES
(
  'Consórcio', 
  'NOME_DO_LEAD', 
  'TELEFONE', 
  'Email: email@exemplo.com | 🔸 Tipo De Consórcio: Imóvel | 🔸 Valor Do Crédito Desejado: até r$ 100.000', 
  'novos',
  'ID_DO_CONSULTOR', -- Pegue o ID na aba "Fila de Consultores" no CRM
  now() + interval '3 minutes'
);
```

---

## 2. Como Distribuir Leads "Neutros" (Roleta Justa / Round-Robin)
Se você inseriu vários leads sem dono e quer que o sistema divida eles igualmente entre toda a equipe de forma aleatória:

```sql
WITH RankedLeads AS (
  SELECT id, row_number() over (ORDER BY created_at) - 1 as rn
  FROM public.cupula_leads
  WHERE current_turn_user_id IS NULL AND status = 'novos' AND owner_id IS NULL
),
ActiveUsers AS (
  SELECT user_id, row_number() over (ORDER BY random()) - 1 as rn, count(*) over() as total_users
  FROM public.cupula_access
  WHERE status = 'active' AND user_id IS NOT NULL
)
UPDATE public.cupula_leads
SET 
  current_turn_user_id = au.user_id,
  turn_expires_at = now() + interval '3 minutes'
FROM RankedLeads rl
JOIN ActiveUsers au ON (rl.rn % au.total_users) = au.rn
WHERE public.cupula_leads.id = rl.id;
```

---

## 3. Como Adicionar um Novo Consultor na Cúpula
Para liberar o acesso de um novo corretor à Cúpula de Leads:

```sql
INSERT INTO public.cupula_access (user_id, email, full_name, status) VALUES
('ID_DO_USER_SUPABASE', 'email@exemplo.com', 'Nome Completo', 'active')
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status,
  updated_at = now();
```

---

## 4. Visualização de Dados (View)
Para facilitar a gestão, criamos uma "Tabela Virtual" que mostra os nomes reais de quem capturou cada lead. Ela pode ser consultada no Supabase como:
`SELECT * FROM public.vw_cupula_leads_com_nomes;`

---

## 5. Notas Importantes (Lembretes do Desenvolvedor)
- **Status das Etapas:** A coluna `status` foi alterada para `TEXT`. Isso permite criar "Novas Etapas" personalizadas sem dar erro de permissão.
- **Formatação:** O rótulo "Valor do Bem" foi substituído por **"Crédito desejado:"** para melhor legibilidade no CRM.
- **Consultores:** O termo "Corretor" foi atualizado para **"Consultor"** em toda a interface da Cúpula.
