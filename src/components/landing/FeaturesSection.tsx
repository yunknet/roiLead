import { Search, Shield, MessageSquare, MapPin, Zap, Lock, BarChart3, Filter } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Busca Inteligente de Leads",
    description: "Encontre empresas por nicho, região, tamanho e outros critérios diretamente no WhatsApp.",
  },
  {
    icon: MapPin,
    title: "Filtro por Localização",
    description: "Busque leads em cidades, estados ou regiões específicas para prospecção local.",
  },
  {
    icon: Filter,
    title: "Segmentação por Nicho",
    description: "Filtre empresas por setor de atuação: tecnologia, saúde, varejo, indústria e mais.",
  },
  {
    icon: MessageSquare,
    title: "Integração WhatsApp",
    description: "Conecte seu número e receba leads diretamente no chat. Prospecte sem sair do WhatsApp.",
  },
  {
    icon: Shield,
    title: "Dados Verificados",
    description: "Leads com informações atualizadas: telefone, email, endereço e responsável.",
  },
  {
    icon: Zap,
    title: "Resultados Instantâneos",
    description: "Receba listas de leads em segundos. Sem espera, sem processos complicados.",
  },
  {
    icon: BarChart3,
    title: "Histórico de Buscas",
    description: "Acompanhe suas buscas anteriores e leads salvos para organizar sua prospecção.",
  },
  {
    icon: Lock,
    title: "Dados Seguros",
    description: "Suas buscas e contatos são privados. Isolamento total entre clientes.",
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
            Leads qualificados na palma da mão
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para encontrar e prospectar novos clientes de forma eficiente.
          </p>

          <p className="text-foreground mt-4 mb-8">
            Deixa eu te mostrar <span className="font-bold">como funciona</span>. Aperte o Play no vídeo.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] shadow-2xl">
              <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
              <div className="rounded-[2rem] overflow-hidden w-[300px] h-[600px] bg-black relative">
                <video
                  src="/videos/roilead_video.mp4"
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              </div>
            </div>
          </div>
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
    </section >
  );
};

export default FeaturesSection;
