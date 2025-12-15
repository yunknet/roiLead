import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Shield, Zap } from "lucide-react";

const HeroSection = () => {
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
              Plataforma #1 em Automação WhatsApp
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-slide-up">
            Automatize seu WhatsApp com{" "}
            <span className="text-gradient">Inteligência Artificial</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Prospecção, atendimento e qualificação de leads 100% automatizados. 
            Segurança empresarial com isolamento total de dados.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/signup">
              <Button variant="hero" size="xl" className="group">
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="heroOutline" size="xl">
              Ver Demonstração
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm">Dados 100% isolados</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-sm">IA Avançada</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm">Setup em 5 minutos</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 relative animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="glass rounded-2xl p-2 shadow-elevated max-w-5xl mx-auto">
            <div className="bg-card rounded-xl overflow-hidden">
              {/* Mock Dashboard Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>
              {/* Mock Dashboard Content */}
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="w-48 h-full bg-secondary rounded-lg p-4 space-y-3">
                    <div className="h-2 w-20 bg-muted rounded" />
                    <div className="space-y-2">
                      <div className="h-8 bg-primary/20 rounded flex items-center px-3">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                        <div className="h-2 w-16 bg-muted rounded" />
                      </div>
                      <div className="h-8 bg-muted/30 rounded flex items-center px-3">
                        <div className="h-2 w-14 bg-muted rounded" />
                      </div>
                      <div className="h-8 bg-muted/30 rounded flex items-center px-3">
                        <div className="h-2 w-12 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="h-2 w-16 bg-muted rounded mb-2" />
                        <div className="h-6 w-12 bg-primary/30 rounded" />
                      </div>
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="h-2 w-16 bg-muted rounded mb-2" />
                        <div className="h-6 w-14 bg-primary/30 rounded" />
                      </div>
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="h-2 w-16 bg-muted rounded mb-2" />
                        <div className="h-6 w-10 bg-primary/30 rounded" />
                      </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 h-40">
                      <div className="flex items-end gap-2 h-full">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-primary/30 rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
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
