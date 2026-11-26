import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Copy, Download, Loader2, Play, Search, Table2, Braces } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALC_DOCS, chamarBruto, exemploDoSchema, hojeIso, limparDescricao, mensagemDeErro, OpenApi, resolverRef, RespostaBruta } from '@/lib/calculadoraRtc';

interface Operacao {
  id: string;
  metodo: 'GET' | 'POST';
  caminho: string;
  grupo: string;
  titulo: string;
  descricao: string;
  parametros: any[];
  corpo?: { contentType: string; schema: any };
  obsoleta: boolean;
}

// Orientações onde o exemplo da documentação oficial não basta para executar.
const DICAS: Record<string, string> = {
  'POST /calculadora/xml/generate': 'Cole aqui o resultado de um cálculo do regime geral (aba "Calcular tributos" → JSON completo, sem o modo de erros por item). Na aba de cálculo há um botão que já faz isso automaticamente.',
  'POST /calculadora/xml/validate': 'Cole o XML do grupo de tributação (subtipo "grupo") ou da nota completa (subtipo "nota").',
  'GET /calculadora/observabilidade/erros': 'Informe o código de erro devolvido pelo cálculo, por exemplo REG-011.',
  'GET /calculadora/nfse/indicador-operacao': 'Informe um código NBS existente (consulte a "Lista de Nomenclatura Brasileira de Serviços").',
};

const nomeGrupo = (t?: string) => (t || 'Outros').replace(/\s*-\s*VERS[ÃA]O BETA/i, '').replace(/^Observabilidade - Calculadora$/, 'Observabilidade').trim();

const ORDEM_GRUPOS = ['Calculadora', 'Observabilidade', 'Base de Cálculo', 'NFS-e', 'Pedágio', 'Dados Abertos'];

function lerOperacoes(spec: OpenApi): Operacao[] {
  const ops: Operacao[] = [];
  Object.entries(spec.paths || {}).forEach(([caminho, metodos]) => {
    if (!caminho.startsWith('/calculadora/')) return; // só o que o roiLead expõe
    Object.entries(metodos).forEach(([m, o]: [string, any]) => {
      const metodo = m.toUpperCase();
      if (metodo !== 'GET' && metodo !== 'POST') return;
      let corpo: Operacao['corpo'];
      if (o.requestBody?.content) {
        const [contentType, c] = Object.entries<any>(o.requestBody.content)[0];
        corpo = { contentType, schema: c.schema };
      }
      ops.push({
        id: `${metodo} ${caminho}`,
        metodo: metodo as 'GET' | 'POST',
        caminho,
        grupo: nomeGrupo(o.tags?.[0]),
        titulo: limparDescricao(o.summary) || caminho,
        descricao: limparDescricao(o.description),
        parametros: (o.parameters || []).filter((p: any) => p.in === 'query' || p.in === 'path'),
        corpo,
        obsoleta: !!o.deprecated || /DEPRECATED/i.test(o.summary || ''),
      });
    });
  });
  const ordem = (g: string) => { const i = ORDEM_GRUPOS.indexOf(g); return i === -1 ? 99 : i; };
  return ops.sort((a, b) => ordem(a.grupo) - ordem(b.grupo) || a.grupo.localeCompare(b.grupo) || Number(a.obsoleta) - Number(b.obsoleta) || a.titulo.localeCompare(b.titulo));
}

const valorInicial = (p: any) => {
  const s = p.schema || {};
  if (s.example !== undefined) return String(s.example);
  if (p.example !== undefined) return String(p.example);
  if (/^data|dataOcorrencia/i.test(p.name) || s.format === 'date') return hojeIso();
  if (s.enum?.length && p.required) return String(s.enum[0]);
  return '';
};

// Exemplo testado para o cálculo (o exemplo gerado da documentação mistura campos que se contradizem).
const OPERACAO_EXEMPLO = {
  id: 'exemplo-roilead', versao: '1.0.0', dhFatoGerador: '2027-03-10T10:00:00-03:00', municipio: 4314902, uf: 'RS',
  itens: [
    {
      numero: 1, ncm: '22030000', cst: '000', cClassTrib: '000001', quantidade: 12, unidade: 'LT',
      impostoSeletivo: { cst: '000', cClassTrib: '000001', baseCalculo: 150.0, quantidade: 12, unidade: 'LT', impostoInformado: 15.0 },
      aliquotasNominais: { cbs: 8.8, ibsEstadual: 0.05, ibsMunicipal: 0.05, impostoSeletivo: { adValorem: 10.0 } },
    },
    { numero: 2, nbs: '122011200', cst: '200', cClassTrib: '200028', baseCalculo: 1200.0, aliquotasNominais: { cbs: 8.8, ibsEstadual: 0.05, ibsMunicipal: 0.05 } },
  ],
};
const EXEMPLOS_FIXOS: Record<string, unknown> = {
  'POST /calculadora/regime-geral': OPERACAO_EXEMPLO,
  'POST /calculadora/observabilidade/regime-geral': OPERACAO_EXEMPLO,
};

