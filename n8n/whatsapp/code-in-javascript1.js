// ============ MONTA O BODY DA API (interpretação feita em código, não pela IA) ============
// Lê a mensagem ORIGINAL do cliente e extrai os filtros com regras fixas.
// A IA (AI Agent2/AI Agent4) vira só "dica": usada apenas quando o código não encontra algo.
// Motivo: o modelo pequeno inventa filtros (capital mínimo, datas, "com celular") e erra acentos,
// e cada filtro inventado pode zerar o resultado.

const TETO = 10;

// ---------- utilitários ----------
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[“”"'`´]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const numeroBR = (txt, unidade) => {
  let s = String(txt || '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  let n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  const u = norm(unidade);
  if (u === 'mil' || u === 'k') n *= 1000;
  if (/^(milhao|milhoes|mi|mm)$/.test(u)) n *= 1000000;
  return Math.round(n);
};

// ---------- entradas ----------
let original = '';
try {
  const m = $('Edit Fields5').first().json.message;
  original = Array.isArray(m) ? m.join(' ') : String(m || '');
} catch (e) { original = ''; }
if (!original) {
  try { original = String($('Webhook1').first().json.body.data.message.conversation || ''); } catch (e) { original = ''; }
}
let reescrito = '';
try { reescrito = String($('AI Agent2').first().json.output || ''); } catch (e) { reescrito = ''; }

const ia = ($json && typeof $json === 'object' && !$json.erro) ? $json : {};
let T = ' ' + norm(original) + ' ';
const R = ' ' + norm(reescrito) + ' ';
const ORIGINAL_CRU = ' ' + String(original || '') + ' ';

// ---------- UFs e cidades ----------
const ESTADOS = [
  ['mato grosso do sul', 'MS'], ['mato grosso', 'MT'], ['rio grande do sul', 'RS'], ['rio grande do norte', 'RN'],
  ['rio de janeiro', 'RJ'], ['sao paulo', 'SP'], ['minas gerais', 'MG'], ['espirito santo', 'ES'],
  ['santa catarina', 'SC'], ['parana', 'PR'], ['bahia', 'BA'], ['pernambuco', 'PE'], ['ceara', 'CE'],
  ['paraiba', 'PB'], ['alagoas', 'AL'], ['sergipe', 'SE'], ['piaui', 'PI'], ['maranhao', 'MA'],
  ['para', 'PA'], ['amapa', 'AP'], ['amazonas', 'AM'], ['roraima', 'RR'], ['rondonia', 'RO'],
  ['acre', 'AC'], ['tocantins', 'TO'], ['goias', 'GO'], ['distrito federal', 'DF'],
];
const SIGLAS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
// siglas que também são palavras comuns: só valem se escritas em MAIÚSCULAS na mensagem
const SIGLAS_AMBIGUAS = ['ES','PA','PE','SE','TO','MA','AM','AL'];
// estados cujo nome também é nome de cidade
const ESTADO_E_CIDADE = { 'sao paulo': 'SP', 'rio de janeiro': 'RJ' };
const APELIDOS = {
  'bh': ['belo horizonte', 'MG'], 'beaga': ['belo horizonte', 'MG'], 'sampa': ['sao paulo', 'SP'],
  'rio': ['rio de janeiro', 'RJ'], 'poa': ['porto alegre', 'RS'], 'floripa': ['florianopolis', 'SC'],
  'bsb': ['brasilia', 'DF'], 'brasilia': ['brasilia', 'DF'], 'cwb': ['curitiba', 'PR'], 'ssa': ['salvador', 'BA'],
  'sjc': ['sao jose dos campos', 'SP'], 'sjrp': ['sao jose do rio preto', 'SP'], 'rp': ['ribeirao preto', 'SP'],
  'bc': ['balneario camboriu', 'SC'], 'jf': ['juiz de fora', 'MG'], 'bauru': ['bauru', 'SP'],
};

const ehSigla = (tok, cru) => {
  const up = tok.toUpperCase();
  if (!SIGLAS.includes(up)) return false;
  if (!SIGLAS_AMBIGUAS.includes(up)) return true;
  return new RegExp('(^|[^A-Za-z])' + up + '([^A-Za-z]|$)').test(cru);
};

// ---------- 1) NICHO -> CNAE (sem acentos; o primeiro que casar "consome" as palavras) ----------
const RAMOS = [
  [/material(is)? (de )?constru|deposito de constru|casa de constru|loja de constru/, ['4744099', '4744001', '4679699', '4744005']],
  [/distribuidora de bebida|deposito de bebida/, ['4635499', '4723700']],
  [/loja de informatica|loja de computador/, ['4751201']],
  [/assistencia tecnica de celular|conserto de celular/, ['9512600']],
  [/loja de celular/, ['4752100']],
  [/clinica (de )?estetica|estetica|depilacao|sobrancelha|design de sobrancelha/, ['9602502']],
  [/salao de beleza|saloes de beleza|cabeleire|manicure|barbearia|esmalteria/, ['9602501']],
  [/loja de vinhos?|vinhos?\b|vinicola|emporio/, ['4723700']],
  [/atacad|distribuidora|distribuidor\b/, ['4639701', '4691500', '4693100', '4635499']],
  [/hamburguer|lanchonete|cafeteria|\bcafes?\b|casa de sucos?|acaiteria|\bacai\b|pastelaria|sorveteria/, ['5611203']],
  [/food ?truck/, ['5612100']],
  [/marmita|quentinha|comida congelada/, ['5620104']],
  [/restaurante|pizzaria|churrascaria|cantina|sushi|comida japonesa/, ['5611201']],
  [/\bbar\b|\bbares\b|choperia|boteco|pub\b/, ['5611204', '5611205']],
  [/adega|loja de bebida|conveniencia/, ['4723700']],
  [/padaria|panificad/, ['4721102', '1091102']],
  [/confeitaria|doceria|docinhos|bolos/, ['1091102', '4721104']],
  [/supermercad|hipermercad|mercadinho|minimercad|mercearia/, ['4711302', '4711301', '4712100']],
  [/acougue|casa de carne/, ['4722901']],
  [/hortifruti|sacolao|quitanda|frutaria/, ['4724500']],
  [/buffet|\bbufe\b|organizacao de eventos|festas|cerimonial/, ['5620102', '8230001']],
  [/farmacia|drogaria/, ['4771701', '4771702']],
  [/odontol|dentista|ortodont|clinica odonto/, ['8630504']],
  [/veterinari/, ['7500100']],
  [/fisioterap/, ['8650004']],
  [/psicolog|psicanal/, ['8650003']],
  [/nutricionis/, ['8650002']],
  [/fonoaudiolog/, ['8650006']],
  [/laboratorio/, ['8640202']],
  [/hospita/, ['8610101']],
  [/clinica medica|consultorio medico|clinicas? medicas?|medicos?\b|clinicas?\b/, ['8630503', '8630501', '8630502']],
  [/academia|crossfit|pilates|studio de treino/, ['9313100']],
  [/pet ?shop|petshop|animais de estima|agropet|casa de racao|banho e tosa/, ['4789004', '9609208']],
  [/construtora|construcao civil|empreiteira/, ['4120400', '4399103']],
  [/imobiliari|corretor(a|es)? de imove/, ['6821801', '6821802', '6822600']],
  [/contabil|contador|escritorio contab/, ['6920601']],
  [/advocac|advogad|escritorio de advoc/, ['6911701']],
  [/corretora de seguro|seguradora|seguros\b/, ['6622300']],
  [/consultoria/, ['7020400']],
  [/transportadora|transporte de carga|logistic|frete/, ['4930202', '4930201', '5250804']],
  [/software|desenvolvimento de (programas|sistemas)|\bti\b|tecnologia|informatica|empresa de sistemas/, ['6201501', '6202300', '6204000']],
  [/marketing|publicidade|agencia de propaganda|propaganda/, ['7311400', '7319002', '7319003']],
  [/energia solar|placas? solar|fotovoltai/, ['4321500']],
  [/eletricista|instalacao eletrica/, ['4321500']],
  [/encanador|hidraulic/, ['4322301']],
  [/ar condicionado|climatizacao|refrigeracao/, ['4322302']],
  [/dedetiza|controle de pragas/, ['8122200']],
  [/engenharia/, ['7112000']],
  [/arquitetura|arquitet/, ['7111100']],
  [/hote(l|is)|pousada|hospedagem|hostel/, ['5510801', '5590699']],
  [/motel/, ['5510803']],
  [/idioma|ingles|escola de lingua/, ['8593700']],
  [/autoescola|auto escola|cfc\b/, ['8599601']],
  [/creche|bercario/, ['8511200']],
  [/escola|colegio|ensino/, ['8513900', '8520100', '8512100']],
  [/curso|treinamento/, ['8599604', '8599699']],
  [/lava ?jato|lava ?rapido|estetica automotiva/, ['4520005']],
  [/borracharia/, ['4520006']],
  [/oficina|mecanica|funilaria|auto center/, ['4520001', '4520002']],
  [/auto ?pecas|pecas (para |de )?(veiculos|carros)/, ['4530703']],
  [/concessionari|revenda de (carros|veiculos)|loja de carros|garagem de carros/, ['4511101', '4511102']],
  [/posto de (gasolina|combustivel)|postos de combustivel/, ['4731800']],
  [/lavanderia/, ['9601701']],
  [/grafica|impressao/, ['1813099', '1813001']],
  [/confeccao|confeccoes/, ['1412601']],
  [/loja de roupas?|roupas|vestuario|moda|boutique/, ['4781400']],
  [/calcados|sapataria|loja de sapato/, ['4782201']],
  [/moveis planejados|marcenaria|movelaria/, ['3101200', '4754701']],
  [/moveis/, ['4754701']],
  [/eletrodomestic/, ['4753900']],
  [/papelaria/, ['4761003']],
  [/otica/, ['4774100']],
  [/joalheria|joias/, ['4783101']],
  [/relojoaria/, ['4783102']],
  [/cosmetico|perfumaria/, ['4772500']],
  [/agropecuari|insumos agricolas|\bagro\b/, ['4692300', '4661300']],
  [/madeireira|madeira/, ['4744002', '4671100']],
  [/floricultura|flores/, ['4789002']],
  [/vidracaria|vidros/, ['4743100']],
  [/tabacaria/, ['4729601']],
  [/seguranca (privada|patrimonial)|vigilancia/, ['8011101']],
  [/limpeza|conservacao predial|faxina/, ['8121400']],
  [/funeraria/, ['9603304']],
  [/fotograf/, ['7420001']],
  [/tatuag|tattoo|piercing/, ['9609206']],
  [/igreja|templo/, ['9491000']],
];

let cnaes = [];
let textoNicho = T + ' ';
let nichosAchados = [];
const procuraNicho = (fonte) => {
  let txt = fonte;
  const achados = [];
  for (const [re, cods] of RAMOS) {
    const reG = new RegExp(re.source, 'g');
    if (reG.test(txt)) {
      achados.push(...cods);
      txt = txt.replace(new RegExp(re.source, 'g'), ' ');
    }
  }
  return [...new Set(achados)];
};
cnaes = procuraNicho(textoNicho);
if (cnaes.length === 0 && R.trim()) cnaes = procuraNicho(R); // texto reescrito pela IA (ex: no retry do AI Agent6)
// CNAE digitado pelo cliente (ex: "cnae 5611201")
const cnaeDigitado = [...T.matchAll(/\b(\d{4}-?\d\/?\d{2})\b/g)].map((m) => m[1].replace(/\D/g, '')).filter((c) => c.length === 7);
if (cnaeDigitado.length) cnaes = [...new Set([...cnaeDigitado, ...cnaes])];
T = T.replace(/\b(?:cnae\s*)?\d{4}-?\d\/?\d{2}\b/g, ' ').replace(/\bcnae\b/g, ' ');

// ---------- 2) FILTROS NUMÉRICOS (lidos e removidos do texto, para não confundir quantidade/cidade) ----------
const body = { situacao_cadastral: ['ATIVA'], pagina: 1, mais_filtros: { com_telefone: true } };
const consome = (re) => { T = T.replace(re, ' '); };

// Capital social
const UNID = '(mil|k|milhao|milhoes|mi)?';
const VAL = '(?:r\\$\\s*)?(\\d[\\d.,]*)\\s*' + UNID;
let m;
if ((m = T.match(new RegExp('capital(?: social)?\\s*(?:de |entre )?' + VAL + '\\s*(?:a|e|ate)\\s*' + VAL)))) {
  const min = numeroBR(m[1], m[2]); const max = numeroBR(m[3], m[4]);
  if (min > 0 && max >= min) body.capital_social = { minimo: min, maximo: max };
  consome(m[0]);
} else {
  const mMin = T.match(new RegExp('capital(?: social)?\\s*(?:de |acima de |a partir de |maior que |superior a |minimo de |minimo |no minimo |mais de |>\\s*)?' + VAL));
  const mMax = T.match(new RegExp('capital(?: social)?\\s*(?:ate |abaixo de |menor que |inferior a |no maximo |maximo de |<\\s*)' + VAL));
  if (mMax) {
    const max = numeroBR(mMax[1], mMax[2]);
    if (max > 0) body.capital_social = { maximo: max };
    consome(mMax[0]);
  } else if (mMin) {
    const min = numeroBR(mMin[1], mMin[2]);
    if (min > 0) body.capital_social = { minimo: min };
    consome(mMin[0]);
  }
}

// Data de abertura (a base tem empresas abertas a partir de 2020)
const hoje = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
if ((m = T.match(/\b(?:abertas?|abertura|fundadas?|criadas?)?\s*(?:de|entre|desde)\s*(20\d{2})\s*(?:a|ate|e|-)\s*(20\d{2})\b/))) {
  body.data_abertura = { inicio: m[1] + '-01-01', fim: m[2] + '-12-31' }; consome(m[0]);
} else if ((m = T.match(/\b(?:nos?|dos?)?\s*ultim[oa]s?\s*(\d{1,3})?\s*(dias?|mes|meses|anos?)\b/))) {
  const n = parseInt(m[1] || '1', 10); const d = new Date(hoje);
  if (/^dia/.test(m[2])) d.setDate(d.getDate() - n);
  else if (/^mes/.test(m[2])) d.setMonth(d.getMonth() - n);
  else d.setFullYear(d.getFullYear() - n);
  body.data_abertura = { inicio: iso(d), fim: iso(hoje) }; consome(m[0]);
} else if ((m = T.match(/\b(?:desde|a partir de|depois de|apos)\s*(20\d{2})\b/))) {
  body.data_abertura = { inicio: m[1] + '-01-01', fim: iso(hoje) }; consome(m[0]);
} else if ((m = T.match(/\b(?:abertas?|fundadas?|criadas?)\s*(?:em|no ano de|no ano)\s*(20\d{2})\b/))) {
  body.data_abertura = { inicio: m[1] + '-01-01', fim: m[1] + '-12-31' }; consome(m[0]);
} else if ((m = T.match(/\b(recem[ -]?abertas?|abertas? recentemente)\b/))) {
  const d = new Date(hoje); d.setMonth(d.getMonth() - 3);
  body.data_abertura = { inicio: iso(d), fim: iso(hoje) }; consome(m[0]);
}

// DDD
const ddds = [...T.matchAll(/\bddds?\s*(\d{2}(?:\s*(?:,|e|\/)\s*\d{2})*)/g)].flatMap((x) => x[1].match(/\d{2}/g));
if (ddds.length) { body.ddd = [...new Set(ddds)]; consome(/\bddds?\s*\d{2}(?:\s*(?:,|e|\/)\s*\d{2})*/g); }

// MEI / Simples / Matriz / contato
if (/\b(nao|sem|exceto|excluir|excluindo|tirar|tirando|menos|fora)\b[^.]{0,20}\bmei\b/.test(T)) body.mei = { excluir_optante: true };
else if (/\b(so|somente|apenas|que sejam?)\s+(os?\s+|as?\s+)?mei\b/.test(T)) body.mei = { optante: true };
if (/\b(nao|sem|exceto|excluir|excluindo|fora)\b[^.]{0,20}\bsimples\b/.test(T)) body.simples = { excluir_optante: true };
else if (/\bsimples nacional\b|\boptantes? (pelo|do) simples\b/.test(T)) body.simples = { optante: true };
if (/\b(so|somente|apenas)\s+(as\s+)?matriz(es)?\b|\bmatriz(es)?\b/.test(T)) body.matriz_filial = 'MATRIZ';
else if (/\b(so|somente|apenas)\s+(as\s+)?filia(l|is)\b/.test(T)) body.matriz_filial = 'FILIAL';
if (/celular|whats ?app|\bzap\b|\bwpp\b|\bwhats\b/.test(T)) body.mais_filtros.somente_celular = true;
else if (/\b(telefone )?fixo\b/.test(T)) body.mais_filtros.somente_fixo = true;
if (/\be-?mails?\b/.test(T)) body.mais_filtros.com_email = true;
consome(/\(?\s*com (telefone )?(celular|whats ?app|zap|wpp|fixo|e-?mails?|telefone)\s*\)?/g);

// ---------- 3) QUANTIDADE ----------
const EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15, vinte: 20, trinta: 30 };
let pedido = null;
if ((m = T.match(/\b(\d{1,4})\b/))) pedido = parseInt(m[1], 10);
else if ((m = T.match(new RegExp('\\b(' + Object.keys(EXTENSO).join('|') + ')\\b(?=\\s+(empresas?|leads?|cnpjs?|contatos?|[a-z]))')))) pedido = EXTENSO[m[1]];
if (!Number.isFinite(pedido) || pedido < 1) pedido = TETO;
body.limite = Math.min(pedido, TETO);

