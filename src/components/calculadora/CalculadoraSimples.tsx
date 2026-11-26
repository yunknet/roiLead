import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calculator, ChevronDown, ChevronUp, Download, Info, Loader2, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BuscaLista, OpcaoBusca } from './BuscaLista';
import { CALC_SN_API, chamar, chamarBruto, formatarPercentual, formatarReais, hojeIso, mensagemDeErro, NbsItem, NcmVigente, SituacaoComClassificacoes } from '@/lib/calculadoraRtc';

// ---------- Tipos do motor do Simples Nacional ----------
interface AtividadeSN {
  codigo: string; descricao: string; anexoSemFatorR: string | null; anexoComFatorR: string | null;
  sujeitaFatorR: boolean; rotuloAnexo: string; disponivel: boolean; tpDocsAdmissiveis: string[];
}
type Anexo = 'I' | 'II' | 'III' | 'IV' | 'V';
const ANEXOS_COM_ISS: Anexo[] = ['III', 'IV', 'V'];
interface AliquotasAnexo { cbs: string; ibs: string; semCbs: string; semIbs: string }
const aliquotaVazia = (): AliquotasAnexo => ({ cbs: '', ibs: '', semCbs: '', semIbs: '' });

type TipoCodigo = 'ncm' | 'nbs' | 'nenhum';
interface ItemSN {
  id: string; cAtivSN: string; tipo: TipoCodigo; codigo: string; cst: string; cClassTrib: string;
  base: string; valorIS: string; tribISSQN: string; tpRetISSQN: string; tpBM: string;
}
const novoItem = (tipo: TipoCodigo = 'ncm'): ItemSN => ({
  id: Math.random().toString(36).slice(2), cAtivSN: '', tipo, codigo: '', cst: '', cClassTrib: '', base: '', valorIS: '', tribISSQN: '1', tpRetISSQN: '1', tpBM: '',
});

const DOCUMENTOS = [
  { codigo: '55', nome: 'NF-e — nota fiscal de produtos' },
  { codigo: '65', nome: 'NFC-e — nota ao consumidor' },
  { codigo: '91', nome: 'NFS-e — nota fiscal de serviços' },
  { codigo: '57', nome: 'CT-e — transporte de cargas' },
  { codigo: '67', nome: 'CT-e OS — outros serviços de transporte' },
  { codigo: '63', nome: 'BP-e — bilhete de passagem' },
  { codigo: '62', nome: 'NFCom — serviços de comunicação' },
  { codigo: '93', nome: 'Documento modelo 93' },
];

const INICIO_SIMPLES = '2027-01-01';
const num = (s: string) => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const moeda = (s: string) => { const n = num(s); return n === undefined ? undefined : n.toFixed(2); };
const percentual = (s: string) => { const n = num(s); return n === undefined ? undefined : String(n); };

const sn = <T,>(caminho: string, query?: Record<string, any>) => chamar<T>(CALC_SN_API + caminho, { query });
const cartao = 'bg-card border border-border rounded-xl p-4 sm:p-6';
const campo = 'space-y-1.5';

