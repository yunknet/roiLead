const fs = require('fs');

const csv = fs.readFileSync('./public/leads_planilha.csv', 'utf-8');
const lines = csv.split('\n');

const values = [];
// Start at 1 to skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parser that handles commas
    const cols = [];
    let curr = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '"') {
            inQuotes = !inQuotes;
        } else if (line[j] === ',' && !inQuotes) {
            cols.push(curr);
            curr = '';
        } else {
            curr += line[j];
        }
    }
    cols.push(curr);

    if (cols.length >= 10) {
        let nome = cols[1].replace(/'/g, "''").trim(); // Escape single quotes for SQL
        let telefone = cols[9] ? cols[9].replace(/'/g, "''").trim() : '';
        if (!telefone && cols.length > 10) telefone = cols[10].replace(/'/g, "''").trim();
        if (!telefone && cols.length > 11) telefone = cols[11].replace(/'/g, "''").trim();

        if (nome && telefone) {
            values.push(`('${nome}', '${telefone}')`);
        }
    }
}

const sql = `
-- Atualiza os telefones no cofre buscando o nome correspondente na tabela publica
UPDATE public.cupula_leads_private clp
SET phone = v.phone
FROM (VALUES 
    ${values.join(',\n    ')}
) AS v(nome, phone)
JOIN public.cupula_leads cl ON cl.name = v.nome
WHERE clp.lead_id = cl.id AND (clp.phone IS NULL OR clp.phone = '');
`;

fs.writeFileSync('./public/update_phones.sql', sql);
console.log('Script SQL gerado com sucesso! ' + values.length + ' leads processados.');
