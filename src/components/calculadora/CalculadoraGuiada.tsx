import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calculator, CheckCircle2, ChevronDown, ChevronUp, Copy, Download, FileCode2, Loader2, Plus, RotateCcw, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BuscaLista, OpcaoBusca } from './BuscaLista';
import {
  CalcError, chamar, chamarBruto, formatarPercentual, formatarReais, hojeIso, mensagemDeErro,
  Municipio, NbsItem, NcmVigente, SituacaoComClassificacoes, TipoDfe, Uf,
} from '@/lib/calculadoraRtc';

type TipoItem = 'ncm' | 'nbs';
interface ItemForm {
  id: string;
  tipo: TipoItem;
  codigo: string;
  cst: string;
  cClassTrib: string;
  baseCalculo: string;
  quantidade: string;
  unidade: string;
  aliqCbs: string;
  aliqUf: string;
  aliqMun: string;
  temIS: boolean;
  isCst: string;
  isClassTrib: string;
  isBase: string;
  isInformado: string;
  isAdValorem: string;
  isAdRem: string;
}

const novoItem = (): ItemForm => ({
  id: Math.random().toString(36).slice(2), tipo: 'ncm', codigo: '', cst: '', cClassTrib: '', baseCalculo: '', quantidade: '', unidade: '',
  aliqCbs: '', aliqUf: '', aliqMun: '', temIS: false, isCst: '', isClassTrib: '', isBase: '', isInformado: '', isAdValorem: '', isAdRem: '',
});

const UNIDADES = ['UN', 'KG', 'G', 'LT', 'ML', 'M', 'M2', 'M3', 'CX', 'PC', 'PAR', 'DZ', 'TON', 'KWH', 'H'];
// Aceita "1.500,00", "1500,00" e "1500.00".
const num = (s: string) => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const numSimples = num;
const LIMITE_ALIQUOTA_AUTOMATICA = '2027-01-01';

const campo = 'space-y-1.5';
const cartao = 'bg-card border border-border rounded-xl p-4 sm:p-6';

