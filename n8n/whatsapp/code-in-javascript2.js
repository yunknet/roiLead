// Enxuga o JSON para SO os campos usados na mensagem.
const inputData = $json;
const lista = Array.isArray(inputData) ? inputData : (inputData.cnpjs || []);

// Erro da API (chave errada, servidor fora, busca lenta...): avisa o formatador
// para NÃO dizer "0 empresas" quando na verdade a busca nem rodou.
const erroApi = !Array.isArray(inputData) && !inputData.cnpjs && inputData.error ? true : false;

const slim = lista.map(c => ({
  empresa: c.razao_social || "",
  nome_fantasia: c.nome_fantasia || "",
  cnpj: c.cnpj || "",
  situacao: c.situacao_cadastral?.situacao_atual || "",
  situacao_desde: c.situacao_cadastral?.data || "",
  cidade: c.endereco?.municipio || "",
  uf: c.endereco?.uf || "",
  data_abertura: c.data_abertura || "",
  capital_social: c.capital_social ?? "",
  email: (c.contato_email || []).map(e => e.email || "").filter(Boolean).join(", "),
  // guarda ddd/numero/tipo separados para o formatador decidir celular x fixo
  fones: (c.contato_telefonico || []).map(t => ({
    ddd: String(t.ddd || ""), numero: String(t.numero || ""), tipo: String(t.tipo || "")
  })),
  atividade: c.atividade_principal?.descricao || ""
}));

return [{ json: { mensagem_responsiva_string: JSON.stringify(slim), erro_api: erroApi } }];
