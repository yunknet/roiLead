# Guia de Operação: Cúpula de Leads (CRM)

Este documento contém os comandos e procedimentos essenciais para gerenciar a Cúpula de Leads diretamente via banco de dados, utilizando o novo sistema de **Roleta Automática por Tempo**.

---

## 1. Como a Roleta Funciona (Lógica de Tempo)
O sistema não usa mais uma fila fixa. Ele prioriza **quem está há mais tempo sem receber leads**.
1. Se houver consultores que nunca receberam leads (`last_lead_at` é NULL), eles têm prioridade total.
2. Entre quem já recebeu, o lead vai para quem tem a data de recebimento mais antiga.
3. Assim que alguém recebe um lead, o tempo dela zera e ela vai para o "final da fila de espera".

---

## 2. Inserção de Leads (Automática)
Você não precisa mais calcular o dono ou o tempo de expiração. O gatilho `distribute_lead_on_insert` faz tudo sozinho.

```sql
INSERT INTO public.cupula_leads (niche, name, phone, notes) VALUES
('Consórcio', 'Nome do Lead', '5511999999999', 'Notas do lead...');
```

---

## 3. Gerenciamento de Consultores (Cúpulas)
Para dar acesso a um consultor em um nicho específico (ex: Administrativo), atualize a coluna `niches`:

```sql
-- Dar acesso a Consórcio e Administrativo
UPDATE public.cupula_access 
SET niches = ARRAY['Consórcio', 'Administrativo']::public.cupula_niche[]
WHERE email = 'email@exemplo.com';
```

---

## 4. Resetar a Fila de Espera (Prioridade)
Se quiser "limpar" quem já recebeu leads para que a fila recomece de forma justa do primeiro ao último:

```sql
UPDATE public.cupula_access SET last_lead_at = NULL;
```

---

## 5. Limpeza de Leads de Teste
Para apagar leads de uma cúpula específica (ex: para limpar a cúpula Administrativa após uma reunião):

```sql
DELETE FROM public.cupula_leads WHERE niche = 'Administrativo';
```

---

## 6. Scripts de Manutenção (DASHBOARD)
Sempre que fizer alterações estruturais na fila, lembre-se de rodar a função de rotação para processar leads expirados:

```sql
SELECT rotate_cupula_turns();
```

---

*Documento atualizado em 11/05/2026 - Implementação de Roleta por Tempo e Multi-Nicho.*