const corpoInicial = (spec: OpenApi, op: Operacao) => {
  if (!op.corpo) return '';
  if (!op.corpo.contentType.includes('json')) return '';
  if (EXEMPLOS_FIXOS[op.id]) return JSON.stringify(EXEMPLOS_FIXOS[op.id], null, 2);
  const ex = exemploDoSchema(spec, op.corpo.schema);
  // Datas de emissão do exemplo oficial caem em períodos sem alíquota publicada: usa hoje.
  if (ex && typeof ex === 'object' && 'dataHoraEmissao' in ex) (ex as Record<string, unknown>).dataHoraEmissao = `${hojeIso()}T10:00:00-03:00`;
  return ex === undefined ? '{}' : JSON.stringify(ex, null, 2);
};

export function ExploradorApi({ operacaoInicial }: { operacaoInicial?: string }) {
  const spec = useQuery<OpenApi>({
    queryKey: ['calc', 'openapi'],
    queryFn: async () => {
      const r = await chamarBruto(CALC_DOCS);
      if (r.status !== 200 || typeof r.dados !== 'object') throw new Error(mensagemDeErro(r).detalhe);
      return r.dados as OpenApi;
    },
    staleTime: 1000 * 60 * 30, retry: 1,
  });
  const operacoes = useMemo(() => (spec.data ? lerOperacoes(spec.data) : []), [spec.data]);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState<string | undefined>(operacaoInicial);

  useEffect(() => {
    if (!selecionada && operacoes.length) setSelecionada(operacoes.find((o) => o.grupo === 'Dados Abertos' && /NCM/.test(o.titulo))?.id || operacoes[0].id);
  }, [operacoes, selecionada]);

  const grupos = useMemo(() => {
    const t = filtro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const mapa = new Map<string, Operacao[]>();
    operacoes.forEach((o) => {
      const alvo = `${o.titulo} ${o.caminho} ${o.grupo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (t && !alvo.includes(t)) return;
      mapa.set(o.grupo, [...(mapa.get(o.grupo) || []), o]);
    });
    return [...mapa.entries()];
  }, [operacoes, filtro]);

  const op = operacoes.find((o) => o.id === selecionada);

  if (spec.isLoading) return <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="w-4 h-4 animate-spin" />Carregando as funções da calculadora…</div>;
  if (spec.isError) return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5" />A calculadora não respondeu. Ela pode estar sendo atualizada; tente novamente em instantes.
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="bg-card border border-border rounded-xl p-3 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto custom-scrollbar">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={`Buscar entre ${operacoes.length} funções`} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        {grupos.map(([grupo, lista]) => (
          <div key={grupo} className="mb-3">
            <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{grupo}</p>
            <ul className="space-y-0.5">
              {lista.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => setSelecionada(o.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${o.id === selecionada ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-accent text-foreground'}`}>
                    <span className={`text-[10px] font-bold w-9 flex-shrink-0 ${o.id === selecionada ? '' : o.metodo === 'GET' ? 'text-sky-600 dark:text-sky-400' : 'text-primary'}`}>{o.metodo === 'GET' ? 'CONS' : 'CALC'}</span>
                    <span className={`flex-1 leading-snug ${o.obsoleta ? 'opacity-60' : ''}`}>{o.titulo}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {grupos.length === 0 && <p className="text-sm text-muted-foreground px-2">Nenhuma função encontrada.</p>}
      </aside>
      {op && spec.data ? <PainelOperacao key={op.id} op={op} spec={spec.data} /> : <div />}
    </div>
  );
}

function PainelOperacao({ op, spec }: { op: Operacao; spec: OpenApi }) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(op.parametros.map((p) => [p.name, valorInicial(p)])));
  const [corpo, setCorpo] = useState(() => corpoInicial(spec, op));
  const [executando, setExecutando] = useState(false);
  const [resposta, setResposta] = useState<RespostaBruta | null>(null);

  const executar = async () => {
    for (const p of op.parametros) if (p.required && !String(valores[p.name] ?? '').trim()) { toast.error(`Preencha o campo "${p.name}".`); return; }
    let caminho = op.caminho;
    const query: Record<string, string> = {};
    op.parametros.forEach((p) => {
      const v = String(valores[p.name] ?? '').trim();
      if (p.in === 'path') caminho = caminho.replace(`{${p.name}}`, encodeURIComponent(v));
      else if (v) query[p.name] = v;
    });
    let body: unknown;
    if (op.corpo) {
      if (op.corpo.contentType.includes('json')) {
        try { body = JSON.parse(corpo || '{}'); } catch { toast.error('O corpo não é um JSON válido.'); return; }
      } else {
        if (!corpo.trim()) { toast.error('Cole o conteúdo (XML) no campo do corpo.'); return; }
        body = corpo;
      }
    }
    setExecutando(true); setResposta(null);
    try {
      setResposta(await chamarBruto('/api' + caminho, { method: op.metodo, query, body, contentType: op.corpo?.contentType }));
    } catch (e: any) {
      toast.error(e?.message || 'Falha na comunicação.');
    } finally { setExecutando(false); }
  };

  const esquemaCorpo = op.corpo ? resolverRef(spec, op.corpo.schema) : null;

  return (
    <section className="space-y-4 min-w-0">
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">{op.grupo}</span>
          {op.obsoleta && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">Obsoleta — prefira a versão nova</span>}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{op.titulo}</h3>
        {op.descricao && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{op.descricao}</p>}
        <p className="text-xs text-muted-foreground mt-2 font-mono break-all">{op.metodo} /api{op.caminho}</p>
        {DICAS[op.id] && <p className="mt-3 text-sm rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-foreground">{DICAS[op.id]}</p>}

        {op.parametros.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mt-5">
            {op.parametros.map((p) => {
              const s = p.schema || {};
              const desc = limparDescricao(p.description);
              return (
                <div key={p.name} className="space-y-1.5">
                  <Label>{p.name}{p.required && <span className="text-destructive"> *</span>}</Label>
                  {s.enum ? (
                    <Select value={valores[p.name] || '_'} onValueChange={(v) => setValores((x) => ({ ...x, [p.name]: v === '_' ? '' : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{!p.required && <SelectItem value="_">—</SelectItem>}{s.enum.map((e: string) => <SelectItem key={e} value={String(e)}>{String(e)}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input type={/^data|dataOcorrencia/i.test(p.name) || s.format === 'date' ? 'date' : 'text'} inputMode={s.type === 'integer' || s.type === 'number' ? 'numeric' : undefined}
                      value={valores[p.name] ?? ''} onChange={(e) => setValores((x) => ({ ...x, [p.name]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') executar(); }} placeholder={s.example !== undefined ? String(s.example) : ''} />
                  )}
                  {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                </div>
              );
            })}
          </div>
        )}

        {op.corpo && (
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{op.corpo.contentType.includes('json') ? 'Dados de entrada (JSON) — já preenchido com o exemplo oficial' : 'Conteúdo (XML)'}</Label>
              {op.corpo.contentType.includes('json') && <button type="button" className="text-xs text-primary" onClick={() => setCorpo(corpoInicial(spec, op))}>Restaurar exemplo</button>}
            </div>
            <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} spellCheck={false}
              placeholder={op.corpo.contentType.includes('json') ? '{ }' : 'Cole aqui o XML (grupo de tributação ou nota completa)'}
              className="w-full min-h-[260px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring custom-scrollbar" />
            {esquemaCorpo?.description && <p className="text-xs text-muted-foreground">{limparDescricao(esquemaCorpo.description)}</p>}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={executar} disabled={executando} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold min-w-[140px]">
            {executando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}{op.metodo === 'GET' ? 'Consultar' : 'Executar'}
          </Button>
        </div>
      </div>

      {resposta && <VisualizadorResposta resposta={resposta} nome={op.titulo} />}
    </section>
  );
}

const paraCsv = (linhas: any[], colunas: string[]) => {
  const esc = (v: any) => { const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [colunas.join(';'), ...linhas.map((l) => colunas.map((c) => esc(l[c])).join(';'))].join('\n');
};

function baixar(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function VisualizadorResposta({ resposta, nome }: { resposta: RespostaBruta; nome: string }) {
  const ok = resposta.status >= 200 && resposta.status < 300;
  const d: any = resposta.dados;
  const ehTabela = ok && Array.isArray(d) && d.length > 0 && d.every((x) => x && typeof x === 'object' && !Array.isArray(x));
  const [modo, setModo] = useState<'tabela' | 'json'>(ehTabela ? 'tabela' : 'json');
  const [filtro, setFiltro] = useState('');
  const [limite, setLimite] = useState(100);
  const arquivo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

  const colunas = useMemo(() => {
    if (!ehTabela) return [];
    const set = new Set<string>();
    (d as any[]).slice(0, 200).forEach((x) => Object.keys(x).forEach((k) => set.add(k)));
    return [...set];
  }, [d, ehTabela]);

  const linhas = useMemo(() => {
    if (!ehTabela) return [];
    const t = filtro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!t) return d as any[];
    return (d as any[]).filter((x) => JSON.stringify(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t));
  }, [d, filtro, ehTabela]);

  const texto = typeof d === 'string' ? d : JSON.stringify(d, null, 2);
  const erro = !ok ? mensagemDeErro(resposta) : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>{ok ? 'Sucesso' : 'Erro'} {resposta.status}</span>
          <span className="text-muted-foreground text-xs">{resposta.ms} ms{Array.isArray(d) ? ` · ${d.length.toLocaleString('pt-BR')} registros` : ''}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ehTabela && (
            <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
              <button type="button" onClick={() => setModo('tabela')} className={`px-2 py-1 rounded-md flex items-center gap-1 ${modo === 'tabela' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Table2 className="w-3.5 h-3.5" />Tabela</button>
              <button type="button" onClick={() => setModo('json')} className={`px-2 py-1 rounded-md flex items-center gap-1 ${modo === 'json' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Braces className="w-3.5 h-3.5" />JSON</button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(texto); toast.success('Copiado.'); }}><Copy className="w-4 h-4 mr-1" />Copiar</Button>
          {ehTabela && <Button size="sm" variant="outline" onClick={() => baixar(paraCsv(linhas, colunas), `${arquivo}.csv`, 'text/csv;charset=utf-8')}><Download className="w-4 h-4 mr-1" />Planilha (CSV)</Button>}
          <Button size="sm" variant="outline" onClick={() => baixar(texto, `${arquivo}.${resposta.contentType.includes('xml') || /^\s*</.test(texto) ? 'xml' : 'json'}`, resposta.contentType || 'application/json')}><Download className="w-4 h-4 mr-1" />Baixar</Button>
        </div>
      </div>

      {erro && <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm"><p className="font-semibold text-foreground">{erro.titulo}</p><p className="text-muted-foreground">{erro.detalhe}</p></div>}

      {ok && typeof d === 'boolean' && (
        <p className={`text-base font-semibold ${d ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{d ? 'Válido ✔' : 'Inválido ✘'}</p>
      )}

      {modo === 'tabela' && ehTabela ? (
        <>
          <Input className="mb-3" placeholder="Filtrar resultados" value={filtro} onChange={(e) => { setFiltro(e.target.value); setLimite(100); }} />
          <div className="overflow-auto max-h-[60vh] rounded-lg border border-border custom-scrollbar">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted"><tr>{colunas.map((c) => <th key={c} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{c}</th>)}</tr></thead>
              <tbody>
                {linhas.slice(0, limite).map((l, i) => (
                  <tr key={i} className="border-t border-border/60 align-top">
                    {colunas.map((c) => <td key={c} className="px-3 py-1.5">{l[c] === null || l[c] === undefined ? '' : typeof l[c] === 'object' ? <code className="text-[11px] break-all">{JSON.stringify(l[c]).slice(0, 300)}</code> : String(l[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {linhas.length > limite && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Mostrando {limite.toLocaleString('pt-BR')} de {linhas.length.toLocaleString('pt-BR')}. A planilha (CSV) leva todos.</span>
              <Button size="sm" variant="ghost" onClick={() => setLimite((x) => x + 200)}>Mostrar mais</Button>
            </div>
          )}
        </>
      ) : typeof d !== 'boolean' && (
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 text-xs custom-scrollbar whitespace-pre-wrap break-all">{texto || '(resposta vazia)'}</pre>
      )}
    </div>
  );
}
