import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Waves, UserPlus, Lock, Clock, Trash2, Edit2, Check, X, Bell, Volume2, VolumeX } from "lucide-react";
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

// ============ COMPONENTE DE TIMER INDEPENDENTE ============
function LeadQueueCard({ 
    lead, 
    turnInfo, 
    clockOffset, 
    currentUserId, 
    unclaimedLeads,
    onClaim,
    playNotification 
}: { 
    lead: SharkLead;
    turnInfo: any;
    clockOffset: number;
    currentUserId: string | null;
    unclaimedLeads: SharkLead[];
    onClaim: (id: string) => void;
    playNotification: () => void;
}) {
    const [tickVal, setTickVal] = useState(0);
    const notifiedRef = useRef(false);

    // Cada card tem seu PRÓPRIO setInterval — 100% independente
    useEffect(() => {
        const interval = setInterval(() => setTickVal(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Calcula a cada render (forçado pelo tick)
    // Supabase retorna timestamps com offset do fuso (-03:00), mas o valor É UTC.
    // Forçamos parsing como UTC trocando qualquer offset por 'Z'.
    const rawTs = lead.created_at.replace(/[+-]\d{2}:\d{2}$/, 'Z');
    const createdAtMs = new Date(rawTs).getTime();
    const nowMs = Date.now();
    const serverNow = nowMs - clockOffset;
    let elapsedSec = (serverNow - createdAtMs) / 1000;
    if (elapsedSec < 0) elapsedSec = 0;

    const TURN_DURATION = 180;
    const secondsIntoTurn = elapsedSec % TURN_DURATION;
    const timeLeftSec = Math.max(0, Math.floor(TURN_DURATION - secondsIntoTurn));

    let ownership: any = null;
    if (turnInfo?.active_users?.length) {
        const leadIndex = unclaimedLeads.findIndex(l => l.id === lead.id);
        if (leadIndex !== -1) {
            const _active = turnInfo.active_users;
            const skips = Math.floor(elapsedSec / TURN_DURATION);
            const ownerIndex = (turnInfo.base_turn_index + leadIndex + skips) % _active.length;
            const owner = _active[ownerIndex];

            const currentUserIndex = _active.findIndex((u: any) => u.user_id === currentUserId);
            let position = 0;
            if (currentUserIndex !== -1) {
                position = (currentUserIndex - ownerIndex + _active.length) % _active.length + 1;
            }

            ownership = {
                owner_id: owner.user_id,
                owner_name: owner.name,
                timeLeftSec,
                total_active: _active.length,
                my_position: position
            };
        }
    }

    const isMyTurn = ownership?.owner_id === currentUserId;

    useEffect(() => {
        if (isMyTurn && !notifiedRef.current) { playNotification(); notifiedRef.current = true; }
        if (!isMyTurn) notifiedRef.current = false;
    }, [isMyTurn]);

    const m = Math.floor(timeLeftSec / 60);
    const s = timeLeftSec % 60;
    const timerStr = `${m}:${s.toString().padStart(2, '0')}`;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted p-1.5 rounded w-fit">
                <Lock className="w-3 h-3" /> Número Oculto
            </div>
            
            {ownership && (
                <div className={`text-center font-bold px-3 py-2.5 rounded-lg border shadow-sm flex flex-col items-center gap-0.5 mt-1 mb-2 ${isMyTurn ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400' : 'bg-muted/80 text-muted-foreground border-border/50'}`}>
                    <span className="text-[10px] uppercase tracking-wider opacity-70 font-semibold mb-0.5">Status da Fila</span>
                    <span className="text-sm">
                        {isMyTurn ? `🎯 Sua vez, ${ownership.owner_name}!` : `⏳ Vez dele(a): ${ownership.owner_name}`}
                    </span>
                    <span className="text-xs flex items-center justify-center gap-1 mt-1 opacity-90 px-2 py-0.5 rounded-full bg-background border border-foreground/10">
                        <Clock className="w-3 h-3" /> Expira em {timerStr}
                    </span>
                    {!isMyTurn && (
                        <span className="text-xs mt-1.5 border-t border-border/60 pt-1 w-full opacity-80 text-center font-medium">
                            {ownership.total_active} ativos. Sua vez será a {ownership.my_position}ª
                        </span>
                    )}
                </div>
            )}

            {!isMyTurn ? (
                <Button disabled size="sm" className="w-full font-bold bg-muted text-muted-foreground shadow-none">
                    ⏳ Aguardando...
                </Button>
            ) : (
                <Button onClick={() => onClaim(lead.id)} size="sm" className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    🎯 Capturar Lead
                </Button>
            )}
        </div>
    );
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
    const clockOffsetRef = useRef<number>(0);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem('cupula_sound_enabled') !== 'false';
    });
    const soundEnabledRef = useRef(true);
    soundEnabledRef.current = localStorage.getItem('cupula_sound_enabled') !== 'false';

    // Som de notificação via Web Audio API (funciona offline, sem CORS)
    const playNotification = () => {
        if (!soundEnabledRef.current) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.value = 880;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.3, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.15);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc2.start(ctx.currentTime + 0.2);
            osc2.stop(ctx.currentTime + 0.4);
            setTimeout(() => ctx.close(), 1000);
        } catch (e) {
            console.error("Erro ao tocar som:", e);
        }
    };

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        soundEnabledRef.current = newValue;
        localStorage.setItem('cupula_sound_enabled', newValue.toString());
        if (newValue) {
            playNotification();
        }
        toast.info(newValue ? "Notificações sonoras ativadas 🔊" : "Notificações sonoras desativadas 🔇");
    };

    const formatTime = (ms: number) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Leads não capturados (novos sem dono)
    const unclaimedLeads = useMemo(() => leads
        .filter(l => l.status === 'novos' && !l.owner_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [leads]);


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
                    const offset = Date.now() - queueData.server_now;
                    setClockOffset(offset);
                    clockOffsetRef.current = offset;
                }
            }

            // Busca configurações de nomes de colunas
            const { data: settingsData } = await supabase
                .from('cupula_settings')
                .select('column_id, custom_name')
                .eq('niche', selectedNiche);

            if (settingsData) {
                const namesMap: Record<string, string> = {};
                settingsData.forEach(item => {
                    namesMap[item.column_id] = item.custom_name;
                });
                setCustomNames(namesMap);
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
                return;
            }

            toast.success("Lead capturado com sucesso!");
            fetchLeads();
        } catch (error: any) {
            console.error("Erro ao capturar lead:", error);
            toast.error("Erro ao processar captura.");
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm("Tem certeza que deseja deletar este lead do seu CRM?")) return;

        try {
            const { error } = await supabase
                .from('cupula_leads')
                .delete()
                .eq('id', leadId)
                .eq('owner_id', currentUserId);

            if (error) throw error;

            toast.success("Lead removido com sucesso!");
            fetchLeads();
        } catch (error: any) {
            console.error("Erro ao deletar lead:", error);
            toast.error("Erro ao deletar lead.");
        }
    };

    const handleUpdateColumnName = async (columnId: string) => {
        if (!editValue.trim()) {
            setEditingColumn(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('cupula_settings')
                .upsert({
                    user_id: currentUserId,
                    niche: selectedNiche,
                    column_id: columnId,
                    custom_name: editValue.trim(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,niche,column_id' });

            if (error) throw error;

            setCustomNames(prev => ({ ...prev, [columnId]: editValue.trim() }));
            setEditingColumn(null);
            toast.success("Etapa renomeada!");
        } catch (error: any) {
            console.error("Erro ao atualizar nome da coluna:", error);
            toast.error("Erro ao renomear etapa.");
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
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={toggleSound}
                            className={`flex items-center gap-2 ${soundEnabled ? 'text-blue-500 border-blue-200' : 'text-muted-foreground'}`}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            <span className="hidden sm:inline">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setView('selection')} className="text-muted-foreground hover:text-foreground p-0 h-auto">
                            ← Trocar Nicho
                        </Button>
                    </div>
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
                    const colLeads = filteredLeads.filter(l => 
                        l.status === col.id && 
                        (col.id === 'novos' || l.owner_id === currentUserId)
                    );
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
                            <div className={`p-4 border-b ${col.color} border-x-0 border-t-0 font-semibold flex items-center justify-between shadow-sm bg-opacity-50 group`}>
                                {editingColumn === col.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input 
                                            autoFocus
                                            className="bg-background border border-primary/30 rounded px-2 py-0.5 text-sm w-full outline-none focus:border-primary"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdateColumnName(col.id);
                                                if (e.key === 'Escape') setEditingColumn(null);
                                            }}
                                        />
                                        <button onClick={() => handleUpdateColumnName(col.id)} className="p-1 hover:text-green-500">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingColumn(null)} className="p-1 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span>{customNames[col.id] || col.title}</span>
                                            {col.id !== 'novos' && (
                                                <button 
                                                    onClick={() => {
                                                        setEditingColumn(col.id);
                                                        setEditValue(customNames[col.id] || col.title);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <span className="bg-background/50 text-foreground px-2 py-0.5 rounded-full text-xs">
                                            {colLeads.length}
                                        </span>
                                    </>
                                )}
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
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="font-medium text-foreground text-sm truncate">
                                                    {lead.name}
                                                </div>
                                                {isMine && (
                                                    <button 
                                                        onClick={() => handleDeleteLead(lead.id)}
                                                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                        title="Remover do CRM"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {col.id === 'novos' ? (
                                                <LeadQueueCard
                                                    lead={lead}
                                                    turnInfo={turnInfo}
                                                    clockOffset={clockOffsetRef.current}
                                                    currentUserId={currentUserId}
                                                    unclaimedLeads={unclaimedLeads}
                                                    onClaim={handleClaimLead}
                                                    playNotification={playNotification}
                                                />
                                            ) : (
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