// ---------- 4) LOCALIZAÇÃO ----------
const FIM_BAIRRO = '(?=$|[,.;!?]| de | em | na | no | com | que | abert| capital| ddd| sem | so | somente | apenas )';
const FIM_LOCAL = '(?=$|[.;!?]| com| que | abert| fundad| capital| no bairro| bairro| ddd| nos? ultim| desde| ate | entre | sem | so | somente | apenas | exceto | menos | e que | para | pra | por favor)';
let bairros = [];
if ((m = T.match(new RegExp('\\b(?:no |do |nos |dos )?bairros?\\s+(?:d[aeo]s?\\s+)?([a-z0-9 ]+?)' + FIM_BAIRRO)))) {
  bairros = [m[1].trim()].filter(Boolean);
  // "no bairro Centro de SP" -> bairro "centro" e o resto vira local ("em SP")
  const antes = T.slice(0, m.index);
  const depois = T.slice(m.index + m[0].length).replace(/^\s*(?:de|do|da|em)\s+/, ' em ');
  T = antes + ' ' + depois;
}

let ufs = [];
let cidades = [];
const addLocal = (pedaco) => {
  let p = ' ' + pedaco.trim() + ' ';
  if (!p.trim()) return;
  // apelido inteiro (bh, poa, ...)
  const ap = APELIDOS[p.trim()];
  if (ap) { cidades.push(ap[0]); ufs.push(ap[1]); return; }
  // "cidade - uf", "cidade/uf", "cidade uf" no final
  let ufFinal = null;
  const mSig = p.match(/[\s\-\/]+([a-z]{2})\s*$/);
  if (mSig && ehSigla(mSig[1], ORIGINAL_CRU) && p.trim().length > 2) { ufFinal = mSig[1].toUpperCase(); p = p.slice(0, mSig.index) + ' '; }
  if (!ufFinal) {
    for (const [nome, sig] of ESTADOS) {
      const re = new RegExp('[\\s\\-\\/]+(?:estado d[eo] )?' + nome + '\\s*$');
      if (re.test(p) && p.trim() !== nome) { ufFinal = sig; p = p.replace(re, ' '); break; }
    }
  }
  const nome = p.replace(/^\s*(?:a|o|as|os|cidade de|municipio de|estado d[eoa]s?|regiao de)\s+/, '').trim();
  if (!nome) { if (ufFinal) ufs.push(ufFinal); return; }
  if (ESTADO_E_CIDADE[nome]) { cidades.push(nome); ufs.push(ESTADO_E_CIDADE[nome]); return; }
  const est = ESTADOS.find(([n]) => n === nome);
  if (est) { ufs.push(est[1]); return; } // só o estado
  if (nome.length === 2 && ehSigla(nome, ORIGINAL_CRU)) { ufs.push(nome.toUpperCase()); return; }
  if (APELIDOS[nome]) { cidades.push(APELIDOS[nome][0]); ufs.push(APELIDOS[nome][1]); return; }
  cidades.push(nome);
  if (ufFinal) ufs.push(ufFinal);
};

