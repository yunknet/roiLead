
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function CompleteRegistration() {
    const [searchParams] = useSearchParams();
    const referenceId = searchParams.get("ref");
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });

    useEffect(() => {
        let ref = referenceId;
        if (!ref) {
            ref = localStorage.getItem("subscription_ref");
            if (ref) {
                // Update URL to include ref for better UX/shareability if needed, or just use it
                // For now, just using it locally
            }
        }

        if (!ref) {
            toast.error("Referência de pagamento não encontrada.");
            return;
        }

        const checkStatus = async () => {
            const { data } = await supabase
                .from('subscriptions')
                .select('payment_status')
                .eq('external_reference_id', ref)
                .single();

            if (data?.payment_status === 'paid') {
                setStatus('paid');
                setLoading(false);
                return true; // Stop polling
            }
            return false;
        };

        // Immediate check
        checkStatus();

        // Poll status
        const interval = setInterval(async () => {
            const stop = await checkStatus();
            if (stop) clearInterval(interval);
        }, 3000);

        return () => clearInterval(interval);
    }, [referenceId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("Você precisa estar logado para finalizar o cadastro.");
                navigate('/login');
                return;
            }

            const updates = {
                id: session.user.id,
                first_name: formData.fullName.split(" ")[0],
                last_name: formData.fullName.split(" ").slice(1).join(" "),
                phone_number: formData.phone,
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(updates);

            if (profileError) {
                throw profileError;
            }

            toast.success("Cadastro concluído com sucesso!");
            navigate('/dashboard');

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao salvar dados.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!referenceId) {
        return <div className="flex items-center justify-center min-h-screen">Link inválido.</div>;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border rounded-xl p-8 shadow-lg">
                {status === 'pending' ? (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold">Aguardando Pagamento</h2>
                        <p className="text-muted-foreground">
                            Estamos aguardando a confirmação do seu pagamento. Assim que confirmado, esta página será atualizada automaticamente.
                        </p>
                        <div className="text-sm bg-secondary/50 p-4 rounded-lg">
                            <p>Referência: {referenceId}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Pagamento Confirmado!</h2>
                            <p className="text-muted-foreground">
                                Por favor, complete seus dados para ativar seu acesso.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    placeholder="João da Silva"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="joao@emplo.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">WhatsApp (com DDD)</Label>
                                <Input
                                    id="phone"
                                    placeholder="11999999999"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    pattern="[0-9]{10,13}"
                                    title="Digite apenas números, incluindo DDD"
                                />
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Finalizar Cadastro
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
