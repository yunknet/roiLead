import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, MessageCircle, FileText, Phone, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LeadProfileModalProps {
    lead: any;
    isOpen: boolean;
    onClose: () => void;
    onCallLead?: (phone: string, title?: string) => void;
    onUpdateNotes?: (leadId: string, newNotes: string) => void;
}

export function LeadProfileModal({ lead, isOpen, onClose, onCallLead, onUpdateNotes }: LeadProfileModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (lead) {
            setNotes(lead.notes || '');
        }
    }, [lead]);

    if (!lead) return null;

    const handleSaveNotes = async () => {
        setIsSaving(true);
        // We simulate saving or actually try to save to the "notes" column if it exists.
        // Se a coluna não existir no backend de prod, isso pode falhar. Usaremos try/catch.
        try {
            const { error } = await supabase
                .from('crm_leads')
                .update({ notes: notes })
                .eq('id', lead.id);

            if (error) {
                console.error(error);
                // Fallback gracefully without throwing so the user's UI doesn't break
                toast.error("Você precisa aplicar as migrations de dados no servidor antes de salvar notas ou verifique seus logs.");
            } else {
                toast.success("Anotações salvas com sucesso!");
                if (onUpdateNotes) onUpdateNotes(lead.id, notes);
            }
        } catch (e) {
            toast.error("Erro interno ao salvar as anotações.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col gap-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {lead.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        {lead.company && lead.company !== "WhatsApp" && <span className="flex items-center gap-1 bg-background px-2 py-1 rounded border"><Building2 className="w-3 h-3" /> {lead.company}</span>}
                        <span className="flex items-center gap-1 bg-background px-2 py-1 rounded border"><Phone className="w-3 h-3" /> {lead.phone}</span>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex items-center border-b px-6 pt-2 gap-4 text-sm font-medium">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-2 border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-muted-foreground'}`}
                    >
                        Dados da Empresa
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`pb-2 border-b-2 transition-colors ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-muted-foreground'}`}
                    >
                        Histórico / Anotações
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' ? (
                        <div className="space-y-4">
                            <div className="space-y-2 relative">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                    <Building2 className="w-4 h-4" /> Informações
                                </h4>
                                <div className="bg-muted/30 p-4 rounded-lg border text-sm space-y-3">
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-muted-foreground">Nome:</span>
                                        <span className="font-medium">{lead.title}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-muted-foreground">Referência:</span>
                                        <span className="font-medium">{lead.company || "-"}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-muted-foreground">Telefone:</span>
                                        <span className="font-medium">{lead.phone || "-"}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-muted-foreground">Valor Estimado:</span>
                                        <span className="text-green-600 font-bold">R$ {lead.value || "0,00"}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4 italic">
                                    Para leads importados da pesquisa do roiLead, os dados mais avançados podem ser vistos clicando no botão "Visualizar Completo" diretamente na página de pesquisa onde o CNPJ foi extraído.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 flex flex-col h-full min-h-[300px]">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                <FileText className="w-4 h-4" /> Anotações do Lead
                            </h4>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Adicione notas sobre as negociações, interesses ou histórico do cliente..."
                                className="flex-1 w-full min-h-[200px] p-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleSaveNotes} disabled={isSaving} size="sm" className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {isSaving ? "Salvando..." : "Salvar Anotações"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                    <Button onClick={() => {
                        if (onCallLead) onCallLead(lead.phone, lead.title);
                        onClose();
                    }} className="gap-2 bg-green-500 hover:bg-green-600 text-white border-none shadow-md">
                        <MessageCircle className="w-4 h-4" />
                        Chamar no WhatsApp
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
