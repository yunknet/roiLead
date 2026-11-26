// Cliente da Calculadora de Tributos da Reforma Tributária (CBS/IBS/IS).
// O motor é o projeto aberto da Receita Federal (licença MIT), rodando na VPS.
// O navegador fala só com o próprio domínio do roiLead: o nginx (produção) ou o
// Vite (localhost) repassam /api/calculadora/* para o serviço da calculadora.

export const CALC_BASE = '/api/calculadora';
export const CALC_DOCS = '/api/api-docs';

export class CalcError extends Error {
  status: number;
  titulo?: string;
  corpo?: unknown;
  constructor(message: string, status: number, titulo?: string, corpo?: unknown) {
    super(message);
    this.status = status;
    this.titulo = titulo;
    this.corpo = corpo;
  }
}

const tirarHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export interface ChamadaOpcoes {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  contentType?: string;
  signal?: AbortSignal;
}

export interface RespostaBruta {
  status: number;
  contentType: string;
  dados: unknown;
  texto: string;
  ms: number;
}

const montarUrl = (caminho: string, query?: ChamadaOpcoes['query']) => {
  const url = caminho.startsWith('/api/') ? caminho : CALC_BASE + caminho;
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') params.append(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

/** Chamada crua: devolve status/conteúdo mesmo em erro (usada pelo explorador). */
export async function chamarBruto(caminho: string, op: ChamadaOpcoes = {}): Promise<RespostaBruta> {
  const inicio = performance.now();
  const headers: Record<string, string> = { Accept: 'application/json, application/xml, text/plain, */*' };
  let body: BodyInit | undefined;
  if (op.body !== undefined) {
    const ct = op.contentType || 'application/json';
    headers['Content-Type'] = ct;
    body = typeof op.body === 'string' ? op.body : JSON.stringify(op.body);
  }
  let resp: Response;
  try {
    resp = await fetch(montarUrl(caminho, op.query), { method: op.method || (body ? 'POST' : 'GET'), headers, body, signal: op.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new CalcError('Não foi possível falar com a calculadora. Verifique sua internet e tente de novo.', 0);
  }
  const texto = await resp.text();
  const contentType = resp.headers.get('content-type') || '';
  let dados: unknown = texto;
  if (contentType.includes('json') && texto) {
    try { dados = JSON.parse(texto); } catch { /* mantém texto */ }
  }
  return { status: resp.status, contentType, dados, texto, ms: Math.round(performance.now() - inicio) };
}

export const mensagemDeErro = (r: RespostaBruta): { titulo: string; detalhe: string } => {
  if (r.status === 429) return { titulo: 'Muitas consultas seguidas', detalhe: 'Aguarde alguns segundos e tente novamente.' };
  if (r.status === 502 || r.status === 503 || r.status === 504) {
    return { titulo: 'Calculadora indisponível no momento', detalhe: 'O serviço pode estar sendo atualizado. Tente novamente em instantes.' };
  }
  const d: any = r.dados;
  if (d && typeof d === 'object') {
    const titulo = d.title ? tirarHtml(String(d.title)) : `Erro ${r.status}`;
    let detalhe = d.detail ? tirarHtml(String(d.detail)) : '';
    if (Array.isArray(d.errors) && d.errors.length) {
      detalhe = [detalhe, ...d.errors.map((e: any) => tirarHtml(`${e.pointer || e.field || ''} ${e.detail || e.message || ''}`))].filter(Boolean).join(' • ');
    }
    return { titulo, detalhe: detalhe || 'Verifique os dados informados.' };
  }
  return { titulo: `Erro ${r.status}`, detalhe: typeof d === 'string' && d.length < 300 ? tirarHtml(d) : 'Verifique os dados informados.' };
};

/** Chamada que lança CalcError em respostas fora de 2xx. */
export async function chamar<T = any>(caminho: string, op: ChamadaOpcoes = {}): Promise<T> {
  const r = await chamarBruto(caminho, op);
  if (r.status < 200 || r.status >= 300) {
    const { titulo, detalhe } = mensagemDeErro(r);
    throw new CalcError(detalhe, r.status, titulo, r.dados);
  }
  return r.dados as T;
}

export const hojeIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const formatarReais = (v: string | number | undefined | null) => {
  const n = Number(v ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatarPercentual = (v: string | number | undefined | null) =>
  v === undefined || v === null || v === '' ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

// ---------- Tipos usados pela calculadora guiada ----------
export interface Uf { codigo: number; nome: string; sigla: string }
export interface Municipio { codigo: number; nome: string }
export interface Classificacao { codigo: string; descricao: string }
export interface SituacaoComClassificacoes { id: number; codigo: string; descricao: string; classificacoesTributarias: Classificacao[] }
export interface NcmVigente { ncm: string; descricao: string }
export interface NbsItem { codigo: string; descricao: string }
export interface TipoDfe { nome: string; mnemonico: string; versaoNotaTecnica?: string }
export interface Versao { ambiente?: string; versaoApp?: string; versaoDb?: string; dataVersaoDb?: string; descricaoVersaoApp?: string; descricaoVersaoDb?: string }

// ---------- OpenAPI: geração automática de exemplos ----------
export type OpenApi = { paths: Record<string, Record<string, any>>; components?: { schemas?: Record<string, any> }; tags?: { name: string; description?: string }[] };

export const resolverRef = (spec: OpenApi, s: any): any => {
  let atual = s;
  let guarda = 0;
  while (atual && atual.$ref && guarda++ < 20) {
    const nome = String(atual.$ref).split('/').pop()!;
    atual = spec.components?.schemas?.[nome];
  }
  return atual;
};

/** Monta um corpo de exemplo a partir do schema (usa os exemplos da própria documentação da Receita). */
export function exemploDoSchema(spec: OpenApi, schema: any, profundidade = 0, vistos = new Set<string>()): any {
  if (!schema || profundidade > 7) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.$ref) {
    const nome = String(schema.$ref).split('/').pop()!;
    if (vistos.has(nome)) return undefined;
    const novo = new Set(vistos); novo.add(nome);
    return exemploDoSchema(spec, resolverRef(spec, schema), profundidade + 1, novo);
  }
  const alternativa = schema.allOf?.[0] || schema.oneOf?.[0] || schema.anyOf?.[0];
  if (alternativa) return exemploDoSchema(spec, alternativa, profundidade + 1, vistos);
  const tipo = Array.isArray(schema.type) ? schema.type.find((t: string) => t !== 'null') : schema.type;
  if (schema.enum?.length) return schema.enum[0];
  if (tipo === 'array') {
    const item = exemploDoSchema(spec, schema.items, profundidade + 1, vistos);
    return item === undefined ? [] : [item];
  }
  if (tipo === 'object' || schema.properties) {
    const obrigatorios = new Set<string>(schema.required || []);
    const obj: Record<string, any> = {};
    Object.entries(schema.properties || {}).forEach(([k, v]: [string, any]) => {
      const alvo = v.$ref ? resolverRef(spec, v) : v;
      const temExemplo = v.example !== undefined || alvo?.example !== undefined;
      const ehGrupo = !!(v.$ref || alvo?.properties || alvo?.type === 'array');
      if (!obrigatorios.has(k) && !temExemplo && !ehGrupo) return;
      // Grupos opcionais sem nenhum exemplo na documentação (ex.: compra governamental) ficam de fora.
      if (!obrigatorios.has(k) && ehGrupo && !temExemploDentro(spec, v)) return;
      // Campo que a Receita marcou como "será removido": só entra quando é obrigatório.
      if (k === 'dataHoraEmissao' && !obrigatorios.has(k)) return;
      const val = exemploDoSchema(spec, v, profundidade + 1, vistos);
      if (val !== undefined && !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0 && !obrigatorios.has(k))) obj[k] = val;
    });
    return obj;
  }
  if (tipo === 'string') return schema.format === 'date' ? hojeIso() : schema.format === 'date-time' ? new Date().toISOString() : '';
  if (tipo === 'integer' || tipo === 'number') {
    // Códigos documentados como "1 = União, 2 = Estado…": usa o primeiro código válido.
    const codigo = String(schema.description || '').match(/(?:^|[>\s])(\d+)\s*=/);
    return codigo ? Number(codigo[1]) : 0;
  }
  if (tipo === 'boolean') return false;
  return undefined;
}

function temExemploDentro(spec: OpenApi, schema: any, profundidade = 0, vistos = new Set<string>()): boolean {
  if (!schema || profundidade > 7) return false;
  if (schema.example !== undefined) return true;
  if (schema.$ref) {
    const nome = String(schema.$ref).split('/').pop()!;
    if (vistos.has(nome)) return false;
    const novo = new Set(vistos); novo.add(nome);
    return temExemploDentro(spec, resolverRef(spec, schema), profundidade + 1, novo);
  }
  if (schema.items) return temExemploDentro(spec, schema.items, profundidade + 1, vistos);
  return Object.values(schema.properties || {}).some((p) => temExemploDentro(spec, p, profundidade + 1, vistos));
}

export const limparDescricao = (s?: string) => (s ? tirarHtml(s) : '');