function baixar(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Anexo efetivamente usado por uma atividade, considerando o fator R. */
const anexoDaAtividade = (a: AtividadeSN | undefined, fatorR: boolean): Anexo | null => {
  if (!a) return null;
  if (a.sujeitaFatorR) return ((fatorR ? a.anexoComFatorR : a.anexoSemFatorR) || null) as Anexo | null;
  return (a.anexoSemFatorR || null) as Anexo | null;
};

export function CalculadoraSimples() {
  const [data, setData] = useState(() => (hojeIso() < INICIO_SIMPLES ? INICIO_SIMPLES : hojeIso()));
  const [tpDoc, setTpDoc] = useState('55');
  const [crt, setCrt] = useState('1');
  const [recolheFora, setRecolheFora] = useState(false);
  const [opSimpNac, setOpSimpNac] = useState('3');
  const [regApIBSCBSSN, setRegApIBSCBSSN] = useState('1');
  const [regApTribSN, setRegApTribSN] = useState('1');
  const [fatorR, setFatorR] = useState(false);
  const [impedimento, setImpedimento] = useState(false);
  const [aliquotas, setAliquotas] = useState<Record<Anexo, AliquotasAnexo>>({ I: aliquotaVazia(), II: aliquotaVazia(), III: aliquotaVazia(), IV: aliquotaVazia(), V: aliquotaVazia() });
  const [itens, setItens] = useState<ItemSN[]>([novoItem()]);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erroGeral, setErroGeral] = useState<{ titulo: string; detalhe: string } | null>(null);

  const nfse = tpDoc === '91';
  const somenteReceita = nfse ? regApIBSCBSSN === '3' : recolheFora;
  const antesDoSimples = data < INICIO_SIMPLES;

  const atividades = useQuery<AtividadeSN[]>({
    queryKey: ['calc-sn', 'atividades', data], queryFn: () => sn('/calculadora/simples-nacional/atividades', { data }),
    enabled: !!data, staleTime: 1000 * 60 * 60 * 6, retry: 1,
  });
  // Tabelas oficiais (CST, NCM, NBS) vêm do motor do regime regular, que usa a mesma base.
  const csts = useQuery<SituacaoComClassificacoes[]>({
    queryKey: ['calc', 'cst-cbs-ibs', data], queryFn: () => chamar('/dados-abertos/situacoes-tributarias/cbs-ibs', { query: { data } }),
    enabled: !!data, staleTime: 1000 * 60 * 60 * 6, retry: 1,
  });
  const usaNcm = itens.some((i) => i.tipo === 'ncm');
  const usaNbs = itens.some((i) => i.tipo === 'nbs');
  const ncms = useQuery<NcmVigente[]>({ queryKey: ['calc', 'ncm-vigentes', data], queryFn: () => chamar('/dados-abertos/ncm/vigentes', { query: { data } }), enabled: !!data && usaNcm, staleTime: 1000 * 60 * 60 * 6, retry: 1 });
  const nbss = useQuery<NbsItem[]>({ queryKey: ['calc', 'nbs-lista', data], queryFn: () => chamar('/dados-abertos/nbs/lista', { query: { data } }), enabled: !!data && usaNbs, staleTime: 1000 * 60 * 60 * 6, retry: 1 });

  const atividadesDoc = useMemo(() => (atividades.data || []).filter((a) => a.disponivel !== false && a.tpDocsAdmissiveis.includes(tpDoc)), [atividades.data, tpDoc]);
  const opcoesNcm: OpcaoBusca[] = useMemo(() => (ncms.data || []).map((n) => ({ valor: n.ncm, rotulo: `${n.ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')} — ${n.descricao.replace(/^[-\s]+/, '')}` })), [ncms.data]);
  const opcoesNbs: OpcaoBusca[] = useMemo(() => (nbss.data || []).map((n) => ({ valor: n.codigo, rotulo: `${n.codigo} — ${n.descricao}` })), [nbss.data]);

  const atividadePorCodigo = (c: string) => (atividades.data || []).find((a) => a.codigo === c);
  const precisaFatorR = itens.some((i) => atividadePorCodigo(i.cAtivSN)?.sujeitaFatorR);
  const anexosUsados = useMemo(() => {
    const set = new Set<Anexo>();
    itens.forEach((i) => { const a = anexoDaAtividade(atividadePorCodigo(i.cAtivSN), fatorR); if (a) set.add(a); });
    return (['I', 'II', 'III', 'IV', 'V'] as Anexo[]).filter((a) => set.has(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, fatorR, atividades.data]);

  const trocarDocumento = (codigo: string) => {
    setTpDoc(codigo);
    const tipo: TipoCodigo = codigo === '91' ? 'nbs' : codigo === '55' || codigo === '65' ? 'ncm' : 'nenhum';
    setItens([novoItem(tipo)]);
    setResultado(null); setErroGeral(null);
  };
  const atualizar = (id: string, c: Partial<ItemSN>) => setItens((l) => l.map((i) => (i.id === id ? { ...i, ...c } : i)));
  const mudarAliquota = (anexo: Anexo, c: Partial<AliquotasAnexo>) => setAliquotas((a) => ({ ...a, [anexo]: { ...a[anexo], ...c } }));

  const validar = (): string | null => {
    if (!data) return 'Informe a data da operação.';
    if (antesDoSimples) return 'A CBS e o IBS no Simples Nacional começam em 2027. Escolha uma data a partir de 01/01/2027.';
    for (const [idx, i] of itens.entries()) {
      const n = `Item ${idx + 1}`;
      if (!somenteReceita && !i.cAtivSN) return `${n}: escolha a atividade do Simples Nacional.`;
      if (!i.cClassTrib) return `${n}: escolha a classificação tributária (cClassTrib).`;
      if (i.tipo !== 'nenhum' && !i.codigo) return `${n}: informe o ${i.tipo === 'ncm' ? 'NCM' : 'NBS'} ou escolha "sem código".`;
      if (moeda(i.base) === undefined) return `${n}: informe o valor (base de cálculo).`;
    }
    if (!somenteReceita) {
      for (const a of anexosUsados) {
        if (percentual(aliquotas[a].cbs) === undefined) return `Informe a alíquota efetiva da CBS do Anexo ${a}.`;
        if (!impedimento && percentual(aliquotas[a].ibs) === undefined) return `Informe a alíquota efetiva do IBS do Anexo ${a}.`;
      }
    }
    return null;
  };

  const montarPayload = () => {
    const p: any = { id: `roilead-sn-${Date.now()}`, versao: '3.0.0', data, tpDoc };
    if (nfse) { p.opSimpNac = opSimpNac; if (opSimpNac === '3' || opSimpNac === '4') { p.regApIBSCBSSN = regApIBSCBSSN; p.regApTribSN = regApTribSN; } }
    else { p.CRT = crt; if (recolheFora) p.tpRegimeIBSCBS = '1'; }
    if (!somenteReceita) {
      const ae: any = { impedimentoSublimite: impedimento };
      if (precisaFatorR) ae.fatorR = fatorR;
      anexosUsados.forEach((a) => {
        const v = aliquotas[a];
        const par: any = { pCBSSN: percentual(v.cbs), pIBSSN: impedimento ? null : percentual(v.ibs) };
        if (ANEXOS_COM_ISS.includes(a) && percentual(v.semCbs) !== undefined) {
          par.semRedistribuicaoISS = { pCBSSN: percentual(v.semCbs), pIBSSN: impedimento ? null : percentual(v.semIbs) ?? null };
        }
        ae[`anexo${a}`] = par;
      });
      p.aliquotasEfetivas = ae;
    }
    p.itens = itens.map((i, idx) => {
      const it: any = { numero: idx + 1, cClassTrib: i.cClassTrib, baseCalculo: moeda(i.base) };
      if (i.cAtivSN) it.cAtivSN = i.cAtivSN;
      if (i.tipo === 'ncm' && i.codigo) it.ncm = i.codigo;
      if (i.tipo === 'nbs' && i.codigo) it.nbs = i.codigo;
      if (nfse) {
        it.tribISSQN = i.tribISSQN;
        if (i.tribISSQN === '1') it.tpRetISSQN = i.tpRetISSQN;
        if (i.tpBM) it.tpBM = i.tpBM;
      } else {
        it.valorImpostoSeletivo = moeda(i.valorIS) ?? '0.00';
      }
      return it;
    });
    return p;
  };

  const calcular = async () => {
    const problema = validar();
    if (problema) { toast.error(problema); return; }
    setCalculando(true); setResultado(null); setErroGeral(null);
    try {
      const r = await chamarBruto(CALC_SN_API + '/calculadora/observabilidade/simples-nacional/nao-assistido', { method: 'POST', body: montarPayload() });
      if (r.status >= 200 && r.status < 300) setResultado(r.dados);
      else setErroGeral(mensagemDeErro(r));
    } catch (e: any) {
      setErroGeral({ titulo: 'Falha na comunicação', detalhe: e?.message || 'Tente novamente.' });
    } finally { setCalculando(false); }
  };

  const limpar = () => { setItens([novoItem(nfse ? 'nbs' : 'ncm')]); setResultado(null); setErroGeral(null); };

  return (
    <div className="space-y-6">
      <div className={cartao}>
        <h3 className="font-semibold text-foreground mb-4">1. Dados da operação</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={campo}>
            <Label>Data do fato gerador</Label>
            <Input type="date" value={data} min={INICIO_SIMPLES} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className={`${campo} lg:col-span-2`}>
            <Label>Documento fiscal</Label>
            <Select value={tpDoc} onValueChange={trocarDocumento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENTOS.map((d) => <SelectItem key={d.codigo} value={d.codigo}>{d.nome} ({d.codigo})</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {!nfse ? (
            <>
              <div className={`${campo} lg:col-span-2`}>
                <Label>Situação da empresa no Simples (CRT)</Label>
                <Select value={crt} onValueChange={setCrt}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Simples Nacional</SelectItem>
                    <SelectItem value="2">2 — Simples Nacional com excesso de sublimite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer self-end pb-2">
                <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={recolheFora} onChange={(e) => setRecolheFora(e.target.checked)} />
                <span>Optou por pagar IBS e CBS <b>por fora</b> do Simples (regime regular)</span>
              </label>
            </>
          ) : (
            <>
              <div className={campo}>
                <Label>Situação no Simples</Label>
                <Select value={opSimpNac} onValueChange={setOpSimpNac}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">ME/EPP optante do Simples</SelectItem>
                    <SelectItem value="4">Opção pelo Simples pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={campo}>
                <Label>IBS e CBS</Label>
                <Select value={regApIBSCBSSN} onValueChange={setRegApIBSCBSSN}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Os dois pelo Simples</SelectItem>
                    <SelectItem value="2">CBS pelo Simples, IBS pelo regime regular</SelectItem>
                    <SelectItem value="3">Os dois pelo regime regular (por fora)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={campo}>
                <Label>Tributos federais e ISS</Label>
                <Select value={regApTribSN} onValueChange={setRegApTribSN}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Federais e ISS pelo Simples</SelectItem>
                    <SelectItem value="2">Federais pelo Simples, ISS fora</SelectItem>
                    <SelectItem value="3">Federais e ISS fora do Simples</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        {antesDoSimples && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />A CBS e o IBS no Simples Nacional começam em 01/01/2027. Escolha uma data a partir daí.</p>
        )}
        {atividades.isError && <p className="mt-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />A calculadora do Simples não respondeu. Tente novamente em instantes.</p>}
        <p className="mt-4 text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">O MEI não entra neste cálculo: ele paga valores fixos mensais, por regra da Receita.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">2. Itens da operação</h3>
          {!nfse && <Button variant="outline" size="sm" onClick={() => setItens((l) => [...l, novoItem(l[0]?.tipo || 'ncm')])}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button>}
        </div>
        {nfse && <p className="text-xs text-muted-foreground -mt-2">A NFS-e tem exatamente um serviço por nota.</p>}
        {itens.map((item, idx) => (
          <ItemSimples key={item.id} indice={idx} item={item} nfse={nfse} somenteReceita={somenteReceita}
            atividades={atividadesDoc} carregandoAtividades={atividades.isLoading}
            csts={csts.data || []} cstsErro={csts.isError} opcoesNcm={opcoesNcm} opcoesNbs={opcoesNbs}
            carregandoCodigos={item.tipo === 'ncm' ? ncms.isLoading : nbss.isLoading}
            podeRemover={itens.length > 1} onRemover={() => setItens((l) => l.filter((i) => i.id !== item.id))}
            onChange={(c) => atualizar(item.id, c)} />
        ))}
      </div>

      {!somenteReceita && (
        <div className={cartao}>
          <h3 className="font-semibold text-foreground mb-1">3. Alíquotas efetivas da sua empresa</h3>
          <p className="text-sm text-muted-foreground mb-4 flex gap-1.5"><Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            No Simples, a CBS e o IBS saem de uma alíquota efetiva que depende do anexo e do faturamento dos últimos 12 meses (RBT12). Você encontra esses percentuais no PGDAS-D ou com o seu contador.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
            {precisaFatorR && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={fatorR} onChange={(e) => setFatorR(e.target.checked)} />
                Fator "r" igual ou acima de 28% (folha ÷ faturamento) — usa o Anexo III em vez do V
              </label>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={impedimento} onChange={(e) => setImpedimento(e.target.checked)} />
              Impedida de recolher IBS e ISS pelo Simples (passou do sublimite)
            </label>
          </div>
          {anexosUsados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Escolha a atividade dos itens para saber quais anexos preencher.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {anexosUsados.map((a) => <CartaoAnexo key={a} anexo={a} valor={aliquotas[a]} impedimento={impedimento} onChange={(c) => mudarAliquota(a, c)} />)}
            </div>
          )}
        </div>
      )}

      <div className={`${cartao} flex flex-col sm:flex-row sm:items-center gap-3 justify-end`}>
        <Button variant="ghost" onClick={limpar} disabled={calculando}><RotateCcw className="w-4 h-4 mr-2" />Limpar</Button>
        <Button onClick={calcular} disabled={calculando} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold min-w-[160px]">
          {calculando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}Calcular tributos
        </Button>
      </div>

      {erroGeral && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold text-foreground">{erroGeral.titulo}</p><p className="text-sm text-muted-foreground mt-1">{erroGeral.detalhe}</p></div>
        </div>
      )}

      {resultado && <ResultadoSimples resultado={resultado} />}
    </div>
  );
}

function CartaoAnexo({ anexo, valor, impedimento, onChange }: { anexo: Anexo; valor: AliquotasAnexo; impedimento: boolean; onChange: (c: Partial<AliquotasAnexo>) => void }) {
  const [avancado, setAvancado] = useState(false);
  const comIss = ANEXOS_COM_ISS.includes(anexo);
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-medium text-foreground mb-3">Anexo {anexo}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className={campo}><Label>CBS efetiva (%)</Label><Input inputMode="decimal" value={valor.cbs} onChange={(e) => onChange({ cbs: e.target.value })} placeholder="Ex.: 1,1612" /></div>
        <div className={campo}><Label>IBS efetivo (%)</Label><Input inputMode="decimal" value={impedimento ? '' : valor.ibs} disabled={impedimento} onChange={(e) => onChange({ ibs: e.target.value })} placeholder={impedimento ? 'Não se aplica' : 'Ex.: 0,0129'} /></div>
      </div>
      {comIss && (
        <div className="mt-3">
          <button type="button" className="text-xs text-primary font-medium flex items-center gap-1" onClick={() => setAvancado((v) => !v)}>
            {avancado ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}Alíquotas sem redistribuição do ISS (opcional)
          </button>
          {avancado && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">Usadas quando o ISS não entra no Simples (ISS retido, isento, imune ou exportação). Se deixar em branco, valem as de cima.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className={campo}><Label>CBS (%)</Label><Input inputMode="decimal" value={valor.semCbs} onChange={(e) => onChange({ semCbs: e.target.value })} /></div>
                <div className={campo}><Label>IBS (%)</Label><Input inputMode="decimal" value={impedimento ? '' : valor.semIbs} disabled={impedimento} onChange={(e) => onChange({ semIbs: e.target.value })} /></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ItemProps {
  indice: number; item: ItemSN; nfse: boolean; somenteReceita: boolean; atividades: AtividadeSN[]; carregandoAtividades: boolean;
  csts: SituacaoComClassificacoes[]; cstsErro: boolean; opcoesNcm: OpcaoBusca[]; opcoesNbs: OpcaoBusca[]; carregandoCodigos: boolean;
  podeRemover: boolean; onRemover: () => void; onChange: (c: Partial<ItemSN>) => void;
}

function ItemSimples({ indice, item, nfse, somenteReceita, atividades, carregandoAtividades, csts, cstsErro, opcoesNcm, opcoesNbs, carregandoCodigos, podeRemover, onRemover, onChange }: ItemProps) {
  const classificacoes = csts.find((c) => c.codigo === item.cst)?.classificacoesTributarias || [];
  const atividade = atividades.find((a) => a.codigo === item.cAtivSN);
  const comIss = ['07', '09', '10', '12', '13', '14'].includes(item.cAtivSN);

  return (
    <div className={cartao}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{indice + 1}</span>
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(['ncm', 'nbs', 'nenhum'] as TipoCodigo[]).map((t) => (
              <button key={t} type="button" onClick={() => onChange({ tipo: t, codigo: '' })}
                className={`px-3 py-1 rounded-md transition-colors ${item.tipo === t ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'ncm' ? 'Produto (NCM)' : t === 'nbs' ? 'Serviço (NBS)' : 'Sem código'}
              </button>
            ))}
          </div>
        </div>
        {podeRemover && <Button variant="ghost" size="sm" onClick={onRemover} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${campo} lg:col-span-2`}>
          <Label>Atividade do Simples Nacional{somenteReceita && <span className="text-muted-foreground font-normal"> — opcional neste regime</span>}</Label>
          <Select value={item.cAtivSN} onValueChange={(v) => onChange({ cAtivSN: v })}>
            <SelectTrigger><SelectValue placeholder={carregandoAtividades ? 'Carregando…' : atividades.length ? 'Escolha a atividade' : 'Nenhuma atividade para este documento nesta data'} /></SelectTrigger>
            <SelectContent className="max-h-80 max-w-[90vw]">
              {atividades.map((a) => <SelectItem key={a.codigo} value={a.codigo}><span className="whitespace-normal">{a.codigo} — {a.descricao} <span className="text-muted-foreground">(Anexo {a.rotuloAnexo})</span></span></SelectItem>)}
            </SelectContent>
          </Select>
          {atividade?.sujeitaFatorR && <p className="text-xs text-muted-foreground">Esta atividade depende do fator "r": marque a opção nas alíquotas efetivas.</p>}
        </div>

        {item.tipo !== 'nenhum' && (
          <div className={`${campo} lg:col-span-2`}>
            <Label>{item.tipo === 'ncm' ? 'Produto — código NCM ou descrição' : 'Serviço — código NBS ou descrição'}</Label>
            <BuscaLista livre opcoes={item.tipo === 'ncm' ? opcoesNcm : opcoesNbs} valor={item.codigo} onChange={(v) => onChange({ codigo: v })} carregando={carregandoCodigos}
              placeholder={item.tipo === 'ncm' ? 'Ex.: 2203.00.00 ou "cerveja"' : 'Ex.: 101011100 ou "consultoria"'} />
          </div>
        )}

        <div className={campo}>
          <Label>Situação tributária (CST)</Label>
          <Select value={item.cst} onValueChange={(v) => onChange({ cst: v, cClassTrib: '' })} disabled={cstsErro}>
            <SelectTrigger><SelectValue placeholder="Escolha o CST" /></SelectTrigger>
            <SelectContent className="max-h-80 max-w-[90vw]">{csts.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} — {c.descricao}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={campo}>
          <Label>Classificação tributária (cClassTrib)</Label>
          {cstsErro ? (
            <Input value={item.cClassTrib} onChange={(e) => onChange({ cClassTrib: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6 dígitos, ex.: 000001" />
          ) : (
            <Select value={item.cClassTrib} onValueChange={(v) => onChange({ cClassTrib: v })} disabled={!item.cst}>
              <SelectTrigger><SelectValue placeholder={item.cst ? 'Escolha a classificação' : 'Escolha o CST antes'} /></SelectTrigger>
              <SelectContent className="max-h-80 max-w-[90vw]">{classificacoes.map((c) => <SelectItem key={c.codigo} value={c.codigo}><span className="whitespace-normal">{c.codigo} — {c.descricao}</span></SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        <div className={campo}>
          <Label>{nfse ? 'Receita bruta do serviço (R$)' : 'Valor / base de cálculo (R$)'}</Label>
          <Input inputMode="decimal" value={item.base} onChange={(e) => onChange({ base: e.target.value })} placeholder="Ex.: 1.500,00" />
          <p className="text-xs text-muted-foreground">{nfse ? 'Valor do serviço menos descontos incondicionais.' : 'Produtos + frete + seguro + outras despesas − descontos (sem o Imposto Seletivo).'}</p>
        </div>

        {!nfse ? (
          <div className={campo}>
            <Label>Imposto Seletivo já calculado (R$)</Label>
            <Input inputMode="decimal" value={item.valorIS} onChange={(e) => onChange({ valorIS: e.target.value })} placeholder="0,00 se não houver" />
          </div>
        ) : comIss && (
          <div className="grid grid-cols-2 gap-3">
            <div className={campo}>
              <Label>Tributação do ISS</Label>
              <Select value={item.tribISSQN} onValueChange={(v) => onChange({ tribISSQN: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tributável</SelectItem><SelectItem value="2">Imunidade</SelectItem>
                  <SelectItem value="3">Exportação</SelectItem><SelectItem value="4">Não incidência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={campo}>
              <Label>Retenção do ISS</Label>
              <Select value={item.tpRetISSQN} onValueChange={(v) => onChange({ tpRetISSQN: v })} disabled={item.tribISSQN !== '1'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Não retido</SelectItem><SelectItem value="2">Retido pelo tomador</SelectItem><SelectItem value="3">Retido pelo intermediário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {['12', '13'].includes(item.cAtivSN) && (
              <div className={`${campo} col-span-2`}>
                <Label>Benefício municipal do ISS</Label>
                <Select value={item.tpBM || '_'} onValueChange={(v) => onChange({ tpBM: v === '_' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Nenhum</SelectItem><SelectItem value="1">Isenção</SelectItem><SelectItem value="2">Redução da base em %</SelectItem>
                    <SelectItem value="3">Redução da base em R$</SelectItem><SelectItem value="4">Alíquota diferenciada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Resultado ----------------

function ResultadoSimples({ resultado }: { resultado: any }) {
  const [json, setJson] = useState(false);
  const t = resultado?.total || {};
  const resolucoes: any[] = resultado?.resolucaoAliquotas?.itens || [];
  const avisos: string[] = [...(resultado?.resolucaoAliquotas?.avisos || []), ...resolucoes.flatMap((r) => r.avisos || [])].map((a: any) => (typeof a === 'string' ? a : a?.descricao || a?.mensagem || JSON.stringify(a)));
  const pendente = Number(t.vCBSSNtotPendSusp || 0) + Number(t.vIBSSNtotPendSusp || 0);

  return (
    <div className="space-y-4">
      <div className={cartao}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold text-foreground">Resultado</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setJson((v) => !v)}>{json ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}JSON completo</Button>
            <Button variant="outline" size="sm" onClick={() => baixar(JSON.stringify(resultado, null, 2), 'calculo-simples-nacional.json', 'application/json')}><Download className="w-4 h-4 mr-1" />Baixar</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Indicador titulo="Receita bruta (Simples)" valor={formatarReais(t.vRBSNtot)} />
          <Indicador titulo="CBS no Simples" valor={formatarReais(t.vCBSSNtot)} />
          <Indicador titulo="IBS no Simples" valor={formatarReais(t.vIBSSNtot)} />
          <Indicador titulo="Imposto Seletivo" valor={formatarReais(t.totalIs)} />
        </div>
        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total de tributos da operação</span>
          <span className="text-xl font-bold text-primary">{t.totalTributos !== undefined ? formatarReais(t.totalTributos) : '—'}</span>
        </div>
        {pendente > 0 && <p className="mt-2 text-xs text-muted-foreground">Inclui {formatarReais(pendente)} pendente ou suspenso.</p>}
        {resultado?.oper?.regimeApuracao === 'SOMENTE_RECEITA' && (
          <p className="mt-3 text-sm text-muted-foreground flex gap-1.5"><Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />Neste regime a empresa paga IBS e CBS por fora do Simples: os itens entram no Simples só como receita bruta. Para calcular esses tributos, escolha "Lucro Real ou Presumido" no topo da página.</p>
        )}
        {avisos.length > 0 && <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-400 list-disc pl-5">{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}
        {json && <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs custom-scrollbar">{JSON.stringify(resultado, null, 2)}</pre>}
      </div>

      {(resultado?.objetos || []).map((o: any) => <ItemResultado key={o.nObj} obj={o} resolucao={resolucoes.find((r) => r.numero === o.nObj)} />)}
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-base font-semibold text-foreground mt-0.5">{valor}</p>
    </div>
  );
}

const ROTULO_ESTADO: Record<string, string> = {
  CALCULADO: 'Calculado', NAO_CALCULADO: 'Não calculado', INCONSISTENCIA_ENTRADA: 'Inconsistência nos dados',
};

function ItemResultado({ obj, resolucao }: { obj: any; resolucao?: any }) {
  const [memoria, setMemoria] = useState(false);
  const t = obj.tribCalc || {};
  const ok = obj.estadoItem === 'CALCULADO';
  return (
    <div className={cartao}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{obj.nObj}</span>
        {resolucao?.anexoAplicado && <span className="text-sm font-medium text-foreground">Anexo {resolucao.anexoAplicado}</span>}
        {t.tpRBSNDescricao && <span className="text-xs text-muted-foreground">{t.tpRBSNDescricao}</span>}
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{ROTULO_ESTADO[obj.estadoItem] || obj.estadoItem}</span>
      </div>
      {obj.motivoEstado?.descricao && <p className="text-sm text-muted-foreground mb-3">{obj.motivoEstado.descricao}</p>}
      {(obj.erros || []).map((e: any, i: number) => <ErroSimples key={i} erro={e} />)}

      {t.vBC !== undefined && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">Tributo</th><th className="py-2 pr-3 font-medium">Base</th><th className="py-2 pr-3 font-medium">Alíquota efetiva</th><th className="py-2 pr-3 font-medium">Pendente/suspenso</th><th className="py-2 font-medium text-right">Valor</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-border/60"><td className="py-2 pr-3 text-foreground">CBS</td><td className="py-2 pr-3">{formatarReais(t.vBC)}</td><td className="py-2 pr-3">{formatarPercentual(t.pCBSSN)}</td><td className="py-2 pr-3">{formatarReais(t.vCBSPendSusp)}</td><td className="py-2 text-right font-semibold text-foreground">{formatarReais(t.vCBSSN)}</td></tr>
              <tr className="border-b border-border/60"><td className="py-2 pr-3 text-foreground">IBS</td><td className="py-2 pr-3">{formatarReais(t.vBC)}</td><td className="py-2 pr-3">{t.pIBSSN === null || t.pIBSSN === undefined ? '—' : formatarPercentual(t.pIBSSN)}</td><td className="py-2 pr-3">{formatarReais(t.vIBSPendSusp)}</td><td className="py-2 text-right font-semibold text-foreground">{formatarReais(t.vIBSSN)}</td></tr>
              {Number(t.IS?.valor || 0) > 0 && <tr className="border-b border-border/60"><td className="py-2 pr-3 text-foreground">Imposto Seletivo</td><td colSpan={3} /><td className="py-2 text-right font-semibold text-foreground">{formatarReais(t.IS.valor)}</td></tr>}
              {t.totalItem !== undefined && <tr><td className="py-2 pr-3 font-semibold text-foreground" colSpan={4}>Total do item</td><td className="py-2 text-right font-bold text-primary">{formatarReais(t.totalItem)}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {t.memoriaCalculo && (
        <div className="mt-3">
          <button type="button" className="text-sm text-primary font-medium flex items-center gap-1" onClick={() => setMemoria((v) => !v)}>
            {memoria ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}Memória de cálculo
          </button>
          {memoria && <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">{Object.entries(t.memoriaCalculo).map(([k, v]) => <li key={k}><b className="uppercase">{k}:</b> {String(v)}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function ErroSimples({ erro }: { erro: any }) {
  const [abrir, setAbrir] = useState(false);
  const desc = useQuery<any>({
    queryKey: ['calc-sn', 'erro', erro.code], queryFn: () => sn('/calculadora/observabilidade/simples-nacional/erros', { codigo: erro.code }),
    enabled: abrir && !!erro.code, staleTime: Infinity, retry: 0,
  });
  return (
    <div className="mb-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm flex gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-foreground">{erro.title || 'Inconsistência'} {erro.code && <span className="text-xs text-muted-foreground">({erro.code})</span>}</p>
        {erro.detail && <p className="text-muted-foreground">{erro.detail}</p>}
        {erro.code && <button type="button" className="text-xs text-primary mt-1" onClick={() => setAbrir((v) => !v)}>{abrir ? 'Ocultar explicação' : 'Como resolver?'}</button>}
        {abrir && desc.data && <p className="text-xs text-muted-foreground mt-1">{desc.data.descricao || desc.data.titulo}</p>}
      </div>
    </div>
  );
}
