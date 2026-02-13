import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";

const plans = [
  {
    id: "anual",
    name: "Anual",
    description: "Plano completo para o seu negócio",
    price: "67,00",
    period: "/ano",
    features: [
      "Leads ilimitados",
      "Busca por região e nicho",
      "WhatsApp conectado",
      "Filtros avançados",
      "Suporte prioritário",
      "Histórico ilimitado",

      "Acesso imediato"
    ],
    popular: true,
  },
];

const PricingSection = () => {
  // We don't need handleCheckout anymore for the landing page, as we want to register first.
  // Instead, the button will be a Link or we use navigate.

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
              className={`relative p-6 sm:p-8 rounded-2xl transition-all duration-300 ${plan.popular
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

              <Link to={`/signup?plan=${plan.id}`} className="w-full">
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  className="w-full"
                  size="lg"
                // onClick={() => handleCheckout(plan)}
                // disabled={!!loadingPlan}
                >
                  {/* {loadingPlan === plan.name ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} */}
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
