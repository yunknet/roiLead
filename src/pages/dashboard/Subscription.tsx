import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Check, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const plans = [
  { id: 'mensal', name: 'Mensal', description: 'Ideal para testar a plataforma', price: '97,00', period: '/mês', features: ['Leads ilimitados', 'Busca por região e nicho', 'Contato conectado', 'Filtros avançados', 'Histórico ilimitado', 'Acesso imediato'], popular: false },
  { id: 'anual', name: 'Anual', description: 'O melhor custo-benefício.', price: "497,00", period: "/ano",
    installment: "em até 12x de R$ 52,93", savings: 'Economia de 63% — Plano completo com desconto exclusivo', features: ['Leads ilimitados', 'Busca por região e nicho', 'Contato conectado', 'Filtros avançados', 'Suporte prioritário', 'Histórico ilimitado', 'Acesso imediato'], popular: true }
];

export default function Subscription() {
  const navigate = useNavigate();
  const { hasActiveSubscription, activePlanName, expiresAt, userProfile } = useOutletContext<any>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const calculateDaysLeft = (expiryDate: string) => {
    const end = new Date(expiryDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/login');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan: planId, userId: user.id, email: userProfile?.email || user.email } });
      if (error) throw error;
      const paymentUrl = data?.payment_url || data?.url;
      if (!paymentUrl) throw new Error('URL de pagamento não gerada');
      if (data.referenceId) localStorage.setItem('subscription_ref', data.referenceId);
      window.location.href = paymentUrl;
    } catch (error: any) {
      toast.error('Erro ao processar assinatura: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <div><h2 className="text-2xl font-bold text-foreground">Planos e Assinatura</h2><p className="text-muted-foreground">Escolha o melhor plano para o seu negócio.</p></div>
        {hasActiveSubscription ? (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Check className="w-8 h-8 text-primary" /></div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Assinatura Ativa</h3>
              <p className="text-muted-foreground mt-1">Você está no plano <strong>{activePlanName}</strong>. Tudo liberado! 🚀</p>
              {expiresAt && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground" /> Expira em: <span className="text-primary">{new Date(expiresAt).toLocaleDateString()}</span> <span className="text-muted-foreground">({calculateDaysLeft(expiresAt)} dias restantes)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative rounded-2xl border-2 p-6 flex flex-col h-full bg-card/50 transition-colors ${plan.popular ? 'border-primary shadow-lg shadow-primary/10 bg-gradient-to-br from-primary/5 to-transparent' : 'border-border hover:border-primary/50'}`}> 
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">MAIS ESCOLHIDO</span></div>}
                <div className="mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3><p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-foreground">R$ {plan.price}</span><span className="text-muted-foreground font-medium">{plan.period}</span></div>
                  {plan.id === 'anual' && <div className="mt-2 space-y-1"><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{plan.installment}</p><p className="text-xs text-muted-foreground font-medium bg-emerald-500/10 px-2 py-1 rounded w-fit">{plan.savings}</p></div>}
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-center gap-3 text-sm ${plan.id === 'anual' ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center"><Check className="w-3 h-3 text-primary" /></div>{feature}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full mt-auto text-base h-11 transition-all shadow-md ${plan.popular ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] shadow-primary/25 text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`} variant={plan.popular ? 'default' : 'secondary'} disabled={loadingPlan === plan.id} onClick={() => handleSubscribe(plan.id)}>
                    {loadingPlan === plan.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : 'Assinar Agora'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-muted p-6 rounded-xl space-y-4"><h3 className="font-semibold flex items-center gap-2 text-foreground"><ShieldCheck className="w-5 h-5 text-emerald-500" />Garantia Incondicional</h3><p className="text-sm text-muted-foreground leading-relaxed">E se eu não gostar? Não se preocupe! Você tem até <strong>7 dias</strong> para pedir o cancelamento e estorno total do valor, seja no plano Mensal ou Anual. Teste sem riscos.</p></div>
      </div>
    </div>
  );
}
