import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Phone, Tag, Calendar, ChevronRight, Trash2, Briefcase, ShoppingBag } from 'lucide-react';
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
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchLeads();
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

            // Filtro para garantir apenas 1 lead por número caso existam duplicatas no banco
            const uniqueLeadsMap = new Map();
            data.forEach(lead => {
                if (!uniqueLeadsMap.has(lead.phone)) {
                    uniqueLeadsMap.set(lead.phone, lead);
                }
            });
            const uniqueData = Array.from(uniqueLeadsMap.values());

            // Detecta nome do dono: se 2+ leads compartilham o mesmo título, é o nome do próprio usuário
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
                // Corrige título se for o nome do dono
                const titleLower = (l.title || '').trim().toLowerCase();
                if (ownerNames.has(titleLower)) {
                    supabase.from('crm_leads').update({ title: l.phone }).eq('id', l.id).then();
                    l = { ...l, title: l.phone };
                }

                // Se um lead ficar parado por mais de 24h, move-o para 'lost' (exceto se já estiver em won/lost)
                if (l.status && l.status !== 'won' && l.status !== 'lost') {
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
            setLeads(originalLeads); // Revert
        }
    };

    const handleDeleteLead = (e: React.MouseEvent, lead: any) => {
        e.stopPropagation(); // Evita abrir o modal
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
            setLeads(originalLeads); // Revert
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
                <h2 className="text-2xl font-bold text-foreground">CRM - Funil de Vendas</h2>
                <p className="text-muted-foreground">Arraste os cards para alterar a etapa do lead no funil de vendas.</p>
            </div>

            <div className="flex overflow-x-auto pb-4 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
                {COLUMNS.map(column => {
                    const columnLeads = leads.filter(l => l.status === column.id || (column.id === 'new' && !l.status));

                    return (
                        <div
                            key={column.id}
                            className="flex-shrink-0 w-[300px] flex flex-col bg-muted/20 rounded-xl border border-border"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Header */}
                            <div className={`p-3 font-semibold text-sm rounded-t-xl border-b flex items-center justify-between ${column.color}`}>
                                <span>{column.title}</span>
                                <span className="bg-background/50 px-2 py-0.5 rounded-full text-xs">{columnLeads.length}</span>
                            </div>

                            {/* Conent */}
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

            {/* Modal Profissional de Confirmação de Remoção do Card */}
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
        </div>
    );
}
