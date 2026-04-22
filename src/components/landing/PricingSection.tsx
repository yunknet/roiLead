import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";

const plans = [
  {
    id: "mensal",
    name: "Mensal",
    description: "Ideal para testar a plataforma",
    price: "97,00",
    period: "/mês",
    features: [
      "Leads ilimitados",
      "Busca por região e nicho",
      "WhatsApp conectado",
      "Filtros avançados",
      "Histórico ilimitado",
      "Acesso imediato"
    ],
    popular: false,
  },
  {
    id: "anual",
    name: "Anual",
    description: "O melhor custo-benefício.",
    price: "36,00",
    period: "/mês",
    installment: "12x R$ 36,00",
    savings: "Economia de 63% — Plano completo com desconto exclusivo",
    features: [
      "Leads ilimitados",
      "Busca por região e nicho",
      "WhatsApp conectado",
      "Filtros avançados",
      "Suporte prioritário",
      "Histórico ilimitado",
      "Acesso imediato",
      <strong>300 Créditos Grátis no Agente de IA 🎁</strong>
    ],
    popular: true,
  },
];

const PricingSection = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (plan: typeof plans[0]) => {
    try {
      setLoadingPlan(plan.name);

      const { data: { user } } = await supabase.auth.getUser();

      console.log("🛒 Iniciando checkout para:", plan.id);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: plan.id,
          userId: user?.id,
          email: user?.email
        }
      });

      if (error) throw error;
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("Link de pagamento não recebido.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao gerar checkout: " + (error.message || "Tente novamente."));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Receba 30 leads empresariais <span className="text-gradient">qualificados</span> em 7 dias ou seu dinheiro de volta
          </h2>
          <span className="text-primary text-base sm:text-lg font-bold uppercase tracking-widest">
            Preços
          </span>
        </div>

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
                  <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    Mais Vantajoso
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">R$ {plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                {plan.installment && (
                  <p className="text-sm font-medium text-foreground mt-1">{plan.installment}</p>
                )}
                {plan.savings && (
                  <p className="text-xs text-primary font-medium mt-2">{plan.savings}</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className={plan.id === 'anual' ? "text-foreground font-bold" : "text-muted-foreground"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                size="lg"
                onClick={() => handleCheckout(plan)}
                disabled={!!loadingPlan}
              >
                {loadingPlan === plan.name ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Começar Agora
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
