import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Tutorial de primeiro acesso do roiLead.
 * Destaca cada área do painel (elementos marcados com data-tour="...") e explica para que serve.
 * Aparece automaticamente uma única vez por usuário (fica salvo neste navegador) e pode ser
 * revisto a qualquer momento pelo botão de ajuda do cabeçalho.
 */

export type AreaPasso = 'menu' | 'cabecalho' | 'centro';

export interface PassoTutorial {
  id: string;
  /** Valor do atributo data-tour do elemento destacado. Sem alvo = janela no centro. */
  alvo?: string;
  area: AreaPasso;
  titulo: string;
  texto: string[];
  /** Se o alvo não existir na tela (ex.: recurso não liberado), o passo é pulado. */
  opcional?: boolean;
}

export const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    id: 'boas-vindas', area: 'centro', titulo: 'Bem-vindo ao roiLead! 👋',
    texto: [
      'O roiLead encontra empresas com CNPJ ativo para você prospectar, organiza seus contatos num funil de vendas e ainda traz uma calculadora gratuita da Reforma Tributária.',
      'Em menos de um minuto vamos mostrar onde fica cada coisa. Você pode pular quando quiser.',
    ],
  },
  {
    id: 'busca', alvo: 'menu-busca', area: 'menu', titulo: 'Busca de leads',
    texto: [
      'Aqui você monta a lista de clientes ideais: informe o nicho (palavra-chave), estado, cidade ou DDD, capital social e data de abertura.',
      'Use os filtros para excluir MEI e Simples Nacional, ou trazer só empresas com celular ou e-mail. Depois escolha a quantidade e clique em buscar.',
      'Os resultados ficam no Histórico de Pesquisas por 7 dias. Exporte para planilha para não perder.',
    ],
  },
  {
    id: 'crm', alvo: 'menu-crm', area: 'menu', titulo: 'CRM — seu funil de vendas',
    texto: [
      'Na busca, o botão de enviar ao CRM coloca a empresa na coluna "Novos".',
      'Arraste os cartões entre as etapas (Contatados, Em Negociação, Fechados, Perdidos), renomeie ou crie etapas, e clique para chamar o contato direto no WhatsApp.',
    ],
  },
  {
    id: 'calculadora', alvo: 'menu-calculadora', area: 'menu', titulo: 'Calculadora Tributária (grátis)',
    texto: [
      'Simule CBS, IBS e Imposto Seletivo da Reforma Tributária com o motor oficial e aberto da Receita Federal.',
      'Consulte NCM, NBS, classificações tributárias e alíquotas, e gere o XML do documento fiscal. É gratuita para todos, mesmo sem assinatura.',
    ],
  },
  {
    id: 'cupula', alvo: 'menu-cupula', area: 'menu', titulo: 'Cúpula de Leads (em breve)', opcional: true,
    texto: ['Uma nova forma de receber leads está chegando. Quando for liberada, este item do menu fica ativo.'],
  },
  {
    id: 'assinatura', alvo: 'menu-assinatura', area: 'menu', titulo: 'Assinatura',
    texto: [
      'Veja seu plano, a data de expiração ou assine o Mensal ou o Anual. O Anual tem o melhor custo-benefício e inclui o Agente de IA no WhatsApp.',
      'Você tem 7 dias de garantia: se não gostar, pede o estorno total.',
    ],
  },
  {
    id: 'configuracoes', alvo: 'menu-configuracoes', area: 'menu', titulo: 'Configurações',
    texto: ['Atualize seu nome, e-mail e telefone, e troque sua senha quando precisar.'],
  },
  {
    id: 'agente', alvo: 'cabecalho-agente', area: 'cabecalho', titulo: 'Agente de IA no WhatsApp', opcional: true,
    texto: ['Este selo mostra quando o seu Agente no WhatsApp é liberado. Com ele, você pede leads por mensagem, sem abrir o painel.'],
  },
  {
    id: 'tema', alvo: 'cabecalho-tema', area: 'cabecalho', titulo: 'Tema claro ou escuro',
    texto: ['Troque a aparência do painel quando quiser.'],
  },
  {
    id: 'ajuda', alvo: 'cabecalho-ajuda', area: 'cabecalho', titulo: 'Precisa rever? É aqui',
    texto: [
      'Este botão abre este tutorial de novo a qualquer momento.',
      'Pronto! Comece pela Busca de leads ou experimente a Calculadora Tributária. Bons negócios! 🚀',
    ],
  },
];

const chave = (userId: string) => `roilead:tutorial:v1:${userId}`;

export const tutorialJaVisto = (userId?: string | null) => {
  if (!userId) return true;
  try { return localStorage.getItem(chave(userId)) === 'visto'; } catch { return true; }
};