function useLista<T>(chave: unknown[], caminho: string, query?: Record<string, any>, habilitado = true) {
  return useQuery<T>({
    queryKey: ['calc', ...chave],
    queryFn: () => chamar<T>(caminho, { query }),
    enabled: habilitado,
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}

interface Props { onAbrirFuncao?: (operacao: string) => void }

export function CalculadoraGuiada(_props: Props) {
  const [data, setData] = useState(hojeIso());
  const [hora, setHora] = useState('10:00');
  const [uf, setUf] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([novoItem()]);
  const [porItem, setPorItem] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erroGeral, setErroGeral] = useState<{ titulo: string; detalhe: string } | null>(null);
  const [payloadUsado, setPayloadUsado] = useState<any>(null);

  const precisaAliquota = data >= LIMITE_ALIQUOTA_AUTOMATICA;

  const ufs = useLista<Uf[]>(['ufs'], '/dados-abertos/ufs');
  const municipios = useLista<Municipio[]>(['municipios', uf], '/dados-abertos/ufs/municipios', { siglaUf: uf }, !!uf);
  const csts = useLista<SituacaoComClassificacoes[]>(['cst-cbs-ibs', data], '/dados-abertos/situacoes-tributarias/cbs-ibs', { data }, !!data);
  const cstsIs = useLista<SituacaoComClassificacoes[]>(['cst-is', data], '/dados-abertos/situacoes-tributarias/is', { data }, !!data);
  // O Imposto Seletivo só existe a partir de 2027: antes disso a lista de CSTs do IS vem vazia.
  const isDisponivel = (cstsIs.data?.length ?? 0) > 0;
  const temNcm = itens.some((i) => i.tipo === 'ncm');
  const temNbs = itens.some((i) => i.tipo === 'nbs');
  const ncms = useLista<NcmVigente[]>(['ncm-vigentes', data], '/dados-abertos/ncm/vigentes', { data }, !!data && temNcm);
  const nbss = useLista<NbsItem[]>(['nbs-lista', data], '/dados-abertos/nbs/lista', { data }, !!data && temNbs);

  const codigoUf = ufs.data?.find((u) => u.sigla === uf)?.codigo;
  const aliqUniao = useLista<{ aliquotaReferencia: number }>(['aliq-uniao', data], '/dados-abertos/aliquota-uniao', { data }, precisaAliquota);
  const aliqUf = useLista<{ aliquotaReferencia: number }>(['aliq-uf', codigoUf, data], '/dados-abertos/aliquota-uf', { codigoUf, data }, precisaAliquota && !!codigoUf);
  const aliqMun = useLista<{ aliquotaReferencia: number }>(['aliq-mun', municipio, data], '/dados-abertos/aliquota-municipio', { codigoMunicipio: municipio, data }, precisaAliquota && !!municipio);
  const aliquotasPublicadas = !!(aliqUniao.data || aliqUf.data || aliqMun.data);

  // Preenche as alíquotas de referência oficiais nos itens que ainda estão em branco.
  useEffect(() => {
    if (!precisaAliquota) return;
    setItens((lista) => lista.map((i) => ({
      ...i,
      aliqCbs: i.aliqCbs || (aliqUniao.data ? String(aliqUniao.data.aliquotaReferencia) : ''),
      aliqUf: i.aliqUf || (aliqUf.data ? String(aliqUf.data.aliquotaReferencia) : ''),
      aliqMun: i.aliqMun || (aliqMun.data ? String(aliqMun.data.aliquotaReferencia) : ''),
    })));
  }, [precisaAliquota, aliqUniao.data, aliqUf.data, aliqMun.data]);

  const opcoesMunicipio: OpcaoBusca[] = useMemo(() => (municipios.data || []).map((m) => ({ valor: String(m.codigo), rotulo: m.nome, detalhe: `IBGE ${m.codigo}` })), [municipios.data]);
  const opcoesNcm: OpcaoBusca[] = useMemo(() => (ncms.data || []).map((n) => ({ valor: n.ncm, rotulo: `${n.ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')} — ${n.descricao.replace(/^[-\s]+/, '')}` })), [ncms.data]);
  const opcoesNbs: OpcaoBusca[] = useMemo(() => (nbss.data || []).map((n) => ({ valor: n.codigo, rotulo: `${n.codigo} — ${n.descricao}` })), [nbss.data]);

  const atualizar = (id: string, campos: Partial<ItemForm>) => setItens((l) => l.map((i) => (i.id === id ? { ...i, ...campos } : i)));

  const montarPayload = () => {
    const [h, m] = (hora || '10:00').split(':');
    const payload: any = {
      id: `roilead-${Date.now()}`,
      versao: '1.0.0',
      dhFatoGerador: `${data}T${(h || '10').padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00-03:00`,
      municipio: Number(municipio),
      uf,
      itens: itens.map((i, idx) => {
        const it: any = { numero: idx + 1, cst: i.cst, cClassTrib: i.cClassTrib };
        if (i.tipo === 'ncm') it.ncm = i.codigo; else it.nbs = i.codigo;
        const base = num(i.baseCalculo); if (base !== undefined) it.baseCalculo = base;
        const q = numSimples(i.quantidade); if (q !== undefined) it.quantidade = q;
        if (i.unidade) it.unidade = i.unidade;
        if (i.temIS && isDisponivel) {
          it.impostoSeletivo = { cst: i.isCst, cClassTrib: i.isClassTrib, baseCalculo: num(i.isBase) ?? base ?? 0 };
          if (q !== undefined) it.impostoSeletivo.quantidade = q;
          if (i.unidade) it.impostoSeletivo.unidade = i.unidade;
          const inf = num(i.isInformado); if (inf !== undefined) it.impostoSeletivo.impostoInformado = inf;
        }
        if (precisaAliquota) {
          it.aliquotasNominais = { cbs: numSimples(i.aliqCbs), ibsEstadual: numSimples(i.aliqUf), ibsMunicipal: numSimples(i.aliqMun) };
          if (i.temIS && isDisponivel) {
            const adv = numSimples(i.isAdValorem); const adr = numSimples(i.isAdRem);
            it.aliquotasNominais.impostoSeletivo = { ...(adv !== undefined ? { adValorem: adv } : {}), ...(adr !== undefined ? { adRem: adr } : {}) };
          }
        }
        return it;
      }),
    };
    return payload;
  };

  const validar = (): string | null => {
    if (!data) return 'Informe a data da operação.';
    if (!uf) return 'Escolha a UF.';
    if (!municipio) return 'Escolha o município.';
    for (const [idx, i] of itens.entries()) {
      const n = `Item ${idx + 1}`;
      if (!i.codigo) return `${n}: informe o ${i.tipo === 'ncm' ? 'NCM do produto' : 'NBS do serviço'}.`;
      if (!i.cst) return `${n}: escolha a situação tributária (CST).`;
      if (!i.cClassTrib) return `${n}: escolha a classificação tributária (cClassTrib).`;
      const comIS = i.temIS && isDisponivel;
      if (!comIS && num(i.baseCalculo) === undefined) return `${n}: informe o valor (base de cálculo).`;
      if (comIS && (!i.isCst || !i.isClassTrib)) return `${n}: complete o CST e a classificação do Imposto Seletivo.`;
      if (precisaAliquota && (numSimples(i.aliqCbs) === undefined || numSimples(i.aliqUf) === undefined || numSimples(i.aliqMun) === undefined)) {
        return `${n}: para operações a partir de 2027, informe as alíquotas de CBS, IBS estadual e IBS municipal.`;
      }
    }
    return null;
  };

  const calcular = async () => {
    const problema = validar();
    if (problema) { toast.error(problema); return; }
    const payload = montarPayload();
    setCalculando(true); setErroGeral(null); setResultado(null);
    try {
      const r = await chamarBruto(porItem ? '/observabilidade/regime-geral' : '/regime-geral', { method: 'POST', body: payload });
      if (r.status >= 200 && r.status < 300) { setResultado(r.dados); setPayloadUsado(payload); }
      else setErroGeral(mensagemDeErro(r));
    } catch (e: any) {
      setErroGeral({ titulo: 'Falha na comunicação', detalhe: e?.message || 'Tente novamente.' });
    } finally {
      setCalculando(false);
    }
  };

  const limpar = () => { setItens([novoItem()]); setResultado(null); setErroGeral(null); setPayloadUsado(null); };

  return (
    <div className="space-y-6">
      <div className={cartao}>
        <h3 className="font-semibold text-foreground mb-4">1. Dados da operação</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={campo}>
            <Label>Data do fato gerador</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className={campo}>
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className={campo}>
            <Label>UF</Label>
            <Select value={uf} onValueChange={(v) => { setUf(v); setMunicipio(''); }}>
              <SelectTrigger><SelectValue placeholder={ufs.isLoading ? 'Carregando…' : 'Escolha a UF'} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(ufs.data || []).slice().sort((a, b) => a.sigla.localeCompare(b.sigla)).map((u) => (
                  <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={campo}>
            <Label>Município</Label>
            <BuscaLista opcoes={opcoesMunicipio} valor={municipio} onChange={(v) => setMunicipio(v)} placeholder={uf ? 'Digite o nome da cidade' : 'Escolha a UF antes'} carregando={municipios.isLoading && !!uf} desabilitado={!uf} />
          </div>
        </div>
        {ufs.isError && <AvisoServico />}
        <div className="mt-4 text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">
          {precisaAliquota
            ? aliquotasPublicadas
              ? 'Para operações a partir de 2027 as alíquotas são informadas por você. Preenchemos as alíquotas de referência oficiais; ajuste se necessário.'
              : 'Para operações a partir de 2027 as alíquotas precisam ser informadas. A tabela oficial ainda não publicou as alíquotas de referência para essa data, então preencha CBS, IBS estadual e IBS municipal em cada item.'
            : 'Até 31/12/2026 a calculadora aplica automaticamente as alíquotas de teste vigentes (CBS 0,9% e IBS 0,1%).'}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">2. Itens da operação</h3>
          <Button variant="outline" size="sm" onClick={() => setItens((l) => [...l, novoItem()])}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button>
        </div>
        {itens.map((item, idx) => (
          <ItemCard
            key={item.id}
            indice={idx}
            item={item}
            data={data}
            podeRemover={itens.length > 1}
            onRemover={() => setItens((l) => l.filter((i) => i.id !== item.id))}
            onChange={(c) => atualizar(item.id, c)}
            csts={csts.data || []}
            cstsIs={cstsIs.data || []}
            carregandoCst={csts.isLoading}
            opcoesNcm={opcoesNcm}
            opcoesNbs={opcoesNbs}
            carregandoCodigos={item.tipo === 'ncm' ? ncms.isLoading : nbss.isLoading}
            precisaAliquota={precisaAliquota}
          />
        ))}
      </div>

      <div className={`${cartao} flex flex-col sm:flex-row sm:items-center gap-4 justify-between`}>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={porItem} onChange={(e) => setPorItem(e.target.checked)} />
          <span>
            <span className="font-medium text-foreground">Mostrar erros por item</span>
            <span className="block text-muted-foreground text-xs">Se um item tiver problema, os outros continuam sendo calculados (modo observabilidade da Receita).</span>
          </span>
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={limpar} disabled={calculando}><RotateCcw className="w-4 h-4 mr-2" />Limpar</Button>
          <Button onClick={calcular} disabled={calculando} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold min-w-[160px]">
            {calculando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calcular tributos
          </Button>
        </div>
      </div>

      {erroGeral && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div><p className="font-semibold text-foreground">{erroGeral.titulo}</p><p className="text-sm text-muted-foreground mt-1">{erroGeral.detalhe}</p></div>
        </div>
      )}

      {resultado && <Resultado resultado={resultado} payload={payloadUsado} />}
    </div>
  );
}

function AvisoServico() {
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      A calculadora não respondeu. Ela pode estar sendo atualizada; tente novamente em alguns instantes.
    </div>
  );
}

interface ItemCardProps {
  indice: number; item: ItemForm; data: string; podeRemover: boolean; onRemover: () => void; onChange: (c: Partial<ItemForm>) => void;
  csts: SituacaoComClassificacoes[]; cstsIs: SituacaoComClassificacoes[]; carregandoCst: boolean;
  opcoesNcm: OpcaoBusca[]; opcoesNbs: OpcaoBusca[]; carregandoCodigos: boolean; precisaAliquota: boolean;
}

function ItemCard({ indice, item, data, podeRemover, onRemover, onChange, csts, cstsIs, carregandoCst, opcoesNcm, opcoesNbs, carregandoCodigos, precisaAliquota }: ItemCardProps) {
  const classificacoes = csts.find((c) => c.codigo === item.cst)?.classificacoesTributarias || [];
  const classificacoesIs = cstsIs.find((c) => c.codigo === item.isCst)?.classificacoesTributarias || [];
  const codigoValido = item.tipo === 'ncm' ? /^\d{8}$/.test(item.codigo) : /^\d{9}$/.test(item.codigo);

  const detalheNcm = useQuery<any>({
    queryKey: ['calc', 'ncm', item.codigo, data],
    queryFn: () => chamar('/dados-abertos/ncm', { query: { ncm: item.codigo, data } }),
    enabled: item.tipo === 'ncm' && codigoValido && !!data,
    staleTime: 1000 * 60 * 60, retry: 0,
  });
  const detalheNbs = useQuery<any>({
    queryKey: ['calc', 'nbs', item.codigo, data],
    queryFn: () => chamar('/dados-abertos/nbs', { query: { nbs: item.codigo, data } }),
    enabled: item.tipo === 'nbs' && codigoValido && !!data,
    staleTime: 1000 * 60 * 60, retry: 0,
  });
  const aplicavel = useQuery<{ valido: boolean }>({
    queryKey: ['calc', 'aplicavel', item.tipo, item.codigo, item.cClassTrib, data],
    queryFn: () => chamar(`/dados-abertos/classificacoes-tributarias/${item.tipo}-aplicavel`, { query: { cClassTrib: item.cClassTrib, [item.tipo]: item.codigo, dataOcorrenciaFatoGerador: data } }),
    enabled: codigoValido && !!item.cClassTrib && !!data,
    staleTime: 1000 * 60 * 60, retry: 0,
  });

  const sujeitoIS = item.tipo === 'ncm' && detalheNcm.data?.tributadoPeloImpostoSeletivo;
  useEffect(() => {
    if (sujeitoIS && !item.temIS && cstsIs.length > 0) onChange({ temIS: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sujeitoIS, cstsIs.length]);

  const caminhoNcm = detalheNcm.data ? [detalheNcm.data.capitulo, detalheNcm.data.posicao, detalheNcm.data.subposicao, detalheNcm.data.item, detalheNcm.data.subitem].filter(Boolean).join(' › ') : '';

  return (
    <div className={cartao}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{indice + 1}</span>
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(['ncm', 'nbs'] as TipoItem[]).map((t) => (
              <button key={t} type="button" onClick={() => onChange({ tipo: t, codigo: '', cClassTrib: '', temIS: false })}
                className={`px-3 py-1 rounded-md transition-colors ${item.tipo === t ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'ncm' ? 'Produto (NCM)' : 'Serviço (NBS)'}
              </button>
            ))}
          </div>
        </div>
        {podeRemover && <Button variant="ghost" size="sm" onClick={onRemover} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${campo} lg:col-span-2`}>
          <Label>{item.tipo === 'ncm' ? 'Produto — busque pelo código NCM ou pela descrição' : 'Serviço — busque pelo código NBS ou pela descrição'}</Label>
          <BuscaLista livre opcoes={item.tipo === 'ncm' ? opcoesNcm : opcoesNbs} valor={item.codigo} onChange={(v) => onChange({ codigo: v })} carregando={carregandoCodigos}
            placeholder={item.tipo === 'ncm' ? 'Ex.: 1006.30.21 ou "arroz"' : 'Ex.: 101011100 ou "construção"'} />
          {item.tipo === 'ncm' && caminhoNcm && <p className="text-xs text-muted-foreground">{caminhoNcm}</p>}
          {item.tipo === 'nbs' && detalheNbs.data?.descricao && <p className="text-xs text-muted-foreground">{detalheNbs.data.descricao}</p>}
          {(detalheNcm.isError || detalheNbs.isError) && <p className="text-xs text-destructive">{((detalheNcm.error || detalheNbs.error) as CalcError)?.message}</p>}
          {sujeitoIS && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{cstsIs.length > 0 ? 'Este produto é tributado pelo Imposto Seletivo — preencha o grupo abaixo.' : 'Este produto será tributado pelo Imposto Seletivo a partir de 2027.'}</p>}
        </div>

        <div className={campo}>
          <Label>Situação tributária (CST)</Label>
          <Select value={item.cst} onValueChange={(v) => onChange({ cst: v, cClassTrib: '' })}>
            <SelectTrigger><SelectValue placeholder={carregandoCst ? 'Carregando…' : 'Escolha o CST'} /></SelectTrigger>
            <SelectContent className="max-h-80 max-w-[90vw]">
              {csts.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} — {c.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className={campo}>
          <Label>Classificação tributária (cClassTrib)</Label>
          <Select value={item.cClassTrib} onValueChange={(v) => onChange({ cClassTrib: v })} disabled={!item.cst}>
            <SelectTrigger><SelectValue placeholder={item.cst ? 'Escolha a classificação' : 'Escolha o CST antes'} /></SelectTrigger>
            <SelectContent className="max-h-80 max-w-[90vw]">
              {classificacoes.map((c) => <SelectItem key={c.codigo} value={c.codigo}><span className="whitespace-normal">{c.codigo} — {c.descricao}</span></SelectItem>)}
            </SelectContent>
          </Select>
          {aplicavel.data && (aplicavel.data.valido
            ? <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Classificação válida para este {item.tipo === 'ncm' ? 'NCM' : 'NBS'}.</p>
            : <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Esta classificação não está vinculada a este {item.tipo === 'ncm' ? 'NCM' : 'NBS'} na tabela oficial.</p>)}
        </div>

        <div className={campo}>
          <Label>Valor / base de cálculo (R$){item.temIS && <span className="text-muted-foreground font-normal"> — opcional com IS</span>}</Label>
          <Input inputMode="decimal" placeholder="Ex.: 1.500,00" value={item.baseCalculo} onChange={(e) => onChange({ baseCalculo: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={campo}>
            <Label>Quantidade</Label>
            <Input inputMode="decimal" placeholder="Opcional" value={item.quantidade} onChange={(e) => onChange({ quantidade: e.target.value })} />
          </div>
          <div className={campo}>
            <Label>Unidade</Label>
            <Select value={item.unidade || '_'} onValueChange={(v) => onChange({ unidade: v === '_' ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="_">—</SelectItem>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {precisaAliquota && (
          <div className="lg:col-span-2 grid grid-cols-3 gap-3">
            <div className={campo}><Label>CBS (%)</Label><Input inputMode="decimal" value={item.aliqCbs} onChange={(e) => onChange({ aliqCbs: e.target.value })} placeholder="Ex.: 8,8" /></div>
            <div className={campo}><Label>IBS estadual (%)</Label><Input inputMode="decimal" value={item.aliqUf} onChange={(e) => onChange({ aliqUf: e.target.value })} placeholder="Ex.: 0,05" /></div>
            <div className={campo}><Label>IBS municipal (%)</Label><Input inputMode="decimal" value={item.aliqMun} onChange={(e) => onChange({ aliqMun: e.target.value })} placeholder="Ex.: 0,05" /></div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={item.temIS} onChange={(e) => onChange({ temIS: e.target.checked })} />
          <span className="font-medium text-foreground">Incide Imposto Seletivo (IS)</span>
        </label>
        {item.temIS && cstsIs.length === 0 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />O Imposto Seletivo passa a valer em 2027. Para essa data não há classificações do IS — mude a data da operação para 2027 ou depois.</p>
        )}
        {item.temIS && cstsIs.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <div className={campo}>
              <Label>CST do IS</Label>
              <Select value={item.isCst} onValueChange={(v) => onChange({ isCst: v, isClassTrib: '' })}>
                <SelectTrigger><SelectValue placeholder="Escolha o CST do IS" /></SelectTrigger>
                <SelectContent className="max-h-80 max-w-[90vw]">{cstsIs.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} — {c.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={campo}>
              <Label>Classificação do IS</Label>
              <Select value={item.isClassTrib} onValueChange={(v) => onChange({ isClassTrib: v })} disabled={!item.isCst}>
                <SelectTrigger><SelectValue placeholder={item.isCst ? 'Escolha a classificação' : 'Escolha o CST antes'} /></SelectTrigger>
                <SelectContent className="max-h-80 max-w-[90vw]">{classificacoesIs.map((c) => <SelectItem key={c.codigo} value={c.codigo}><span className="whitespace-normal">{c.codigo} — {c.descricao}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={campo}><Label>Base de cálculo do IS (R$)</Label><Input inputMode="decimal" value={item.isBase} onChange={(e) => onChange({ isBase: e.target.value })} placeholder="Ex.: 150,00" /></div>
            <div className={campo}><Label>IS informado (R$) — opcional</Label><Input inputMode="decimal" value={item.isInformado} onChange={(e) => onChange({ isInformado: e.target.value })} placeholder="Para conferência" /></div>
            {precisaAliquota && (<>
              <div className={campo}><Label>Alíquota ad valorem do IS (%)</Label><Input inputMode="decimal" value={item.isAdValorem} onChange={(e) => onChange({ isAdValorem: e.target.value })} placeholder="Ex.: 10" /></div>
              <div className={campo}><Label>Alíquota ad rem do IS (R$ por unidade)</Label><Input inputMode="decimal" value={item.isAdRem} onChange={(e) => onChange({ isAdRem: e.target.value })} placeholder="Opcional" /></div>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Resultado ----------------

function Resultado({ resultado, payload }: { resultado: any; payload: any }) {
  const [mostrarJson, setMostrarJson] = useState(false);
  const objetos: any[] = resultado?.objetos || [];
  const tot = resultado?.total?.tribCalc || {};
  const ibscbs = tot.IBSCBSTot || {};
  const vCbs = Number(ibscbs.gCBS?.vCBS || 0);
  const vIbsUf = Number(ibscbs.gIBS?.gIBSUF?.vIBSUF || 0);
  const vIbsMun = Number(ibscbs.gIBS?.gIBSMun?.vIBSMun || 0);
  const vIs = Number(tot.ISTot?.vIS || 0);
  const totalGeral = vCbs + vIbsUf + vIbsMun + vIs;

  const baixarJson = () => baixar(JSON.stringify(resultado, null, 2), 'calculo-reforma-tributaria.json', 'application/json');

  return (
    <div className="space-y-4">
      <div className={cartao}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold text-foreground">3. Resultado</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMostrarJson((v) => !v)}>{mostrarJson ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}JSON completo</Button>
            <Button variant="outline" size="sm" onClick={baixarJson}><Download className="w-4 h-4 mr-1" />Baixar</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Indicador titulo="Base CBS/IBS" valor={formatarReais(ibscbs.vBCIBSCBS)} />
          <Indicador titulo="CBS (União)" valor={formatarReais(vCbs)} />
          <Indicador titulo="IBS estadual" valor={formatarReais(vIbsUf)} />
          <Indicador titulo="IBS municipal" valor={formatarReais(vIbsMun)} />
          <Indicador titulo="Imposto Seletivo" valor={formatarReais(vIs)} />
        </div>
        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total de tributos da operação</span>
          <span className="text-xl font-bold text-primary">{formatarReais(totalGeral)}</span>
        </div>
        {mostrarJson && <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs custom-scrollbar">{JSON.stringify(resultado, null, 2)}</pre>}
      </div>

      {objetos.map((o) => <ResultadoItem key={o.nObj} obj={o} entrada={payload?.itens?.[o.nObj - 1]} />)}

      <GerarXml payload={payload} />
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

function ResultadoItem({ obj, entrada }: { obj: any; entrada: any }) {
  const [abrirMemoria, setAbrirMemoria] = useState(false);
  const t = obj.tribCalc || {};
  const g = t.IBSCBS?.gIBSCBS || {};
  const is = t.IS;
  const erros: any[] = obj.erros || [];
  const linhas = [
    { nome: 'CBS', aliq: g.gCBS?.pCBS, efetiva: g.gCBS?.gRed?.pAliqEfet, red: g.gCBS?.gRed?.pRedAliq, valor: g.gCBS?.vCBS },
    { nome: 'IBS estadual', aliq: g.gIBSUF?.pIBSUF, efetiva: g.gIBSUF?.gRed?.pAliqEfet, red: g.gIBSUF?.gRed?.pRedAliq, valor: g.gIBSUF?.vIBSUF },
    { nome: 'IBS municipal', aliq: g.gIBSMun?.pIBSMun, efetiva: g.gIBSMun?.gRed?.pAliqEfet, red: g.gIBSMun?.gRed?.pRedAliq, valor: g.gIBSMun?.vIBSMun },
  ];
  const memorias: string[] = [];
  const m = t.IBSCBS?.memoriaCalculo;
  if (m) { if (m.cbs) memorias.push(`CBS: ${m.cbs}`); if (m.ibsUF) memorias.push(`IBS estadual: ${m.ibsUF}`); if (m.ibsMun) memorias.push(`IBS municipal: ${m.ibsMun}`); }
  if (is?.memoriaCalculo) memorias.push(`Imposto Seletivo: ${is.memoriaCalculo}`);
  const codigo = entrada?.ncm ? `NCM ${entrada.ncm}` : entrada?.nbs ? `NBS ${entrada.nbs}` : '';

  return (
    <div className={cartao}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">{obj.nObj}</span>
        <span className="font-medium text-foreground">{codigo}</span>
        {t.IBSCBS && <span className="text-xs text-muted-foreground">CST {t.IBSCBS.CST} · cClassTrib {t.IBSCBS.cClassTrib}</span>}
        {obj.estadoItem && <EstadoItem estado={obj.estadoItem} />}
      </div>

      {erros.length > 0 && (
        <div className="space-y-2 mb-3">
          {erros.map((e, i) => <ErroItem key={i} erro={e} />)}
        </div>
      )}

      {t.IBSCBS && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">Tributo</th><th className="py-2 pr-3 font-medium">Base</th><th className="py-2 pr-3 font-medium">Alíquota</th><th className="py-2 pr-3 font-medium">Redução</th><th className="py-2 pr-3 font-medium">Alíq. efetiva</th><th className="py-2 font-medium text-right">Valor</th>
            </tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-foreground">{l.nome}</td>
                  <td className="py-2 pr-3">{formatarReais(g.vBC)}</td>
                  <td className="py-2 pr-3">{formatarPercentual(l.aliq)}</td>
                  <td className="py-2 pr-3">{l.red ? formatarPercentual(l.red) : '—'}</td>
                  <td className="py-2 pr-3">{formatarPercentual(l.efetiva ?? l.aliq)}</td>
                  <td className="py-2 text-right font-semibold text-foreground">{formatarReais(l.valor)}</td>
                </tr>
              ))}
              {is && (
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 text-foreground">Imposto Seletivo</td>
                  <td className="py-2 pr-3">{formatarReais(is.vBCIS)}</td>
                  <td className="py-2 pr-3">{formatarPercentual(is.pIS)}{is.pISEspec ? ` + ${is.pISEspec}/un` : ''}</td>
                  <td className="py-2 pr-3">—</td><td className="py-2 pr-3">—</td>
                  <td className="py-2 text-right font-semibold text-foreground">{formatarReais(is.vIS)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {memorias.length > 0 && (
        <div className="mt-3">
          <button type="button" className="text-sm text-primary font-medium flex items-center gap-1" onClick={() => setAbrirMemoria((v) => !v)}>
            {abrirMemoria ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}Memória de cálculo
          </button>
          {abrirMemoria && <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">{memorias.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function EstadoItem({ estado }: { estado: string }) {
  const ok = /SIMULADO|CALCULADO|SUCESSO/i.test(estado);
  const rotulo = estado.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{rotulo}</span>;
}

function ErroItem({ erro }: { erro: any }) {
  const [abrir, setAbrir] = useState(false);
  const descricao = useQuery<any>({
    queryKey: ['calc', 'erro', erro.code],
    queryFn: () => chamar('/observabilidade/erros', { query: { codigo: erro.code } }),
    enabled: abrir && !!erro.code, staleTime: Infinity, retry: 0,
  });
  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm">
      <div className="flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-foreground">{erro.title || 'Inconsistência'} {erro.code && <span className="text-xs text-muted-foreground">({erro.code})</span>}</p>
          {erro.detail && <p className="text-muted-foreground">{erro.detail}</p>}
          {erro.code && <button type="button" className="text-xs text-primary mt-1" onClick={() => setAbrir((v) => !v)}>{abrir ? 'Ocultar explicação' : 'Como resolver?'}</button>}
          {abrir && (descricao.isLoading ? <p className="text-xs text-muted-foreground mt-1">Carregando…</p> : descricao.data && (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              {Object.entries(descricao.data).filter(([k]) => k !== 'codigo' && k !== 'code').map(([k, v]) => <p key={k}><span className="font-medium capitalize">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function baixar(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function GerarXml({ payload }: { payload: any }) {
  const tipos = useQuery<TipoDfe[]>({ queryKey: ['calc', 'tipos-xml'], queryFn: () => chamar('/xml/generate'), staleTime: Infinity, retry: 1 });
  const [tipo, setTipo] = useState('nfe');
  const [xml, setXml] = useState('');
  const [gerando, setGerando] = useState(false);
  const [validacao, setValidacao] = useState<null | { ok: boolean; texto: string }>(null);

  const gerar = async () => {
    setGerando(true); setXml(''); setValidacao(null);
    try {
      // O XML é gerado a partir do cálculo padrão (sem observabilidade), exigido pelo motor.
      const roc = await chamar('/regime-geral', { method: 'POST', body: payload });
      const r = await chamarBruto('/xml/generate', { method: 'POST', query: { tipo }, body: roc });
      if (r.status >= 200 && r.status < 300) setXml(r.texto);
      else { const m = mensagemDeErro(r); toast.error(`${m.titulo}: ${m.detalhe}`); }
    } catch (e: any) {
      toast.error(e instanceof CalcError ? `${e.titulo}: ${e.message}` : 'Não foi possível gerar o XML.');
    } finally { setGerando(false); }
  };

  const validar = async () => {
    const r = await chamarBruto('/xml/validate', { method: 'POST', query: { tipo, subtipo: 'grupo' }, body: xml, contentType: 'application/xml' });
    if (r.status >= 200 && r.status < 300) setValidacao({ ok: r.dados === true || r.texto.trim() === 'true', texto: r.texto });
    else { const m = mensagemDeErro(r); setValidacao({ ok: false, texto: `${m.titulo}: ${m.detalhe}` }); }
  };

  return (
    <div className={cartao}>
      <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><FileCode2 className="w-5 h-5 text-primary" />Gerar o grupo de tributação do documento fiscal (XML)</h3>
      <p className="text-sm text-muted-foreground mb-4">Gera o trecho de XML com CBS/IBS/IS deste cálculo para o documento escolhido e valida contra o leiaute oficial (XSD).</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-64">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(tipos.data || [{ nome: 'NFe', mnemonico: 'nfe' }]).map((t) => <SelectItem key={t.mnemonico} value={t.mnemonico}>{t.nome}{t.versaoNotaTecnica ? ` (NT ${t.versaoNotaTecnica})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={gerar} disabled={gerando} variant="outline">{gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCode2 className="w-4 h-4 mr-2" />}Gerar XML</Button>
      </div>
      {xml && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(xml); toast.success('XML copiado.'); }}><Copy className="w-4 h-4 mr-1" />Copiar</Button>
            <Button size="sm" variant="outline" onClick={() => baixar(xml, `grupo-tributacao-${tipo}.xml`, 'application/xml')}><Download className="w-4 h-4 mr-1" />Baixar</Button>
            <Button size="sm" variant="outline" onClick={validar}><ShieldCheck className="w-4 h-4 mr-1" />Validar no XSD</Button>
          </div>
          {validacao && (
            <p className={`text-sm flex items-center gap-1.5 ${validacao.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {validacao.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {validacao.ok ? 'XML válido no leiaute oficial.' : validacao.texto}
            </p>
          )}
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs custom-scrollbar">{xml}</pre>
        </div>
      )}
    </div>
  );
}
