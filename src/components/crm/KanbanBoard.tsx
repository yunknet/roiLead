import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Phone, Briefcase, Calendar, ChevronRight } from 'lucide-react';

const COLUMNS = [
    { id: 'new', title: 'Novos', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { id: 'contacted', title: 'Contatados', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    { id: 'negotiating', title: 'Em Negociação', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { id: 'won', title: 'Ganhos', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    { id: 'lost', title: 'Perdidos', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
];

export function KanbanBoard() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            setLeads(data);
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
                                        className="bg-card p-3 rounded-lg border border-border shadow-sm shadow-black/5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                                    >
                                        <h4 className="font-semibold text-sm truncate" title={lead.title}>{lead.title}</h4>
                                        {lead.company && lead.company !== "WhatsApp" && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {lead.company}</p>}
                                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {lead.phone}
                                        </p>
                                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground border-t pt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(lead.updated_at).toLocaleDateString()}
                                            </span>
                                            {lead.value > 0 && <span className="font-semibold text-primary">R$ {lead.value}</span>}
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
        </div>
    );
}