const marcarVisto = (userId?: string | null) => {
  if (!userId) return;
  try { localStorage.setItem(chave(userId), 'visto'); } catch { /* navegador sem armazenamento */ }
};

interface Props {
  aberto: boolean;
  userId?: string | null;
  onFechar: () => void;
  /** Chamado a cada passo, para o painel abrir/fechar o menu lateral no celular. */
  onArea?: (area: AreaPasso) => void;
}

interface Caixa { top: number; left: number; width: number; height: number }

const MARGEM = 8;

export function TutorialRoilead({ aberto, userId, onFechar, onArea }: Props) {
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [largura, setLargura] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

  // Passos opcionais só entram se o elemento existir na tela.
  const passos = useMemo(() => {
    if (!aberto) return PASSOS_TUTORIAL;
    return PASSOS_TUTORIAL.filter((p) => !p.opcional || !p.alvo || document.querySelector(`[data-tour="${p.alvo}"]`));
  }, [aberto]);

  const passo = passos[Math.min(indice, passos.length - 1)];
  const ultimo = indice >= passos.length - 1;

  useEffect(() => { if (aberto) setIndice(0); }, [aberto]);

  useEffect(() => {
    if (aberto && passo) onArea?.(passo.area);
  }, [aberto, passo, onArea]);

  const medir = useCallback(() => {
    setLargura(window.innerWidth);
    if (!passo?.alvo) { setCaixa(null); return; }
    const el = document.querySelector(`[data-tour="${passo.alvo}"]`) as HTMLElement | null;
    if (!el) { setCaixa(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setCaixa(null); return; }
    setCaixa({ top: r.top - MARGEM / 2, left: r.left - MARGEM / 2, width: r.width + MARGEM, height: r.height + MARGEM });
  }, [passo]);

  // O menu lateral do celular anima ao abrir: mede de novo por alguns instantes.
  useLayoutEffect(() => {
    if (!aberto) return;
    medir();
    const intervalo = window.setInterval(medir, 120);
    const parar = window.setTimeout(() => window.clearInterval(intervalo), 900);
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.clearInterval(intervalo); window.clearTimeout(parar);
      window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true);
    };
  }, [aberto, medir]);

  const concluir = useCallback(() => {
    marcarVisto(userId);
    onFechar();
  }, [userId, onFechar]);

  useEffect(() => {
    if (!aberto) return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') concluir();
      else if (e.key === 'ArrowRight') setIndice((i) => Math.min(i + 1, passos.length - 1));
      else if (e.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [aberto, concluir, passos.length]);

  if (!aberto || !passo) return null;

  const celular = largura < 640;
  const LARGURA_BALAO = 340;
  let estiloBalao: React.CSSProperties;
  if (!caixa || celular) {
    // Centro da tela (boas-vindas) ou, no celular, fixo embaixo para não cobrir o destaque.
    estiloBalao = !caixa
      ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `min(${celular ? '92vw' : '440px'}, 92vw)` }
      : { left: '4vw', right: '4vw', bottom: 16 };
  } else if (passo.area === 'menu' && caixa.left + caixa.width + LARGURA_BALAO + 24 < largura) {
    estiloBalao = { top: Math.max(16, Math.min(caixa.top - 8, window.innerHeight - 320)), left: caixa.left + caixa.width + 16, width: LARGURA_BALAO };
  } else {
    estiloBalao = { top: caixa.top + caixa.height + 12, left: Math.max(16, Math.min(caixa.left + caixa.width - LARGURA_BALAO, largura - LARGURA_BALAO - 16)), width: LARGURA_BALAO };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tutorial do roiLead">
      {caixa ? (
        <div
          className="fixed rounded-xl ring-2 ring-primary transition-all duration-200 pointer-events-none"
          style={{ top: caixa.top, left: caixa.left, width: caixa.width, height: caixa.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      <div className="fixed bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-5" style={estiloBalao}>
        <button type="button" onClick={concluir} aria-label="Fechar tutorial" className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">Passo {indice + 1} de {passos.length}</p>
        <h3 className="text-lg font-bold text-foreground pr-6">{passo.titulo}</h3>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground leading-relaxed">
          {passo.texto.map((t, i) => <p key={i}>{t}</p>)}
        </div>

        <div className="flex gap-1 mt-4">
          {passos.map((p, i) => (
            <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 mt-4">
          <button type="button" onClick={concluir} className="text-sm text-muted-foreground hover:text-foreground">
            {ultimo ? '' : 'Pular tutorial'}
          </button>
          <div className="flex gap-2">
            {indice > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIndice((i) => i - 1)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
            )}
            {ultimo ? (
              <Button size="sm" onClick={concluir} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"><Check className="w-4 h-4 mr-1" />Começar</Button>
            ) : (
              <Button size="sm" onClick={() => setIndice((i) => i + 1)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                {indice === 0 ? 'Mostrar' : 'Próximo'}<ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
