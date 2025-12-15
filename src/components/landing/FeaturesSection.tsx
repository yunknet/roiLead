import { Bot, Shield, MessageSquare, Users, Zap, Lock, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Agentes de IA Inteligentes",
    description: "Múltiplos agentes especializados: prospecção, atendimento e qualificação trabalhando 24/7.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Isolado",
    description: "Cada cliente possui dados completamente isolados. Nenhuma informação é compartilhada entre tenants.",
  },
  {
    icon: MessageSquare,
    title: "Orquestrador Central",
    description: "Todas as mensagens passam por um orquestrador que decide qual agente responde e quando.",
  },
  {
    icon: Lock,
    title: "Segurança Empresarial",
    description: "Criptografia em repouso, tokens com expiração, rate limiting e proteção contra brute force.",
  },
  {
    icon: Users,
    title: "Gestão de Conversas",
    description: "Contexto e histórico por telefone, agrupamento de mensagens e controle de timeout inteligente.",
  },
  {
    icon: Zap,
    title: "WhatsApp Dedicado",
    description: "Cada cliente conecta seu próprio número com instância dedicada e QR Code exclusivo.",
  },
  {
    icon: BarChart3,
    title: "Métricas em Tempo Real",
    description: "Acompanhe conversões, mensagens enviadas, taxa de resposta e performance dos agentes.",
  },
  {
    icon: Clock,
    title: "Anti-Spam Inteligente",
    description: "Proteção contra loops, reenvio indevido, opt-out automático e controle de números bloqueados.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Recursos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Tudo que você precisa para escalar
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para automatizar seu WhatsApp com segurança e inteligência artificial.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-gradient-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow/20"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
