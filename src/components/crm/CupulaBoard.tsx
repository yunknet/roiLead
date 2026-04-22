import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Waves, UserPlus, Lock, Clock, Trash2, Edit2, Check, X, Bell, Volume2, VolumeX, Mail, Users, ChevronDown, ChevronUp, Plus, GripVertical, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const NICHES = ['Consórcio'] as const;
type Niche = typeof NICHES[number];
type SharkStatus = string;

interface SharkLead {
    id: string;
    niche: Niche;
    name: string;
    phone: string;
    notes: string | null;
    status: SharkStatus;
    owner_id: string | null;
    assigned_to: string | null;
    assigned_at: string | null;
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

    useEffect(() => {
        const interval = setInterval(() => setTickVal(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Calcula tempo decorrido desde assigned_at (ou created_at como fallback)
    const rawTs = (lead.assigned_at || lead.created_at).replace(/[+-]\d{2}:\d{2}$/, 'Z');
    const assignedAtMs = new Date(rawTs).getTime();
    const serverNow = Date.now() - clockOffset;
    let elapsedSec = (serverNow - assignedAtMs) / 1000;
    if (elapsedSec < 0) elapsedSec = 0;

    const TURN_DURATION = 180;
    const secondsIntoTurn = elapsedSec % TURN_DURATION;
    const timeLeftSec = Math.max(0, Math.floor(TURN_DURATION - secondsIntoTurn));

    // Determina o dono atual
    let ownership: any = null;
    if (turnInfo?.active_users?.length) {
        const _active = turnInfo.active_users;
        const skips = Math.floor(elapsedSec / TURN_DURATION);
        let currentOwnerIndex = 0;

        if (lead.assigned_to) {
            // Lead veio do webhook com assigned_to definido
            const assignedIndex = _active.findIndex((u: any) => u.user_id === lead.assigned_to);
            if (assignedIndex !== -1) {
                currentOwnerIndex = (assignedIndex + skips) % _active.length;
            }
        } else {
            // Fallback: lead manual sem assigned_to — usa round-robin por posição na lista
            const leadIndex = unclaimedLeads.findIndex(l => l.id === lead.id);
            if (leadIndex !== -1) {
                currentOwnerIndex = (turnInfo.base_turn_index + leadIndex + skips) % _active.length;
            }
        }

        const owner = _active[currentOwnerIndex];
        const currentUserIndex = _active.findIndex((u: any) => u.user_id === currentUserId);
        let position = 0;
        if (currentUserIndex !== -1) {
            position = (currentUserIndex - currentOwnerIndex + _active.length) % _active.length + 1;
        }

        ownership = {
            owner_id: owner.user_id,
            owner_name: owner.name,
            timeLeftSec,
            total_active: _active.length,
            my_position: position
        };
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
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md uppercase tracking-wider">
                    <Lock className="w-3 h-3" /> Dados ocultos
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                    Chegou há {elapsedSec < 60 
                        ? `${Math.floor(elapsedSec)}s`
                        : elapsedSec < 3600 
                            ? `${Math.floor(elapsedSec / 60)}min` 
                            : elapsedSec < 86400 
                                ? `${Math.floor(elapsedSec / 3600)}h ${Math.floor((elapsedSec % 3600) / 60)}min`
                                : `${Math.floor(elapsedSec / 86400)}d ${Math.floor((elapsedSec % 86400) / 3600)}h`}
                </div>
            </div>
            
            {lead.notes && (
                <div className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-500/5 p-2.5 rounded-lg border border-blue-100/50 dark:border-blue-500/10 italic leading-relaxed">
                    {(() => {
                        const parts = lead.notes!.split('|');
                        const emailParts = parts.filter(p => p.includes('📧') || p.includes('Email:'));
                        const otherParts = parts.filter(p => !p.includes('📧') && !p.includes('Email:'));
                        return (
                            <>
                                {otherParts.map((part, idx) => {
                                    const cleanPart = part.trim()
                                        .replace(/🔸 /g, '')
                                        .replace(/^Escolha [Oo]\s*/gi, '')
                                        .replace(/^Selecione [Oo]\s*/gi, '')
                                        .replace(/Tipo De Consórcio: /i, '')
                                        .replace(/🔸/g, '');
                                    if (!cleanPart) return null;
                                    return <div key={idx} className="font-bold text-foreground/80 flex items-center gap-1.5">🔸 {cleanPart}</div>
                                })}
                            </>
                        );
                    })()}
                </div>
            )}
            
            {ownership && (
                <div className={`text-center font-bold px-3 py-3 rounded-xl border shadow-sm flex flex-col items-center gap-1 mt-1 mb-1 transition-all ${isMyTurn ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 text-white shadow-blue-200 dark:shadow-none' : 'bg-muted/80 text-muted-foreground border-border/50'}`}>
                    <span className={`text-[9px] uppercase tracking-[0.15em] font-black mb-0.5 ${isMyTurn ? 'text-blue-100' : 'opacity-70'}`}>Status da Fila</span>
                    <span className="text-sm">
                        {isMyTurn ? `🎯 Sua vez, ${ownership.owner_name}!` : `⏳ Vez de: ${ownership.owner_name}`}
                    </span>
                    <div className={`text-xs flex items-center justify-center gap-1.5 mt-1 px-3 py-1 rounded-full border ${isMyTurn ? 'bg-white/20 border-white/30 text-white' : 'bg-background border-foreground/10'}`}>
                        <Clock className="w-3.5 h-3.5" /> <span className="font-mono">Expira em {timerStr}</span>
                    </div>
                    {!isMyTurn && (
                        <div className="text-[10px] mt-2 border-t border-border/60 pt-2 w-full opacity-80 text-center font-medium">
                            {ownership.my_position - 1 === 1 
                                ? '🔜 Falta 1 pessoa para sua vez' 
                                : `⏳ Faltam ${ownership.my_position - 1} pessoas para sua vez`}
                        </div>
                    )}
                </div>
            )}

            {!isMyTurn ? (
                <Button disabled size="sm" className="w-full font-bold bg-muted text-muted-foreground/50 h-10 rounded-xl border-none">
                    ⏳ Aguardando...
                </Button>
            ) : (
                <Button onClick={() => onClaim(lead.id)} size="sm" className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none h-10 rounded-xl transition-all active:scale-95">
                    🚀 CAPTURAR AGORA
                </Button>
            )}
        </div>
    );
}

function WhatsAppIcon(props: any) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={props.className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
}

function CapturedLeadCard({ 
    lead, 
    isMine, 
    onDelete, 
    onChat 
}: { 
    lead: SharkLead; 
    isMine: boolean; 
    onDelete: (id: string) => void;
    onChat: (lead: SharkLead) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <>
            {/* Modal de Confirmação de Exclusão Customizado */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-xl">Deletar Lead?</DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Você tem certeza que deseja remover <b>{lead.name}</b> do seu CRM? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => { onDelete(lead.id); setShowDeleteConfirm(false); }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                            Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div 
                className={`group bg-background p-4 rounded-xl shadow-sm border border-border hover:border-primary/40 transition-all flex flex-col gap-3 ${isMine ? 'cursor-grab active:cursor-grabbing border-l-4 border-l-blue-500 shadow-md' : 'opacity-80'}`}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-foreground text-sm truncate flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isMine ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                        {lead.name}
                    </div>
                    {isMine && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all p-2 rounded-lg"
                            title="Remover do CRM"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

            {lead.notes && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 leading-relaxed overflow-hidden">
                    <div className="font-bold uppercase text-[9px] mb-1.5 opacity-60 flex items-center gap-1">
                        📋 Especificações
                    </div>
                    <div className="space-y-1">
                        {(() => {
                            const parts = lead.notes!.split('|');
                            const emailParts = parts.filter(p => p.includes('📧') || p.includes('Email:'));
                            const otherParts = parts.filter(p => !p.includes('📧') && !p.includes('Email:'));
                            
                            const firstEmail = emailParts.length > 0 
                                ? emailParts[0].replace('📧', '').replace('Email:', '').trim() 
                                : null;

                            return (
                                <>
                                    {firstEmail && (
                                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                            <Mail className="w-3.5 h-3.5" />
                                            {firstEmail}
                                        </div>
                                    )}
                                    {otherParts.map((part, idx) => {
                                        const cleanPart = part.trim()
                                            .replace(/🔸 /g, '')
                                            .replace(/^Escolha [Oo]\s*/gi, '')
                                            .replace(/^Selecione [Oo]\s*/gi, '')
                                            .replace(/Tipo De Consórcio: /i, '')
                                            .replace(/🔸/g, '');
                                        
                                        if (!cleanPart) return null;

                                        return <div key={idx} className="break-words font-bold text-foreground/90 flex items-center gap-1.5">🔸 {cleanPart}</div>
                                    })}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {isMine ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 ml-1 mb-[-4px]">
                            <Lock className="w-3 h-3" /> Contato Liberado
                        </div>
                        <div className="text-sm font-mono bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 p-2.5 rounded-xl text-center border border-blue-100 dark:border-blue-500/20 font-bold">
                            {lead.phone}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-xl text-center flex items-center justify-center gap-2 border border-dashed border-border opacity-70">
                        <Lock className="w-3.5 h-3.5 opacity-50" /> 
                        <span>Capturado por outro membro</span>
                    </div>
                )}

                {isMine && (
                    <Button 
                        onClick={() => onChat(lead)} 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 rounded-xl shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <WhatsAppIcon className="w-4 h-4" />
                        Chamar no WhatsApp
                    </Button>
                )}
            </div>
        </div>
        </>
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
    const [turnInfo, setTurnInfo] = useState<any>(null);
    const [clockOffset, setClockOffset] = useState<number>(0);
    const clockOffsetRef = useRef<number>(0);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showNameModal, setShowNameModal] = useState(false);
    const [fullNameInput, setFullNameInput] = useState("");
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [customColumns, setCustomColumns] = useState<{ id: string; title: string; color: string; position: number }[]>([]);
    const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
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


    const checkAccess = async (userEmail?: string): Promise<{ hasAccess: boolean; hasName: boolean }> => {
        if (!userEmail) return { hasAccess: false, hasName: false };
        try {
            const { data: sharkUser } = await supabase
                .from('cupula_access')
                .select('status, full_name')
                .eq('email', userEmail)
                .maybeSingle();
            
            if (sharkUser?.status === 'active') {
                return { hasAccess: true, hasName: !!sharkUser.full_name };
            }
            return { hasAccess: false, hasName: false };
        } catch (err) {
            return { hasAccess: false, hasName: false };
        }
    };

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                // Verifica acesso logo no boot se já estiver com nicho selecionado
                if (selectedNiche) {
                    const { hasAccess } = await checkAccess(user.email);
                    if (!hasAccess) {
                        setSelectedNiche(null);
                        setView('selection');
                        setShowPaymentModal(true);
                    }
                }
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
    }, [selectedNiche]);

    const fetchLeads = async () => {
        try {
            // Se estiver no board, valida o acesso a cada refresh de leads
            if (view === 'board') {
                const { data: { user } } = await supabase.auth.getUser();
                const { hasAccess } = await checkAccess(user?.email);
                
                if (!hasAccess) {
                    setSelectedNiche(null);
                    setView('selection');
                    setShowPaymentModal(true);
                    return;
                }
            }

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

            // Busca configurações de nomes de colunas e colunas customizadas
            const { data: settingsData } = await supabase
                .from('cupula_settings')
                .select('column_id, custom_name')
                .eq('niche', selectedNiche);

            if (settingsData) {
                const namesMap: Record<string, string> = {};
                const userCustomCols: { id: string; title: string; color: string; position: number }[] = [];
                
                settingsData.forEach(item => {
                    if (item.column_id.startsWith('custom_')) {
                        // Parse custom column metadata: "title|color|position"
                        try {
                            const meta = JSON.parse(item.custom_name);
                            userCustomCols.push({
                                id: item.column_id,
                                title: meta.title || 'Nova Etapa',
                                color: meta.color || 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
                                position: meta.position ?? 99
                            });
                        } catch {
                            userCustomCols.push({
                                id: item.column_id,
                                title: item.custom_name,
                                color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
                                position: 99
                            });
                        }
                    } else {
                        namesMap[item.column_id] = item.custom_name;
                    }
                });
                setCustomNames(namesMap);
                setCustomColumns(userCustomCols.sort((a, b) => a.position - b.position));
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
            let customNamePayload = editValue.trim();

            if (columnId.startsWith('custom_')) {
                const customCol = customColumns.find(c => c.id === columnId);
                if (customCol) {
                    customNamePayload = JSON.stringify({
                        title: editValue.trim(),
                        color: customCol.color,
                        position: customCol.position
                    });
                }
            }

            const { error } = await supabase
                .from('cupula_settings')
                .upsert({
                    user_id: currentUserId,
                    niche: selectedNiche,
                    column_id: columnId,
                    custom_name: customNamePayload,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,niche,column_id' });

            if (error) throw error;

            if (columnId.startsWith('custom_')) {
                setCustomColumns(prev => prev.map(c => 
                    c.id === columnId ? { ...c, title: editValue.trim() } : c
                ));
            } else {
                setCustomNames(prev => ({ ...prev, [columnId]: editValue.trim() }));
            }
            
            setEditingColumn(null);
            toast.success("Etapa renomeada!");
        } catch (error: any) {
            console.error("Erro ao atualizar nome da coluna:", error);
            toast.error("Erro ao renomear etapa.");
        }
    };

    const handleAddCustomColumn = async () => {
        const columnId = `custom_${Date.now()}`;
        const position = customColumns.length > 0 
            ? Math.max(...customColumns.map(c => c.position)) + 1 
            : 1;
        
        const newCol = {
            id: columnId,
            title: "Nova Etapa",
            color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
            position
        };

        try {
            const { error } = await supabase
                .from('cupula_settings')
                .upsert({
                    user_id: currentUserId,
                    niche: selectedNiche,
                    column_id: columnId,
                    custom_name: JSON.stringify(newCol),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,niche,column_id' });

            if (error) throw error;
            setCustomColumns(prev => [...prev, newCol]);
            toast.success("Nova etapa adicionada!");
        } catch (err) {
            console.error("Erro ao adicionar coluna:", err);
            toast.error("Erro ao adicionar etapa.");
        }
    };

    const handleDeleteCustomColumn = (columnId: string) => {
        setColumnToDelete(columnId);
    };

    const confirmDeleteCustomColumn = async () => {
        if (!columnToDelete) return;
        setIsDeleting(true);

        try {
            // Move leads to "contatados" first
            await supabase
                .from('cupula_leads')
                .update({ status: 'contatados', updated_at: new Date().toISOString() })
                .eq('status', columnToDelete)
                .eq('owner_id', currentUserId);

            const { error } = await supabase
                .from('cupula_settings')
                .delete()
                .eq('user_id', currentUserId)
                .eq('niche', selectedNiche)
                .eq('column_id', columnToDelete);

            if (error) throw error;
            setCustomColumns(prev => prev.filter(c => c.id !== columnToDelete));
            toast.success("Etapa removida!");
            setColumnToDelete(null);
            fetchLeads();
        } catch (err) {
            console.error("Erro ao deletar coluna:", err);
            toast.error("Erro ao remover etapa.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMoveCustomColumn = async (columnId: string, direction: 'left' | 'right') => {
        const currentIndex = customColumns.findIndex(c => c.id === columnId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= customColumns.length) return;

        const newColumns = [...customColumns];
        const temp = newColumns[currentIndex].position;
        newColumns[currentIndex].position = newColumns[targetIndex].position;
        newColumns[targetIndex].position = temp;

        const updatedCols = [...newColumns].sort((a, b) => a.position - b.position);
        setCustomColumns(updatedCols);

        try {
            // Update both columns in the database
            const updates = [
                {
                    user_id: currentUserId,
                    niche: selectedNiche,
                    column_id: newColumns[currentIndex].id,
                    custom_name: JSON.stringify({
                        title: newColumns[currentIndex].title,
                        color: newColumns[currentIndex].color,
                        position: newColumns[currentIndex].position
                    }),
                    updated_at: new Date().toISOString()
                },
                {
                    user_id: currentUserId,
                    niche: selectedNiche,
                    column_id: newColumns[targetIndex].id,
                    custom_name: JSON.stringify({
                        title: newColumns[targetIndex].title,
                        color: newColumns[targetIndex].color,
                        position: newColumns[targetIndex].position
                    }),
                    updated_at: new Date().toISOString()
                }
            ];

            await supabase.from('cupula_settings').upsert(updates, { onConflict: 'user_id,niche,column_id' });
        } catch (error) {
            console.error("Erro ao reordenar etapas:", error);
            toast.error("Erro ao salvar ordem das etapas.");
            fetchLeads(); // rollback UI on error
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

    const handleAccessRequest = () => {
        const message = encodeURIComponent("Olá! Gostaria de saber mais e solicitar acesso à Cúpula de Leads de Consórcio.");
        window.open(`https://wa.me/5511922967021?text=${message}`, '_blank');
    };

    const handleSelectNiche = async (niche: Niche) => {
        setLoadingAccess(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { hasAccess, hasName } = await checkAccess(user.email);

            if (hasAccess) {
                setSelectedNiche(niche);
                if (!hasName) {
                    // Pedir nome completo na primeira vez
                    setShowNameModal(true);
                } else {
                    setView('board');
                    fetchLeads();
                }
            } else {
                setShowPaymentModal(true);
            }
        } catch (err: any) {
            console.error("Erro ao verificar assinatura do Shark Tank:", err);
            toast.error("Erro ao validar acesso.");
        } finally {
            setLoadingAccess(false);
        }
    };

    const handleSaveFullName = async () => {
        if (!fullNameInput.trim() || fullNameInput.trim().split(' ').length < 2) {
            toast.error("Digite seu nome completo (nome e sobrenome).");
            return;
        }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) return;

            const { error } = await supabase
                .from('cupula_access')
                .update({ full_name: fullNameInput.trim() })
                .eq('email', user.email);

            if (error) throw error;

            setShowNameModal(false);
            setView('board');
            fetchLeads();
            toast.success("Nome salvo com sucesso!");
        } catch (err: any) {
            console.error("Erro ao salvar nome:", err);
            toast.error("Erro ao salvar nome.");
        }
    };


    const filteredLeads = leads.filter(l => l.niche === selectedNiche);

    const baseColumns: { id: SharkStatus; title: string; color: string }[] = [
        { id: 'novos', title: 'Novos', color: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
        { id: 'contatados', title: 'Contatados', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' },
        { id: 'negociacao', title: 'Negociação', color: 'bg-purple-500/10 border-purple-500/20 text-purple-500' },
        { id: 'fechados', title: 'Fechados', color: 'bg-green-500/10 border-green-500/20 text-green-500' },
        { id: 'perdidos', title: 'Perdidos', color: 'bg-red-500/10 border-red-500/20 text-red-500' },
    ];

    const columns = [...baseColumns, ...customColumns];

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

                <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto w-full">
                    {NICHES.map(niche => (
                        <div
                            key={niche}
                            className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-6 hover:border-primary/50 transition-all cursor-pointer shadow-sm group w-full md:w-[350px]"
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
                                Acesso Restrito
                            </DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                Para capturar e bater papo com os leads milionários da Cúpula de Leads de <b>Consórcio</b>, você passará por uma análise de perfil.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex flex-col gap-4 py-4">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-foreground space-y-2">
                                <p className="font-semibold text-blue-600 dark:text-blue-400">🎯 Como funciona?</p>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                    <li>Fale com nosso consultor no WhatsApp.</li>
                                    <li>Verifique se você está apto para o módulo exclusivo.</li>
                                    <li>Liberação manual após validação de perfil.</li>
                                </ul>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                                Agora não
                            </Button>
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                onClick={handleAccessRequest}
                            >
                                <WhatsAppIcon className="w-4 h-4 mr-2" />
                                Acessar Cúpula de Leads
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
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setView('selection')} 
                            className="text-muted-foreground hover:text-foreground p-0 h-auto flex items-center gap-1"
                        >
                            ← <span className="text-xs">Trocar Nicho</span>
                        </Button>
                        <h2 className="text-2xl font-bold text-foreground">
                            Cúpula de {selectedNiche}
                        </h2>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={toggleSound}
                            className={`flex items-center gap-2 rounded-full px-4 ${soundEnabled ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-muted-foreground'}`}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            <span className="text-xs font-semibold">{soundEnabled ? "Som Ativo" : "Mudo"}</span>
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Dispute os leads enviados por tráfego pago.
                    </p>
                </div>
                {/* Botão de membros */}
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowMembersPanel(true)}
                    className="flex items-center gap-2 rounded-full px-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-semibold">{turnInfo?.active_users?.length || 0} Corretores na Fila</span>
                </Button>
            </div>

            {/* Modal de membros ativos */}
            <Dialog open={showMembersPanel} onOpenChange={setShowMembersPanel}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Users className="w-5 h-5 text-blue-500" />
                            Fila de Corretores
                        </DialogTitle>
                        <DialogDescription>
                            Veja a ordem de registro na Cúpula. Quem está acima tem prioridade na distribuição de novos leads.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
                        {turnInfo?.active_users?.map((member: any, idx: number) => {
                            const isCurrentUser = member.user_id === currentUserId;
                            // Verifica se tem algum lead não capturado atribuído a esse membro
                            const hasActiveLead = unclaimedLeads.some(l => l.assigned_to === member.user_id);
                            return (
                                <div 
                                    key={member.user_id}
                                    className={`flex items-start gap-3 px-3 py-3 rounded-xl border transition-all ${
                                        hasActiveLead 
                                            ? 'bg-blue-500/10 border-blue-500/30 shadow-sm' 
                                            : isCurrentUser 
                                                ? 'bg-primary/5 border-primary/20' 
                                                : 'bg-muted/30 border-border/50'
                                    }`}
                                >
                                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
                                        hasActiveLead 
                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {idx + 1}º
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className={`text-sm font-bold leading-tight flex items-center gap-2 ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                                            <span className="truncate">{member.name} {isCurrentUser && '(Você)'}</span>
                                            {isCurrentUser && (
                                                <button 
                                                    onClick={() => {
                                                        setFullNameInput(member.name);
                                                        setShowNameModal(true);
                                                    }}
                                                    className="p-1 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                    title="Editar meu nome"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {hasActiveLead && (
                                            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                                                🎯 Capturando agora
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal para preencher nome completo */}
            <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            👤 Seu nome na Cúpula
                        </DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            Digite seu <b>nome completo</b> para aparecer na fila de corretores da Cúpula de Leads.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Ex: João Silva Santos"
                            value={fullNameInput}
                            onChange={(e) => setFullNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFullName(); }}
                            className="text-base h-12"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveFullName} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11">
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!columnToDelete} onOpenChange={(open) => !open && setColumnToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Excluir Etapa
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-base">
                            Tem certeza que deseja excluir esta etapa? <br />
                            <span className="text-muted-foreground text-sm font-medium">Todos os leads que estiverem nela voltarão para a etapa <b>'Contatados'</b>.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex sm:justify-between items-center w-full gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setColumnToDelete(null)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={confirmDeleteCustomColumn} disabled={isDeleting}>
                            {isDeleting ? "Removendo..." : "Sim, excluir etapa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {col.id.startsWith('custom_') && (
                                                        <button 
                                                            onClick={() => handleMoveCustomColumn(col.id, 'left')}
                                                            className="p-1 text-muted-foreground hover:text-foreground"
                                                            title="Mover para esquerda"
                                                        >
                                                            <ArrowLeft className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            setEditingColumn(col.id);
                                                            setEditValue(customNames[col.id] || col.title);
                                                        }}
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                        title="Editar etapa"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    {col.id.startsWith('custom_') && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleDeleteCustomColumn(col.id)}
                                                                className="p-1 text-muted-foreground hover:text-red-500"
                                                                title="Excluir etapa"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleMoveCustomColumn(col.id, 'right')}
                                                                className="p-1 text-muted-foreground hover:text-foreground"
                                                                title="Mover para direita"
                                                            >
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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

                                    if (col.id === 'novos') {
                                        return (
                                            <div key={lead.id} className="bg-background p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
                                                 <div className="font-bold text-foreground text-sm truncate flex items-center gap-2">
                                                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                     {lead.name}
                                                 </div>
                                                 <LeadQueueCard
                                                     lead={lead}
                                                     turnInfo={turnInfo}
                                                     clockOffset={clockOffsetRef.current}
                                                     currentUserId={currentUserId}
                                                     unclaimedLeads={unclaimedLeads}
                                                     onClaim={handleClaimLead}
                                                     playNotification={playNotification}
                                                 />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div 
                                            key={lead.id} 
                                            draggable={isMine}
                                            onDragStart={(e) => {
                                                if (isMine) {
                                                    e.dataTransfer.setData('leadId', lead.id);
                                                }
                                            }}
                                        >
                                            <CapturedLeadCard 
                                                lead={lead}
                                                isMine={isMine === true}
                                                onDelete={handleDeleteLead}
                                                onChat={handleChat}
                                            />
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
                
                <button
                    onClick={handleAddCustomColumn}
                    className="flex-shrink-0 w-[40px] sm:w-[50px] h-full flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-xl transition-all cursor-pointer group"
                    title="Adicionar nova etapa"
                >
                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="sr-only">Adicionar etapa</span>
                </button>
            </div>
        </div>
    );
}
