import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const plans = [
    {
        id: "anual",
        name: "Anual",
        description: "Plano completo para o seu negócio",
        price: "69,90",
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
    }
];

const Subscription = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(searchParams.get("plan"));
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (planId: string) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Sessão expirada. Faça login novamente.");
                navigate("/login");
                return;
            }

            console.log("Iniciando checkout para:", planId);

            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    plan: planId,
                    userId: user.id
                }
            });

            if (error) throw error;
            const paymentUrl = data?.payment_url || data?.url;

            if (!paymentUrl) throw new Error("URL de pagamento não gerada");

            if (data.referenceId) {
                localStorage.setItem("subscription_ref", data.referenceId);
            }

            window.location.href = paymentUrl;

        } catch (error: any) {
            console.error("Erro:", error);
            toast.error("Erro ao processar assinatura: " + (error.message || "Erro desconhecido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-5xl space-y-8">
                <div className="flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar para Dashboard
                    </Link>
                </div>

                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold text-foreground">Escolha seu Plano</h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Selecione o plano ideal para continuar encontrando leads qualificados.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`
                                relative p-6 sm:p-8 rounded-xl border-2 transition-all duration-200 bg-card
                                ${selectedPlanId === plan.id || plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border hover:border-primary/50'}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                                    Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </div>

                            <div className="mb-6 flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-foreground">R$ {plan.price}</span>
                                <span className="text-muted-foreground">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" /> {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className="w-full"
                                variant={plan.popular ? "default" : "outline"}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={loading}
                                size="lg"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                {loading ? "Processando..." : (selectedPlanId === plan.id ? "Continuar com " + plan.name : "Assinar " + plan.name)}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Subscription;
