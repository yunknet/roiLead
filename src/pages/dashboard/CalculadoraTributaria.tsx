import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Database, Info, LayoutGrid } from 'lucide-react';
import { CalculadoraGuiada } from '@/components/calculadora/CalculadoraGuiada';
import { ExploradorApi } from '@/components/calculadora/ExploradorApi';
import { SobreCalculadora } from '@/components/calculadora/SobreCalculadora';
import { chamar, Versao } from '@/lib/calculadoraRtc';

type Aba = 'calcular' | 'funcoes';

/**
 * Calculadora da Reforma Tributária (CBS, IBS e Imposto Seletivo).
 * Funcionalidade gratuita: não depende de assinatura do roiLead.
 */
export default function CalculadoraTributaria() {
  const [aba, setAba] = useState<Aba>('calcular');
  const versao = useQuery<Versao>({
    queryKey: ['calc', 'versao'],
    queryFn: () => chamar('/dados-abertos/versao'),
    staleTime: 1000 * 60 * 10, retry: 1,
  });
  const dataDb = versao.data?.dataVersaoDb ? new Date(`${versao.data.dataVersaoDb}T12:00:00`).toLocaleDateString('pt-BR') : null;

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
            {versao.isLoading ? 'Verificando tabelas…' : versao.data
              ? <span>Motor <b className="text-foreground">v{versao.data.versaoApp}</b> · tabelas oficiais de <b className="text-foreground">{dataDb}</b></span>
              : <span className="text-amber-600 dark:text-amber-400">Calculadora indisponível no momento</span>}
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button type="button" onClick={() => setAba('calcular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'calcular' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Calculator className="w-4 h-4" />Calcular tributos
          </button>
          <button type="button" onClick={() => setAba('funcoes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === 'funcoes' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="w-4 h-4" />Consultas e todas as funções
          </button>
        </div>

        {/* As duas abas ficam montadas para não perder o que já foi digitado. */}
        <div className={aba === 'calcular' ? '' : 'hidden'}><CalculadoraGuiada /></div>
        <div className={aba === 'funcoes' ? '' : 'hidden'}><ExploradorApi /></div>

        <div className="bg-muted p-4 sm:p-6 rounded-xl flex gap-3 text-sm text-muted-foreground leading-relaxed">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><b className="text-foreground">Simulação.</b> Os valores são calculados com as regras e tabelas oficiais publicadas, mas não substituem a orientação do seu contador.</p>
            <p>Cálculo feito pelo motor de código aberto da Calculadora de Tributos da Receita Federal do Brasil (licença MIT), hospedado pelo roiLead. Esta página não é um serviço oficial do governo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
