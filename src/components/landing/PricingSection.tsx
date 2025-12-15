import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    description: "Para começar a automatizar",
    price: "197",
    features: [
      "1 número WhatsApp",
      "2.000 mensagens/mês",
      "1 agente de IA",
      "Suporte por email",
      "Métricas básicas",
    ],
    popular: false,
  },
  {
    name: "Professional",
    description: "Para empresas em crescimento",
    price: "497",
    features: [
      "3 números WhatsApp",
      "10.000 mensagens/mês",
      "3 agentes de IA",
      "Suporte prioritário",
      "Métricas avançadas",
      "Webhooks customizados",
      "API de integração",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Para grandes operações",
    price: "997",
    features: [
      "Números ilimitados",
      "Mensagens ilimitadas",
      "Agentes ilimitados",
      "Suporte 24/7",
      "Gerente de conta",
      "SLA garantido",
      "White-label disponível",
      "Treinamento dedicado",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Preços
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Planos para cada etapa do seu negócio
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comece grátis por 7 dias. Sem cartão de crédito necessário.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl transition-all duration-300 ${
                plan.popular
                  ? "bg-gradient-card border-2 border-primary shadow-glow"
                  : "bg-card border border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">R${plan.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/signup">
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  Começar Agora
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
