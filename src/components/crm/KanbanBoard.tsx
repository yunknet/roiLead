import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Phone, Tag, Calendar, ChevronRight, Trash2, Briefcase, ShoppingBag, Edit2, Timer, TimerOff, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LeadProfileModal } from './LeadProfileModal';

const COLUMNS = [
    { id: 'new', title: 'Novos', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { id: 'contacted', title: 'Contatados', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    { id: 'negotiating', title: 'Em Negociação', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { id: 'won', title: 'Fechados', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    { id: 'lost', title: 'Perdidos', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
];

export function KanbanBoard({ onCallLead }: { onCallLead?: (phone: string, title?: string) => void }) {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [leadToDelete, setLeadToDelete] = useState<any>(null);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [crmColumns, setCrmColumns] = useState(COLUMNS);
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [editingColumnTitle, setEditingColumnTitle] = useState('');
    const [autoLostEnabled, setAutoLostEnabled] = useState(true);
    const autoLostRef = useRef(true);

    useEffect(() => {
        const initBoard = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: settings } = await supabase
                    .from('crm_settings')
                    .select('columns, auto_lost_enabled')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (settings?.columns && Array.isArray(settings.columns) && settings.columns.length > 0) {
                    setCrmColumns(settings.columns as any);
                } else {
                    const saved = localStorage.getItem('@roilead-crm-columns');
                    if (saved) {
                        try { setCrmColumns(JSON.parse(saved)); } catch (e) { }
                    }
                }

                // Carregar preferência de auto-lost
                if (settings?.auto_lost_enabled !== undefined && settings?.auto_lost_enabled !== null) {
                    setAutoLostEnabled(settings.auto_lost_enabled);
                    autoLostRef.current = settings.auto_lost_enabled;
                } else {
                    // Fallback localStorage
                    const savedAutoLost = localStorage.getItem('@roilead-auto-lost');
                    if (savedAutoLost !== null) {
                        const val = savedAutoLost === 'true';
                        setAutoLostEnabled(val);
                        autoLostRef.current = val;
                    }
                }
            }
            await fetchLeads();
        };
        initBoard();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            const now = Date.now();
            let hasUpdates = false;

            const uniqueLeadsMap = new Map();
            data.forEach(lead => {
                if (!uniqueLeadsMap.has(lead.phone)) {
                    uniqueLeadsMap.set(lead.phone, lead);
                }
            });
            const uniqueData = Array.from(uniqueLeadsMap.values());

            const titleCount: Record<string, number> = {};
            uniqueData.forEach(lead => {
                const t = (lead.title || '').trim().toLowerCase();
                if (t && t !== lead.phone) {
                    titleCount[t] = (titleCount[t] || 0) + 1;
                }
            });
            const ownerNames = new Set(
                Object.entries(titleCount)
                    .filter(([_, count]) => count >= 2)
                    .map(([title]) => title)
            );

            const updatedLeads = uniqueData.map(l => {
                const titleLower = (l.title || '').trim().toLowerCase();
                if (ownerNames.has(titleLower)) {
                    supabase.from('crm_leads').update({ title: l.phone }).eq('id', l.id).then();
                    l = { ...l, title: l.phone };
                }

                if (autoLostRef.current && l.status && l.status !== 'won' && l.status !== 'lost') {
                    const timeDiffHours = (now - new Date(l.updated_at).getTime()) / (1000 * 60 * 60);
                    if (timeDiffHours >= 24) {
                        hasUpdates = true;
                        supabase.from('crm_leads').update({ status: 'lost', updated_at: new Date().toISOString() }).eq('id', l.id).then();
                        return { ...l, status: 'lost' };
                    }
                }
                return l;
            });

            setLeads(updatedLeads);
        } else {
            toast.error('Erro ao carregar leads do CRM');
        }
        setLoading(false);
    };

    const updateLeadStatus = async (leadId: string, newStatus: string) => {
        const originalLeads = [...leads];
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

        const { error } = await supabase
            .from('crm_leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', leadId);

        if (error) {
            toast.error('Erro ao mover lead');
            setLeads(originalLeads);
        }
    };

    const handleDeleteLead = (e: React.MouseEvent, lead: any) => {
        e.stopPropagation();
        setLeadToDelete(lead);
    };

    const confirmDeleteLead = async () => {
        if (!leadToDelete) return;
        setIsDeleting(true);

        const leadId = leadToDelete.id;
        const originalLeads = [...leads];
        setLeads(leads.filter(l => l.id !== leadId));

        const { error } = await supabase
            .from('crm_leads')
            .delete()
            .eq('id', leadId);

        if (error) {
            toast.error('Erro ao remover lead');
            setLeads(originalLeads);
        } else {
            toast.success('Lead removido!');
        }
        setIsDeleting(false);
        setLeadToDelete(null);
    };

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            updateLeadStatus(leadId, statusId);
        }
    };

    const saveColumns = async (newCols: any[]) => {
        setCrmColumns(newCols);
        localStorage.setItem('@roilead-crm-columns', JSON.stringify(newCols));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase.from('crm_settings').upsert({
                user_id: user.id,
                columns: newCols,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            
            if (error) {
                console.error("Erro ao salvar configuração do CRM:", error);
                toast.error("Erro ao sincronizar colunas com a nuvem.");
            }
        }
    };

    const handleSaveColumnName = async (id: string) => {
        const newTitle = editingColumnTitle.trim() || COLUMNS.find(c => c.id === id)?.title || '';
        const newCols = crmColumns.map(c => c.id === id ? { ...c, title: newTitle } : c);
        setEditingColumnId(null);
        await saveColumns(newCols);
    };

    const handleAddColumn = async () => {
        const newCol = {
            id: `custom_${Date.now()}`,
            title: 'Nova Etapa',
            color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
        };
        await saveColumns([...crmColumns, newCol]);
        toast.success("Nova etapa adicionada!");
    };

    const handleDeleteColumn = (columnId: string) => {
        setColumnToDelete(columnId);
    };

    const confirmDeleteColumn = async () => {
        if (!columnToDelete) return;
        setIsDeleting(true);

        try {
            // Move leads to 'contacted'
            const leadsToMove = leads.filter(l => l.status === columnToDelete);
            if (leadsToMove.length > 0) {
                setLeads(leads.map(l => l.status === columnToDelete ? { ...l, status: 'contacted' } : l));
                await supabase
                    .from('crm_leads')
                    .update({ status: 'contacted', updated_at: new Date().toISOString() })
                    .eq('status', columnToDelete);
            }

            const newCols = crmColumns.filter(c => c.id !== columnToDelete);
            await saveColumns(newCols);
            toast.success("Etapa removida!");
            setColumnToDelete(null);
        } catch (err) {
            console.error("Erro ao deletar coluna:", err);
            toast.error("Erro ao remover etapa.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMoveColumn = async (columnId: string, direction: 'left' | 'right') => {
        const index = crmColumns.findIndex(c => c.id === columnId);
        if (index === -1) return;

        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= crmColumns.length) return;

        const newCols = [...crmColumns];
        const temp = newCols[index];
        newCols[index] = newCols[targetIndex];
        newCols[targetIndex] = temp;

        await saveColumns(newCols);
    };

    const toggleAutoLost = async () => {
        const newValue = !autoLostEnabled;
        setAutoLostEnabled(newValue);
        autoLostRef.current = newValue;
        localStorage.setItem('@roilead-auto-lost', newValue.toString());

        // Persistir no banco
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('crm_settings').upsert({
                user_id: user.id,
                auto_lost_enabled: newValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        }

        toast.info(
            newValue 
                ? '⏰ Leads inativos por 24h serão movidos automaticamente para Perdidos.' 
                : '✋ Modo manual ativado. Leads só vão para Perdidos se você mover manualmente.'
        );

        // Re-fetch se ligou de volta (para aplicar regras)
        if (newValue) {
            fetchLeads();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">CRM - Funil de Vendas</h2>
                        <p className="text-muted-foreground text-sm">Arraste os cards para alterar a etapa do lead no funil de vendas.</p>
                    </div>
                    <button
                        onClick={toggleAutoLost}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs border transition-all shrink-0 ${
                            autoLostEnabled 
                                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' 
                                : 'bg-muted/30 border-border hover:bg-muted/60'
                        }`}
                    >
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${autoLostEnabled ? 'bg-red-500' : 'bg-muted-foreground/30'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${autoLostEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                        <div className="text-left">
                            <div className={`font-semibold ${autoLostEnabled ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {autoLostEnabled ? 'Perda automática ativada' : 'Perda automática desativada'}
                            </div>
                            <div className="text-muted-foreground text-[10px] leading-tight mt-0.5">
                                {autoLostEnabled 
                                    ? 'Leads sem contato em 24h vão para Perdidos' 
                                    : 'Leads só vão para Perdidos manualmente'}
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex overflow-x-auto pb-4 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
                {crmColumns.map(column => {
                    const columnLeads = leads.filter(l => l.status === column.id || (column.id === 'new' && !l.status));

                    return (
                        <div
                            key={column.id}
                            className="flex-shrink-0 w-[300px] flex flex-col bg-muted/20 rounded-xl border border-border"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className={`p-3 font-semibold text-sm rounded-t-xl border-b flex items-center justify-between group ${column.color}`}>
                                {editingColumnId === column.id ? (
                                    <input 
                                        type="text" 
                                        value={editingColumnTitle} 
                                        onChange={e => setEditingColumnTitle(e.target.value)} 
                                        onBlur={() => handleSaveColumnName(column.id)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveColumnName(column.id)}
                                        className="bg-background/80 text-foreground px-2 py-0.5 rounded outline-none border border-border/50 flex-1 mr-2 text-xs h-7"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>{column.title}</span>
                                        {column.id !== 'new' && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {column.id.startsWith('custom_') && (
                                                    <button 
                                                        onClick={() => handleMoveColumn(column.id, 'left')}
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                        title="Mover para esquerda"
                                                    >
                                                        <ArrowLeft className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => { setEditingColumnId(column.id); setEditingColumnTitle(column.title); }}
                                                    className="p-1 text-muted-foreground hover:text-foreground"
                                                    title="Editar etapa"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                {column.id.startsWith('custom_') && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleDeleteColumn(column.id)}
                                                            className="p-1 text-muted-foreground hover:text-red-500"
                                                            title="Excluir etapa"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMoveColumn(column.id, 'right')}
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
                                )}
                                <span className="bg-background/50 px-2 py-0.5 rounded-full text-xs shrink-0">{columnLeads.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {columnLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                        onClick={() => setSelectedLead(lead)}
                                        className="bg-card p-3 rounded-lg border border-border shadow-sm shadow-black/5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group relative"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-semibold text-sm truncate flex-1" title={lead.title}>{lead.title}</h4>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                onClick={(e) => handleDeleteLead(e, lead)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        {lead.request_details && (
                                            <div className="mt-2 mb-1 flex items-center">
                                                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 truncate" title={lead.request_details}>
                                                    <Tag className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.request_details}</span>
                                                </span>
                                            </div>
                                        )}
                                        <div className="mb-1 flex items-center">
                                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1 truncate" title={lead.product_tag || 'Produto'}>
                                                <ShoppingBag className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.product_tag || 'Produto'}</span>
                                            </span>
                                        </div>
                                        {lead.company && lead.company !== "WhatsApp" && (
                                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                <Briefcase className="w-3 h-3 shrink-0" />
                                                <span className="truncate" title={`Sócios: ${lead.company}`}>Sócios: {lead.company}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {lead.phone}
                                        </p>
                                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground border-t pt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(lead.updated_at).toLocaleDateString()}
                                            </span>
                                            <span className={`font-semibold ${lead.value > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                R$ {lead.value > 0 ? Number(lead.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {columnLeads.length === 0 && (
                                    <div className="h-20 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground/50">
                                        Solte aqui
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                
                <button
                    onClick={handleAddColumn}
                    className="flex-shrink-0 w-[40px] sm:w-[50px] h-full flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-xl transition-all cursor-pointer group"
                    title="Adicionar nova etapa"
                >
                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="sr-only">Adicionar etapa</span>
                </button>
            </div>
            {selectedLead && (
                <LeadProfileModal
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    lead={selectedLead}
                    onCallLead={onCallLead}
                    onUpdateNotes={(id, notes) => {
                        setLeads(leads.map(l => l.id === id ? { ...l, notes } : l));
                    }}
                    onUpdateValue={(id, value) => {
                        setLeads(leads.map(l => l.id === id ? { ...l, value } : l));
                        setSelectedLead((prev: any) => prev ? { ...prev, value } : prev);
                    }}
                    onUpdateProduct={(id, product_tag) => {
                        setLeads(leads.map(l => l.id === id ? { ...l, product_tag } : l));
                        setSelectedLead((prev: any) => prev ? { ...prev, product_tag } : prev);
                    }}
                    onDeleteLead={(id) => {
                        setLeads(leads.filter(l => l.id !== id));
                    }}
                />
            )}

            <Dialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja apagar o lead <strong>{leadToDelete?.title}</strong> do seu funil?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
                        <Button variant="outline" onClick={() => setLeadToDelete(null)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteLead} disabled={isDeleting}>
                            {isDeleting ? "Removendo..." : "Sim, excluir lead"}
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
                        <Button variant="destructive" className="flex-1" onClick={confirmDeleteColumn} disabled={isDeleting}>
                            {isDeleting ? "Removendo..." : "Sim, excluir etapa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
