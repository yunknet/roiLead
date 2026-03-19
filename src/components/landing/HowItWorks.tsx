import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden" id="como-funciona">
      <div className="container mx-auto px-4">
        {/* Banner principal simulando a imagem */}
        <div className="flex flex-col lg:flex-row items-center justify-between bg-card rounded-3xl border border-border shadow-sm p-8 md:p-16 mb-20 gap-12 relative overflow-hidden">
          {/* Fundo com gradiente sutil */}
          <div className="absolute top-0 right-0 w-full md:w-2/3 h-full bg-gradient-to-bl from-primary/10 via-background to-transparent pointer-events-none" />

          <div className="flex-1 space-y-6 md:space-y-8 z-10 max-w-2xl relative">
            <span className="inline-block px-5 py-2 bg-foreground text-background text-sm font-semibold rounded-full shadow-lg">
              Feito para o seu negócio
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-[64px] font-extrabold tracking-tight text-foreground leading-[1.05]">
              Leve sua prospecção para o próximo nível.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl font-medium">
              Mais precisão, menos retrabalho. Encontre contatos de empresários reais para prospecção direta, e entregue uma abordagem estratégica usando nossa IA para aumentar suas vendas.
            </p>
            <div className="pt-4">
              <a href="#pricing" className="inline-flex items-center justify-center rounded-2xl bg-foreground text-background hover:bg-foreground/90 px-8 py-4 text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-xl">
                Começar agora <ArrowUpRight className="ml-2 w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="relative w-full aspect-square max-w-[500px] items-center justify-center z-10 hidden md:flex flex-1">
             {/* Círculos concêntricos */}
            <div className="absolute inset-0 rounded-full border border-dashed border-border/40 animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-10 rounded-full border border-dashed border-border/50 animate-[spin_30s_linear_infinite_reverse]" />
            <div className="absolute inset-20 rounded-full border border-dashed border-border/60 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-32 rounded-full border border-dashed border-primary/30 animate-[spin_15s_linear_infinite_reverse]" />
            
            {/* Ícones flutuantes distribuídos em diferentes órbitas */}
            {/* Órbita externa */}
            <div className="absolute inset-0 animate-[spin_40s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg animate-[spin_40s_linear_infinite_reverse]">
                <span className="text-emerald-600 font-bold text-[10px]">B2B</span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg animate-[spin_40s_linear_infinite_reverse]">
                <span className="text-foreground font-bold text-[10px]">WhatsApp</span>
              </div>
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center shadow-lg animate-[spin_40s_linear_infinite_reverse]">
                <span className="text-emerald-500 font-bold text-[10px]">ROI</span>
              </div>
            </div>

            {/* Órbita intermediária */}
            <div className="absolute inset-10 animate-[spin_30s_linear_infinite_reverse]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-lg animate-[spin_30s_linear_infinite]">
                <span className="text-blue-600 font-bold text-[10px]">Leads</span>
              </div>
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shadow-lg animate-[spin_30s_linear_infinite]">
                <span className="text-indigo-600 font-bold text-[10px]">CNPJ</span>
              </div>
            </div>

            {/* Órbita interna */}
            <div className="absolute inset-20 animate-[spin_20s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shadow-lg animate-[spin_20s_linear_infinite_reverse]">
                <span className="text-purple-600 font-bold text-[10px]">IA</span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shadow-lg animate-[spin_20s_linear_infinite_reverse]">
                <span className="text-amber-600 font-bold text-[10px]">CRM</span>
              </div>
            </div>
            
            {/* Círculo central gradiante com Logo */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-white dark:bg-card flex flex-col items-center justify-center shadow-[0_0_80px_-15px_rgba(16,185,129,0.3)] z-20 border border-border">
              <div className="flex items-center text-3xl md:text-4xl font-normal tracking-tighter transition-transform hover:scale-110 duration-300" style={{ fontFamily: "'Varela Round', sans-serif" }}>
                <span style={{ color: '#81BB3D' }}>roi</span>
                <span className="text-[#2D3E50] dark:text-white">Lead</span>
              </div>
              <div className="mt-2 h-1 w-12 bg-primary rounded-full animate-pulse" />
              <span className="mt-2 font-medium text-xs md:text-sm text-muted-foreground tracking-widest uppercase">Inteligente</span>
            </div>
          </div>
        </div>

        {/* Textos explicativos */}
        <div className="max-w-4xl mx-auto space-y-10 text-lg text-muted-foreground leading-relaxed">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              Como o 
              <span className="flex items-center text-4xl md:text-6xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
                <span style={{ color: '#81BB3D' }}>roi</span>
                <span className="text-[#2D3E50] dark:text-white">Lead</span>
              </span> 
              ajuda sua empresa
            </h3>
            <div className="h-1.5 w-24 bg-primary mx-auto mt-6 rounded-full" />
          </div>
          
          <div className="bg-card/50 p-6 md:p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="text-primary w-6 h-6" /> O que é o roiLead
            </h4>
            <p>
              Somos uma plataforma especializada em entregar contatos de empresários reais — com CNPJ ativo e faixa de capital definida — para que a sua equipe realize uma prospecção direta, assertiva e livre de intermediários. Abandonamos o conceito ultrapassado de listas frias ou banco de dados vendidos no mercado. Todos os nossos leads são extraídos de dados públicos atualizados e verificados, garantindo que você esteja conversando diretamente com o tomador de decisão certo.
            </p>
          </div>

          <div className="bg-card/50 p-6 md:p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="text-primary w-6 h-6" /> Como funciona na prática
            </h4>
            <p>
              O processo é desenhado para ser tão simples quanto enviar uma mensagem. O usuário assina a plataforma diretamente pelo site e tem o seu acesso liberado automaticamente via WhatsApp. A partir daí, basta solicitar os leads desejados diretamente no seu canal do WhatsApp. Por exemplo, você pode digitar: <em className="text-foreground font-medium">"Quero 30 médicos em São Paulo, capital de 1 milhão a 5 milhões"</em> ou <em className="text-foreground font-medium">"Busco 30 empresas do agronegócio com capital de 100 mil a 900 mil em Goiás"</em>.
            </p>
          </div>

          <div className="bg-card/50 p-6 md:p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="text-primary w-6 h-6" /> Organização e Controle no Dashboard
            </h4>
            <p>
              Toda a gestão é centralizada, armazenada e estruturada no seu <a href="https://roilead.com.br/dashboard" className="text-primary font-semibold hover:underline">Dashboard exclusivo</a>. Lá, no modo de visualização completa, você acessa absolutamente todas as informações do CNPJ, incluindo os nomes e as idades dos empresários presentes no quadro societário, o que eleva exponencialmente a capacidade de criar uma abordagem próxima e infalível.
            </p>
          </div>

          <div className="bg-card/50 p-6 md:p-8 rounded-2xl border border-border shadow-sm space-y-4">
            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="text-primary w-6 h-6" /> Atendimento Impecável com IA
            </h4>
            <p>
              Para revolucionar a forma como você aborda seus prospects, nós integramos um poderoso <strong className="text-foreground">Agente de Inteligência Artificial</strong> diretamente na plataforma. Caso o cliente responda e você não esteja online, esse agente responde e qualifica o Lead automaticamente, com total naturalidade. O sistema evita aqueles "erros de mensagens automáticas" de robôs engessados, garantindo um filtro preciso de qualificação e um atendimento que impressionará desde o primeiro momento.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
