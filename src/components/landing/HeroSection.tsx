import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Shield, Zap } from "lucide-react";

const HeroSection = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/10 via-transparent to-transparent blur-3xl" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Geração de Leads Inteligente via WhatsApp
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-slide-up">
            Encontre leads qualificados em{" "}
            <span className="text-gradient">segundos</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up px-4" style={{ animationDelay: "0.1s" }}>
            Busque empresas por região e nicho diretamente no seu WhatsApp.
            Receba contatos prontos para prospectar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up px-4" style={{ animationDelay: "0.2s" }}>
            <Link to="/signup">
              <Button
                variant="hero"
                size="xl"
                className="group w-full sm:w-auto"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="heroOutline"
              size="xl"
              className="w-full sm:w-auto"
              onClick={() => scrollToSection("features")}
            >
              Ver como funciona
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 animate-fade-in px-4" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-5 h-5 text-primary" />
              <span className="text-xs sm:text-sm">Busca por região e nicho</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-xs sm:text-sm">Dados atualizados</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-xs sm:text-sm">Resultados em segundos</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-12 sm:mt-20 relative animate-slide-up px-4" style={{ animationDelay: "0.4s" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="glass rounded-2xl p-2 shadow-elevated max-w-5xl mx-auto">
            <div className="bg-card rounded-xl overflow-hidden">
              {/* Mock Dashboard Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>
              {/* Mock Chat Interface */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Sidebar - Hidden on mobile */}
                  <div className="hidden sm:block w-48 bg-secondary rounded-lg p-4 space-y-3">
                    <div className="h-2 w-20 bg-muted rounded" />
                    <div className="space-y-2">
                      <div className="h-8 bg-primary/20 rounded flex items-center px-3">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                        <div className="h-2 w-16 bg-muted rounded" />
                      </div>
                      <div className="h-8 bg-muted/30 rounded flex items-center px-3">
                        <div className="h-2 w-14 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                  {/* Chat Area */}
                  <div className="flex-1 space-y-4">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-primary/20 rounded-lg p-3 max-w-xs sm:max-w-sm">
                        <p className="text-xs sm:text-sm text-foreground">Quero 3 empresas ativas de engenharia civil, localizada em São Paulo, Guarulhos, Belo Horizonte e Campinas. Desejo que esteja aberta entre 24/08/2021 e 24/08/2024, com capital social entre 20 mil e 500 mil, com e-mail e telefone</p>
                      </div>
                    </div>
                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-lg p-3 max-w-md">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">Encontrei 3 empresas de engenharia civil:</p>
                        <div className="space-y-2">
                          <div className="bg-card/50 rounded p-2">
                            <p className="text-xs font-medium text-foreground">Construtora ABC Ltda</p>
                            <p className="text-xs text-muted-foreground">(11) 99999-9999 | contato@abc.com</p>
                          </div>
                          <div className="bg-card/50 rounded p-2">
                            <p className="text-xs font-medium text-foreground">Engenharia XYZ SA</p>
                            <p className="text-xs text-muted-foreground">(31) 88888-8888 | xyz@eng.com</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