const mLocal = [...T.matchAll(new RegExp('\\b(em|na cidade de|no municipio de|na regiao de|cidade de|cidades de|municipio de|na|no)\\s+([a-z][a-z0-9 ,\\-\\/]*?)\\s*,?\\s*' + FIM_LOCAL, 'g'))];
// fica com o último trecho que realmente parece local (evita "empresas de engenharia em geral")
for (const ml of mLocal.reverse()) {
  const trecho = ml[2].trim();
  if (!trecho || /^(geral|todo o brasil|brasil|todo brasil)$/.test(trecho)) continue;
  if ((ml[1] === 'no' || ml[1] === 'na') &&!APELIDOS[trecho] && !ESTADOS.find(([n]) => trecho.startsWith(n)) && !(trecho.length === 2 && ehSigla(trecho, ORIGINAL_CRU))) continue; // "no" / "na" só para estados/apelidos ("no RJ", "na BA")
  trecho.split(/\s*,\s*|\s+e\s+/).forEach((parte, i) => {
    // depois da 1ª cidade, ignora pedaços que são nicho ("em Curitiba, padarias")
    if (i > 0 && procuraNicho(' ' + parte + ' ').length) return;
    addLocal(parte);
  });
  consome(ml[0]);
  break;
}
// sigla solta no texto ("restaurantes sp")
if (!ufs.length && !cidades.length) {
  for (const tok of T.split(' ')) if (tok.length === 2 && ehSigla(tok, ORIGINAL_CRU)) { ufs.push(tok.toUpperCase()); break; }
}
// sem nada no texto: usa o que a IA extraiu
if (!ufs.length && !cidades.length) {
  if (Array.isArray(ia.uf)) ufs = ia.uf.map((u) => String(u).toUpperCase()).filter((u) => SIGLAS.includes(u));
  if (Array.isArray(ia.municipio)) cidades = ia.municipio.map(norm).filter(Boolean);
}
ufs = [...new Set(ufs)];
cidades = [...new Set(cidades)];
if (ufs.length) body.uf = ufs;
if (cidades.length) body.municipio = cidades;
if (bairros.length) body.bairro = bairros;

