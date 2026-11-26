import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Calculator, Database, Info, LayoutGrid, Store } from 'lucide-react';
import { CalculadoraGuiada } from '@/components/calculadora/CalculadoraGuiada';
import { CalculadoraSimples } from '@/components/calculadora/CalculadoraSimples';
import { ExploradorApi, FONTE_REGULAR, FONTE_SIMPLES } from '@/components/calculadora/ExploradorApi';
import { SobreCalculadora } from '@/components/calculadora/SobreCalculadora';
import { ApresentacaoRoilead } from '@/components/vendas/ApresentacaoRoilead';
import { CALC_SN_API, chamar, Versao } from '@/lib/calculadoraRtc';

type Aba = 'calcular' | 'funcoes';
type Regime = 'regular' | 'simples';

const lerRegime = (): Regime => {
  try { return localStorage.getItem('roilead:calculadora:regime') === 'simples' ? 'simples' : 'regular'; } catch { return 'regular'; }
};

const formatarData = (d?: string) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : null);

/**
 * Calculadora da Reforma Tributária (CBS, IBS e Imposto Seletivo).
 * Dois motores oficiais da Receita: regime regular e Simples Nacional.
 * Funcionalidade gratuita: não depende de assinatura do roiLead.
 */
export default function CalculadoraTributaria() {
  const contexto = useOutletContext<{ hasActiveSubscription?: boolean } | undefined>();
  const [aba, setAba] = useState<Aba>('calcular');
  const [regime, setRegimeEstado] = useState<Regime>(lerRegime);
  const setRegime = (r: Regime) => {
    setRegimeEstado(r);
    try { localStorage.setItem('roilead:calculadora:regime', r); } catch { /* sem armazenamento */ }
  };

  const versao = useQuery<Versao>({
    queryKey: ['calc', 'versao'], queryFn: () => chamar('/dados-abertos/versao'), staleTime: 1000 * 60 * 10, retry: 1,
  });
  const versaoSn = useQuery<Versao>({
    queryKey: ['calc-sn', 'versao'], queryFn: () => chamar(CALC_SN_API + '/versao'), staleTime: 1000 * 60 * 10, retry: 1, enabled: regime === 'simples',
  });
  const v = regime === 'simples' ? versaoSn : versao;

  const botaoAba = (id: Aba, rotulo: string, Icone: typeof Calculator) => (
    <button type="button" onClick={() => setAba(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === id ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      <Icone className="w-4 h-4" />{rotulo}
    </button>
  );

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">Calculadora da Reforma Tributária</h2>
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md uppercase tracking-wider">Grátis</span>
              <SobreCalculadora />
            </div>
            <p className="text-muted-foreground">Simule CBS, IBS e Imposto Seletivo (LC 214/2025), consulte as tabelas oficiais e gere o XML do documento fiscal.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 w-fit">
            <Database className="w-4 h-4 text-primary" />
            {v.isLoading ? 'Verificando tabelas…' : v.data
              ? <span>Motor {regime === 'simples' ? 'Simples ' : ''}<b className="text-foreground">v{v.data.versaoApp}</b> · tabelas oficiais de <b className="text-foreground">{formatarData(v.data.dataVersaoDb)}</b></span>
              : <span className="text-amber-600 dark:text-amber-400">Calculadora indisponível no momento</span>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-foreground mb-3">Qual é o regime da empresa que está vendendo?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <OpcaoRegime ativo={regime === 'regular'} onClick={() => setRegime('regular')} icone={Building2}
              titulo="Lucro Real ou Presumido" texto="Alíquotas cheias da CBS e do IBS, com reduções da lei, Imposto Seletivo e XML da nota." />
            <OpcaoRegime ativo={regime === 'simples'} onClick={() => setRegime('simples')} icone={Store}
              titulo="Simples Nacional" texto="ME e EPP do Simples: CBS e IBS pela alíquota efetiva do seu anexo. A partir de 2027." />
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {botaoAba('calcular', 'Calcular tributos', Calculator)}
          {botaoAba('funcoes', 'Consultas e todas as funções', LayoutGrid)}
        </div>

        {/* Tudo fica montado para não perder o que já foi digitado ao trocar de aba ou de regime. */}
        <div className={aba === 'calcular' && regime === 'regular' ? '' : 'hidden'}><CalculadoraGuiada /></div>
        <div className={aba === 'calcular' && regime === 'simples' ? '' : 'hidden'}><CalculadoraSimples /></div>
        <div className={aba === 'funcoes' && regime === 'regular' ? '' : 'hidden'}><ExploradorApi fonte={FONTE_REGULAR} /></div>
        <div className={aba === 'funcoes' && regime === 'simples' ? '' : 'hidden'}><ExploradorApi fonte={FONTE_SIMPLES} /></div>

        {/* Quem usa só a calculadora (grátis) conhece o resto do roiLead. */}
        {contexto && !contexto.hasActiveSubscription && <ApresentacaoRoilead compacto />}

        <div className="bg-muted p-4 sm:p-6 rounded-xl flex gap-3 text-sm text-muted-foreground leading-relaxed">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><b className="text-foreground">Simulação.</b> Os valores são calculados com as regras e tabelas oficiais publicadas, mas não substituem a orientação do seu contador.</p>
            <p>Cálculo feito pelos motores de código aberto da Calculadora de Tributos da Receita Federal do Brasil (regime regular e Simples Nacional, licença MIT), hospedados pelo roiLead. Esta página não é um serviço oficial do governo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpcaoRegime({ ativo, onClick, icone: Icone, titulo, texto }: { ativo: boolean; onClick: () => void; icone: typeof Calculator; titulo: string; texto: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo}
      className={`text-left rounded-lg border-2 p-3 flex gap-3 transition-colors ${ativo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
      <Icone className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ativo ? 'text-primary' : 'text-muted-foreground'}`} />
      <span>
        <span className="block font-semibold text-foreground">{titulo}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{texto}</span>
      </span>
    </button>
  );
}
