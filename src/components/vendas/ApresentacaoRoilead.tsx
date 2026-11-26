import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bot, Briefcase, Building2, Calculator, CheckCircle2, Download, Filter, Kanban, Lock, MapPin,
  MessageCircle, Phone, Search, ShieldCheck, Sparkles, Target, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Apresentação do roiLead para quem ainda não assinou.
 * Aparece no lugar das áreas trancadas para explicar o que o sistema faz antes da compra.
 */

const PASSOS = [
  { icone: Target, titulo: '1. Diga quem é o seu cliente', texto: 'Nicho ou palavra-chave, estado, cidade, DDD, capital social e data de abertura.' },
  { icone: Search, titulo: '2. O roiLead minera a base', texto: 'Buscamos nas bases oficiais de CNPJ as empresas ativas que batem com o seu filtro.' },
  { icone: MessageCircle, titulo: '3. Você entra em contato', texto: 'Telefone, WhatsApp e e-mail da empresa prontos para chamar, exportar ou levar ao CRM.' },
];

const FILTROS = [
  'Nicho / palavra-chave (ex.: restaurantes, engenharia, academias)',
  'Estados, cidades e DDDs',
  'Capital social mínimo e máximo',
  'Data de abertura (empresas novas ou mais antigas)',
  'Excluir MEI e Simples Nacional',
  'Somente com celular ou com e-mail',
];

const DADOS_LEAD = [
  { icone: Building2, texto: 'Razão social, nome fantasia, CNPJ, porte e capital social' },
  { icone: MapPin, texto: 'Endereço completo' },
  { icone: Phone, texto: 'Telefones e e-mails da empresa' },
  { icone: Briefcase, texto: 'Atividade principal e secundárias (CNAE)' },
  { icone: Users, texto: 'Quadro societário (sócios)' },
  { icone: ShieldCheck, texto: 'Regime tributário: Simples Nacional e MEI' },
];

const RECURSOS = [
  { icone: MessageCircle, titulo: 'Chamar no WhatsApp', texto: 'Um clique abre a conversa com a empresa.' },
  { icone: Download, titulo: 'Exportar para planilha', texto: 'Leve a lista para o Excel quando quiser.' },
  { icone: Kanban, titulo: 'CRM de vendas', texto: 'Funil com etapas para acompanhar cada negociação.' },
  { icone: Bot, titulo: 'Agente de IA no WhatsApp', texto: 'No plano anual: peça leads por mensagem, sem abrir o painel.' },
];

interface Props {
  /** Título da área que está trancada (ex.: "Busca de leads"). */
  area?: string;
  /** Versão curta, para colocar no fim de outras páginas (ex.: na calculadora). */
  compacto?: boolean;
}

export function ApresentacaoRoilead({ area = 'Busca de leads', compacto = false }: Props) {
  const navigate = useNavigate();
  const verPlanos = () => navigate('/dashboard/subscription');

  if (compacto) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><Sparkles className="w-6 h-6 text-primary" /></div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Além da calculadora, o roiLead encontra clientes para a sua empresa</p>
          <p className="text-sm text-muted-foreground mt-1">Escolha o nicho e a região e receba empresas ativas com telefone, WhatsApp e e-mail para prospectar, com CRM e exportação para planilha.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>Como funciona</Button>
          <Button onClick={verPlanos} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Ver planos<ArrowRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abertura */}
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-10 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground mb-4">
          <Lock className="w-3.5 h-3.5" />{area} disponível nos planos pagos
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground max-w-3xl mx-auto">
          Encontre empresas prontas para comprar de você, com <span className="text-primary">telefone e WhatsApp</span> na mão
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto mt-3">
          O roiLead minera as bases oficiais de CNPJ e entrega listas de empresas ativas do seu nicho e da sua região, para você prospectar hoje mesmo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button size="lg" onClick={verPlanos} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Quero minerar leads<ArrowRight className="w-4 h-4 ml-2" /></Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/dashboard/calculadora-tributaria')}><Calculator className="w-4 h-4 mr-2" />Usar a calculadora grátis</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Receba 30 leads empresariais qualificados em 7 dias ou seu dinheiro de volta · 7 dias de garantia</p>
      </div>

      {/* Como funciona */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <h4 className="font-semibold text-foreground mb-4">Como funciona a mineração de leads</h4>
        <div className="grid gap-4 md:grid-cols-3">
          {PASSOS.map((p) => (
            <div key={p.titulo} className="rounded-lg bg-muted/50 p-4">
              <p.icone className="w-6 h-6 text-primary mb-2" />
              <p className="font-medium text-foreground">{p.titulo}</p>
              <p className="text-sm text-muted-foreground mt-1">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Filtros */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filtros que você pode usar</h4>
          <ul className="space-y-2">
            {FILTROS.map((f) => <li key={f} className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{f}</li>)}
          </ul>
          <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-foreground">
            <b>Exemplo de pedido:</b> "Construtoras em Belo Horizonte, capital acima de R$ 100 mil, que não sejam MEI e tenham celular."
          </div>
        </div>

        {/* O que vem em cada lead */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <h4 className="font-semibold text-foreground mb-3">O que vem em cada empresa encontrada</h4>
          <ul className="space-y-2.5">
            {DADOS_LEAD.map((d) => <li key={d.texto} className="flex gap-2.5 text-sm text-muted-foreground"><d.icone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{d.texto}</li>)}
          </ul>
          {/* Cartão ilustrativo, com dados fictícios e mascarados. */}
          <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-sm relative overflow-hidden" aria-label="Exemplo ilustrativo de lead">
            <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Exemplo ilustrativo</span>
            <p className="font-bold text-primary">CONSTRUTORA EXEMPLO LTDA</p>
            <p className="text-xs text-muted-foreground">CNPJ 12.345.678/0001-•• · Belo Horizonte/MG · Capital R$ 250.000</p>
            <p className="text-xs text-muted-foreground mt-1 select-none blur-[3px]">(31) 9 9999-9999 · contato@exemplo.com.br</p>
            <div className="flex gap-1.5 mt-2">
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded flex items-center gap-1"><MessageCircle className="w-3 h-3" />Chamar</span>
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded">Enviar ao CRM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recursos */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <h4 className="font-semibold text-foreground mb-4">Tudo o que vem junto</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map((r) => (
            <div key={r.titulo}>
              <r.icone className="w-6 h-6 text-primary mb-2" />
              <p className="font-medium text-foreground text-sm">{r.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chamada final */}
      <div className="rounded-xl bg-muted p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <p className="font-semibold text-foreground flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" />Teste sem risco</p>
          <p className="text-sm text-muted-foreground mt-1">Você tem 7 dias para pedir o cancelamento e o estorno total, no plano Mensal ou no Anual.</p>
        </div>
        <Button size="lg" onClick={verPlanos} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Ver planos e assinar<ArrowRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}
