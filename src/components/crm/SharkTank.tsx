import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Waves, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const NICHES = ['Consórcio', 'Seguros', 'Plano de Saúde'] as const;
type Niche = typeof NICHES[number];
type SharkStatus = 'novos' | 'contatados' | 'negociacao' | 'fechados' | 'perdidos';

interface SharkLead {
    id: string;
    niche: Niche;
    name: string;
    phone: string;
    notes: string | null;
    status: SharkStatus;
    owner_id: string | null;
    created_at: string;
    claimed_at: string | null;
}

export function SharkTank() {
    const [view, setView] = useState<'selection' | 'board'>('selection');
    const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
    const [leads, setLeads] = useState<SharkLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
            fetchLeads();
        };

        init();

        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shark_tank_leads' },
                () => {
                    fetchLeads();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('shark_tank_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data as SharkLead[]);
        } catch (error: any) {
            console.error("Erro ao puxar leads do Shark Tank:", error);
            toast.error("Erro ao recarregar o tanque.");
        } finally {
            setLoading(false);
        }
    };

    const handleClaimLead = async (leadId: string) => {
        try {
            const { error } = await supabase.rpc('claim_shark_lead', { target_lead_id: leadId });

            if (error) {
                console.error("Erro no RPC claim_shark_lead:", error);
                toast.error(error.message || "Erro desconhecido ao pegar o lead.");
            } else {
                toast.success("Lead fisgado com sucesso!");
                fetchLeads();
            }
        } catch (err: any) {
            let msg = err.message || "Erro";
            toast.error(msg);
        }
    };

    const handleChat = (lead: SharkLead) => {
        if (!currentUserId || lead.owner_id !== currentUserId) {
            toast.error("Este lead não é seu.");
            return;
        }

        let cleanPhone = lead.phone.replace(/\D/g, "");
        if (cleanPhone.length <= 11) {
            cleanPhone = `55${cleanPhone}`;
        }
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const [loadingAccess, setLoadingAccess] = useState(false);

    const handleSelectNiche = async (niche: Niche) => {
        setLoadingAccess(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sub, error } = await supabase
                .from('subscriptions')
                .select('plan_name, subscription_status, payment_status, expires_at')
                .ilike('email', user.email || '')
                .ilike('plan_name', `%Shark Tank%`)
                .ilike('plan_name', `%${niche}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const isTimeValid = sub?.expires_at ? new Date(sub.expires_at) > new Date() : true;
            const hasAccess = sub && isTimeValid && (
                sub.subscription_status === 'active' ||
                sub.payment_status?.toUpperCase() === 'PAID' ||
                sub.subscription_status?.toLowerCase() === 'paid'
            );

            if (hasAccess) {
                setSelectedNiche(niche);
                setView('board');
                fetchLeads();
            } else {
                toast.error(`Acesso Negado: Para pescar leads de ${niche}, você precisa adquirir este nicho.`);
            }
        } catch (err: any) {
            console.error("Erro ao verificar assinatura:", err);
            toast.error("Erro ao validar acesso.");
        } finally {
            setLoadingAccess(false);
        }
    };


    const filteredLeads = leads.filter(l => l.niche === selectedNiche);

    const columns: { id: SharkStatus; title: string; color: string }[] = [
        { id: 'novos', title: 'Novos 🐟', color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
        { id: 'contatados', title: 'Contatados 💬', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' },
        { id: 'negociacao', title: 'Negociação 🤝', color: 'bg-purple-500/10 border-purple-500/20 text-purple-500' },
        { id: 'fechados', title: 'Fechados ✅', color: 'bg-green-500/10 border-green-500/20 text-green-500' },
        { id: 'perdidos', title: 'Perdidos ❌', color: 'bg-red-500/10 border-red-500/20 text-red-500' },
    ];

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (view === 'selection') {
        return (
            <div className="flex flex-col h-full bg-background p-6 text-foreground overflow-y-auto w-full">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold flex items-center justify-center gap-3 mb-4">
                        <Waves className="w-8 h-8 text-blue-500" />
                        Shark Tank
                    </h2>
                    <p className="text-muted-foreground">
                        Selecione o nicho que você contratou para acessar o tanque de disputa e pescar novos leads de tráfego pago.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                    {NICHES.map(niche => (
                        <div
                            key={niche}
                            className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-6 hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
                            onClick={() => handleSelectNiche(niche)}
                        >
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Waves className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">{niche}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Acesse o tanque de {niche.toLowerCase()} e dispute leads qualificados em tempo real.
                                </p>
                            </div>
                            <Button className="w-full font-bold" disabled={loadingAccess}>
                                {loadingAccess ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Acessar Tanque"}
                            </Button>

                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background p-4 sm:p-6 text-foreground overflow-hidden w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="text-muted-foreground hover:text-foreground p-0 h-auto">
                            ← Trocar Nicho
                        </Button>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Waves className="w-6 h-6 text-blue-500" />
                            Tanque de {selectedNiche}
                        </h2>
                    </div>
                    <p className="text-muted-foreground text-sm ml-0 sm:ml-10">
                        Dispute os leads enviados por tráfego pago. Restam {50 - filteredLeads.filter(l => l.owner_id).length} vagas de prospecção.
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden w-full pb-4 items-start">
                {columns.map(col => {
                    const colLeads = filteredLeads.filter(l => l.status === col.id);
                    return (
                        <div key={col.id} className="flex-shrink-0 w-72 sm:w-80 h-full flex flex-col bg-card/50 border border-border rounded-xl">
                            <div className={`p-4 border-b ${col.color} border-x-0 border-t-0 font-semibold flex items-center justify-between shadow-sm bg-opacity-50`}>
                                <span>{col.title}</span>
                                <span className="bg-background/50 text-foreground px-2 py-0.5 rounded-full text-xs">
                                    {colLeads.length}
                                </span>
                            </div>

                            <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col custom-scrollbar">
                                {colLeads.map(lead => {
                                    const isMine = currentUserId && lead.owner_id === currentUserId;

                                    return (
                                        <div key={lead.id} className="bg-background p-4 rounded-lg shadow-sm border border-border hover:border-primary/50 transition-colors flex flex-col gap-3">
                                            <div className="font-medium text-foreground text-sm truncate">
                                                {lead.name}
                                            </div>

                                            {col.id === 'novos' ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted p-1.5 rounded w-fit">
                                                        <Lock className="w-3 h-3" /> Número Oculto
                                                    </div>
                                                    <Button onClick={() => handleClaimLead(lead.id)} size="sm" className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                                        🎣 Pescar Lead
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {isMine ? (
                                                        <div className="text-sm font-mono bg-primary/10 text-primary p-2 rounded text-center">
                                                            {lead.phone}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded text-center truncate">
                                                            🔒 Fisgado por outro tubarão
                                                        </div>
                                                    )}

                                                    {isMine && col.id === 'contatados' && (
                                                        <Button onClick={() => handleChat(lead)} size="sm" variant="outline" className="w-full border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10">
                                                            WhatsApp
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {colLeads.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center p-4">
                                        <p className="text-muted-foreground text-sm text-center">Nenhum lead aqui</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