// ---------- 5) NICHO SEM CNAE -> busca por nome ----------
if (cnaes.length) {
  body.codigo_atividade_principal = cnaes;
} else {
  const PARADAS = /\b(quero|queria|preciso|precisava|gostaria|liste|listar|lista|busque|buscar|busca|procure|procurar|encontre|encontrar|me|manda|mande|passa|passe|traga|trazer|ver|de|da|do|das|dos|em|na|no|nas|nos|e|ou|a|o|as|os|um|uma|uns|umas|para|pra|por|favor|empresas?|leads?|cnpjs?|contatos?|negocios?|lojas?|comercios?|segmento|setor|ramo|nicho|area|tipo|ativas?|ativos?|cidade|regiao|estado|todas?|todos?|algumas?|alguns?|mais|com|que|sejam?|tenham?|tem|so|somente|apenas|novas?|grandes?|pequenas?)\b/g;
  const sobra = T.replace(/\d+/g, ' ').replace(PARADAS, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  let termo = sobra.split(' ').filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0] || '';
  if (!termo) {
    const t = ia.busca_textual?.[0]?.texto?.[0];
    termo = norm(t).split(' ').filter((w) => w.length >= 3 && !PARADAS.test(w)).sort((a, b) => b.length - a.length)[0] || '';
  }
  // singular simples: "vinhos" -> "vinho", "pizzarias" -> "pizzaria", "cafes" -> "cafe"
  termo = termo.replace(/(oes|aes)$/, 'ao').replace(/(?<=[aeiou])s$/, '');
  if (termo) body.busca_textual = [{ texto: [termo.toUpperCase()], tipo_busca: 'exata', razao_social: true, nome_fantasia: true, nome_socio: false }];
}

// "mais" / próxima página: usa a página que a IA calculou
const pag = parseInt(ia.pagina, 10);
if (Number.isFinite(pag) && pag > 1) body.pagina = Math.min(pag, 50);

return [{ json: body }];
