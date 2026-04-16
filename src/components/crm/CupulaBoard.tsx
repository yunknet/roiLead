import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Waves, UserPlus, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const NICHES = ['Consórcio'] as const;
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

export function CupulaBoard() {
    const [view, setView] = useState<'selection' | 'board'>('selection');
    const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [leads, setLeads] = useState<SharkLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loadingAccess, setLoadingAccess] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [turnInfo, setTurnInfo] = useState<any>(null);
    const [clockOffset, setClockOffset] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (ms: number) => {
        const secs = Math.ceil(ms / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate dynamically for deterministic per-lead queue logic
    const unclaimedLeads = leads
        .filter(l => l.status === 'novos' && !l.owner_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const getLeadOwnership = (leadId: string) => {
        if (!turnInfo || !turnInfo.active_users || turnInfo.active_users.length === 0) return null;
        
        const leadIndex = unclaimedLeads.findIndex(l => l.id === leadId);
        if (leadIndex === -1) return null;

        const lead = unclaimedLeads[leadIndex];
        
        // Puffer de 10s para garantir que o timer comece a ticar imediatamente
        const serverTimestamp = currentTime - (clockOffset || 0) + 10000;
        let elapsedSec = (serverTimestamp - new Date(lead.created_at).getTime()) / 1000;
        
        if (elapsedSec < 0) elapsedSec = 0;

        const _active = turnInfo.active_users;
        const TURN_DURATION = 180; // 3 minutos
        
        const skips = Math.floor(elapsedSec / TURN_DURATION);
        const ownerIndex = (turnInfo.base_turn_index + leadIndex + skips) % _active.length;
        const owner = _active[ownerIndex];

        const timeLeftMs = Math.max(0, (TURN_DURATION - (elapsedSec % TURN_DURATION)) * 1000);

        const currentUserIndex = _active.findIndex((u: any) => u.user_id === currentUserId);
        
        let position = 0;
        if (currentUserIndex !== -1) {
            position = (currentUserIndex - ownerIndex + _active.length) % _active.length + 1;
        }

        return {
            owner_id: owner.user_id,
            owner_name: owner.name,
            timeLeftMs,
            total_active: _active.length,
            my_position: position
        };
    };

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
                { event: '*', schema: 'public', table: 'cupula_leads' },
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
                .from('cupula_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data as SharkLead[]);

            // Busca de quem é a vez na fila via Edge Function
            const { data: queueData, error: queueErr } = await supabase.functions.invoke('cupula-queue');
            if (!queueErr && queueData) {
                setTurnInfo(queueData);
                if (queueData.server_now) {
                    setClockOffset(Date.now() - queueData.server_now);
                }
            }
        } catch (error: any) {
            console.error("Erro ao puxar leads da Cúpula:", error);
            toast.error("Erro ao recarregar a cúpula.");
        } finally {
            setLoading(false);
        }
    };

    const handleClaimLead = async (leadId: string) => {
        try {
            const { error } = await supabase.rpc('claim_cupula_lead', { target_lead_id: leadId });

            if (error) {
                console.error("Erro no RPC claim_cupula_lead:", error);
                toast.error(error.message || "Erro desconhecido ao pegar o lead.");
            } else {
                toast.success("Lead capturado com sucesso!");
                fetchLeads();
            }
        } catch (err: any) {
            let msg = err.message || "Erro";
            toast.error(msg);
        }
    };

    const handleStatusChange = async (leadId: string, newStatus: SharkStatus) => {
        try {
            const { error } = await supabase
                .from('cupula_leads')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', leadId)
                .eq('owner_id', currentUserId); // Segurança redobrada: só muda se for o dono

            if (error) {
                console.error("Erro ao mudar status:", error);
                throw error;
            }
            toast.success("Lead movido com sucesso!");
            fetchLeads();
        } catch (error: any) {
            toast.error("Erro ao mover o lead. Sem permissão ou falha de conexão.");
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

    const handleCheckoutClick = async () => {
        setLoadingCheckout(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-cupula-link');
            if (error) throw error;
            if (data?.link) {
                window.open(data.link, "_blank");
            } else {
                toast.error("Link de checkout não configurado.");
            }
        } catch (error) {
            console.error("Erro ao pegar link da Hubla:", error);
            toast.error("Erro ao redirecionar para o pagamento.");
        } finally {
            setLoadingCheckout(false);
        }
    };

    const handleSelectNiche = async (niche: Niche) => {
        setLoadingAccess(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // NOVA REGRA: O acesso ao Shark Tank não tem vínculo com a tabela subscriptions.
            // Para testar, verificaremos se o usuário tem o access_status = 'SHARK_PAID' (apenas um exemplo)
            // ou se ele existe na tabela shark_tank_users (que gerenciará isso no futuro).
            // COMO O BANCO NÃO PODE SER ALTERADO AGORA, simularemos o bloqueio (isPaid = false).
            let isPaid = false; 

            // Tenta buscar de uma tabela dedicada (que será criada depois pelo webhook)
            try {
                const { data: sharkUser, error: sharkErr } = await supabase
                    .from('cupula_access')
                    .select('status')
                    .eq('email', user.email)
                    .maybeSingle();
                
                if (sharkUser?.status === 'active') {
                    isPaid = true;
                }
            } catch (ignore) {
                // Tabela não existe ainda, isPaid continua false
            }

            if (isPaid) {
                setSelectedNiche(niche);
                setView('board');
                fetchLeads();
            } else {
                // Ao invés de travar com toast de erro, abrimos o Modal Bonitão chamando pra assinar!
                setShowPaymentModal(true);
            }
        } catch (err: any) {
            console.error("Erro ao verificar assinatura do Shark Tank:", err);
            toast.error("Erro ao validar acesso.");
        } finally {
            setLoadingAccess(false);
        }
    };


    const filteredLeads = leads.filter(l => l.niche === selectedNiche);

    const columns: { id: SharkStatus; title: string; color: string }[] = [
        { id: 'novos', title: 'Novos', color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
        { id: 'contatados', title: 'Contatados', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' },
        { id: 'negociacao', title: 'Negociação', color: 'bg-purple-500/10 border-purple-500/20 text-purple-500' },
        { id: 'fechados', title: 'Fechados', color: 'bg-green-500/10 border-green-500/20 text-green-500' },
        { id: 'perdidos', title: 'Perdidos', color: 'bg-red-500/10 border-red-500/20 text-red-500' },
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
                        <img src="/cupula-icon.png" alt="Cúpula" className="w-12 h-12 object-contain dark:hidden" />
                        <img src="/cupula-icon-dark.png" alt="Cúpula" className="w-12 h-12 object-contain hidden dark:block" />
                        Cúpula de Leads
                    </h2>
                    <p className="text-muted-foreground">
                        Selecione o nicho que você contratou para acessar a cúpula e capturar novos leads de tráfego pago.
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
                                <img src="/cupula-icon.png" alt="Cúpula" className="w-10 h-10 object-contain dark:hidden" />
                                <img src="/cupula-icon-dark.png" alt="Cúpula" className="w-10 h-10 object-contain hidden dark:block" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">{niche}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Acesse a cúpula de {niche.toLowerCase()} e capte leads qualificados em tempo real.
                                </p>
                            </div>
                            <Button className="w-full font-bold" disabled={loadingAccess}>
                                {loadingAccess ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Acessar Cúpula"}
                            </Button>

                        </div>
                    ))}
                </div>

                <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl text-blue-500">
                                <Waves className="w-6 h-6" />
                                Acesso Restrito
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                Para capturar e bater papo com os leads milionários da Cúpula de Leads de <b>Consórcio</b>, você precisa assinar o módulo exclusivo.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex flex-col gap-4 py-4">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-foreground space-y-2">
                                <p className="font-semibold text-blue-600 dark:text-blue-400">🎯 O que você ganha?</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li>Acesso ao board de leads de tráfego pago em tempo real.</li>
                                    <li>Direito a capturar e ser o dono exclusivo de dezenas de leads.</li>
                                    <li>Funil de vendas e atalhos direto para o WhatsApp.</li>
                                </ul>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                                Agora não
                            </Button>
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                disabled={loadingCheckout}
                                onClick={handleCheckoutClick}
                            >
                                {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Assinar Cúpula de Leads Hubla
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                            Cúpula de {selectedNiche}
                        </h2>
                    </div>
                    <p className="text-muted-foreground text-sm ml-0 sm:ml-10">
                        Dispute os leads enviados por tráfego pago.
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden w-full pb-4 items-start">
                {columns.map(col => {
                    const colLeads = filteredLeads.filter(l => l.status === col.id);
                    const canDrop = col.id !== 'novos';

                    const handleDragOver = (e: React.DragEvent) => {
                        if (canDrop) e.preventDefault();
                    };

                    const handleDrop = (e: React.DragEvent) => {
                        e.preventDefault();
                        if (!canDrop) return;
                        const leadId = e.dataTransfer.getData('leadId');
                        if (leadId) {
                            handleStatusChange(leadId, col.id);
                        }
                    };

                    return (
                        <div 
                            key={col.id} 
                            className="flex-shrink-0 w-72 sm:w-80 h-full flex flex-col bg-card/50 border border-border rounded-xl"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
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
                                        <div 
                                            key={lead.id} 
                                            draggable={isMine && col.id !== 'novos'}
                                            onDragStart={(e) => {
                                                if (isMine && col.id !== 'novos') {
                                                    e.dataTransfer.setData('leadId', lead.id);
                                                }
                                            }}
                                            className={`bg-background p-4 rounded-lg shadow-sm border border-border hover:border-primary/50 transition-colors flex flex-col gap-3 ${(isMine && col.id !== 'novos') ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        >
                                            <div className="font-medium text-foreground text-sm truncate">
                                                {lead.name}
                                            </div>

                                            {col.id === 'novos' ? (() => {
                                                const ownership = getLeadOwnership(lead.id);
                                                const isMyTurnForThisLead = ownership?.owner_id === currentUserId;
                                                
                                                return (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted p-1.5 rounded w-fit">
                                                        <Lock className="w-3 h-3" /> Número Oculto
                                                    </div>
                                                    
                                                    {ownership && (
                                                        <div className={`text-center font-bold px-3 py-2.5 rounded-lg border shadow-sm flex flex-col items-center gap-0.5 mt-1 mb-2 ${isMyTurnForThisLead ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400' : 'bg-muted/80 text-muted-foreground border-border/50'}`}>
                                                            <span className="text-[10px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">Status da Fila</span>
                                                            <span className="text-sm">
                                                                {isMyTurnForThisLead ? `🎯 Sua vez, ${ownership.owner_name}!` : `⏳ Vez dele(a): ${ownership.owner_name}`}
                                                            </span>
                                                            {ownership.timeLeftMs > 0 && (
                                                                <span className="text-xs flex items-center justify-center gap-1 mt-1 opacity-90 px-2 py-0.5 rounded-full bg-background border border-foreground/10">
                                                                    <Clock className="w-3 h-3" /> Expira em {formatTime(ownership.timeLeftMs)}
                                                                </span>
                                                            )}
                                                            {!isMyTurnForThisLead && (
                                                                <span className="text-xs mt-1.5 border-t border-border/60 pt-1 w-full opacity-80 text-center font-medium">
                                                                    {ownership.total_active} ativos. Sua vez será a {ownership.my_position}ª
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {!isMyTurnForThisLead ? (
                                                        <Button disabled size="sm" className="w-full font-bold bg-muted text-muted-foreground shadow-none">
                                                            ⏳ Aguardando...
                                                        </Button>
                                                    ) : (
                                                        <Button onClick={() => handleClaimLead(lead.id)} size="sm" className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                                            🎯 Capturar Lead
                                                        </Button>
                                                    )}
                                                </div>
                                            )})() : (
                                                <div className="flex flex-col gap-3">
                                                    {isMine ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="text-sm font-mono bg-primary/10 text-primary p-2 rounded text-center">
                                                                {lead.phone}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded text-center truncate">
                                                            🔒 Capturado por outro membro
                                                        </div>
                                                    )}

                                                    {isMine && (
                                                        <Button onClick={() => handleChat(lead)} size="sm" variant="outline" className="w-full border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 mt-1">
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
