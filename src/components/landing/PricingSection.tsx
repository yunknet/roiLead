import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Mensal",
    description: "Pagamento mensal flexível",
    price: "59,90",
    period: "/mês",
    features: [
      "Leads ilimitados",
      "Busca por região",
      "Busca por nicho",
      "WhatsApp conectado",
      "Suporte por email",
      "Cancele quando quiser",
    ],
    popular: false,
  },
  {
    name: "Anual",
    description: "Melhor custo-benefício",
    price: "39,90",
    period: "/mês",
    originalPrice: "59,90",
    savings: "Economize R$ 240/ano",
    features: [
      "Tudo do plano Mensal",
      "Leads ilimitados",
      "Filtros avançados",
      "Suporte prioritário",
      "Histórico ilimitado",
      "Agente IA personalizado para atender leads",
    ],
    popular: true,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Preços
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Invista em leads que convertem
          </h2>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-6 sm:p-8 rounded-2xl transition-all duration-300 ${
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

              {plan.savings && (
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                    {plan.savings}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through mr-2">R${plan.originalPrice}</span>
                )}
                <span className="text-4xl font-bold text-foreground">R${plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
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
