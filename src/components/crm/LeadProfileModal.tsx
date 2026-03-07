import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, MessageCircle, FileText, Phone, Save, Edit2, Check, X, Trash2, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PRODUCT_SUGGESTIONS = [
    "Consórcio",
    "Plano de Saúde",
    "Seguro de Vida",
    "Seguro Auto",
    "Empréstimo",
    "Cartão de Crédito",
    "Investimentos",
    "Energia Solar",
    "Marketing Digital",
    "Mentoria",
    "Software/SaaS",
];

interface LeadProfileModalProps {
    lead: any;
    isOpen: boolean;
    onClose: () => void;
    onCallLead?: (phone: string, title?: string) => void;
    onUpdateNotes?: (leadId: string, newNotes: string) => void;
    onUpdateValue?: (leadId: string, newValue: number) => void;
    onUpdateProduct?: (leadId: string, newProduct: string) => void;
    onDeleteLead?: (leadId: string) => void;
}

// Converte centavos para string formatada "R$ X.XXX,XX"
function formatCurrency(cents: number): string {
    const value = cents / 100;
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converte valor numérico (ex: 150.5) para centavos inteiros
function toCents(value: number): number {
    return Math.round(value * 100);
}

export function LeadProfileModal({ lead, isOpen, onClose, onCallLead, onUpdateNotes, onUpdateValue, onUpdateProduct, onDeleteLead }: LeadProfileModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Value editing - em centavos para máscara monetária
    const [valueCents, setValueCents] = useState(0);
    const [showEditValue, setShowEditValue] = useState(false);

    // Product tag editing
    const [productTag, setProductTag] = useState('');
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [productInputValue, setProductInputValue] = useState('');

    useEffect(() => {
        if (lead) {
            setNotes(lead.notes || '');
            setValueCents(toCents(lead.value || 0));
            setProductTag(lead.product_tag || '');
            setProductInputValue(lead.product_tag || '');
            setIsEditingProduct(false);
        }
    }, [lead]);

    if (!lead) return null;

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('crm_leads')
                .update({ notes: notes })
                .eq('id', lead.id);

            if (error) {
                console.error(error);
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

    // Máscara de moeda: o usuário digita números e o campo formata automaticamente
    const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove tudo que não é dígito
        const raw = e.target.value.replace(/\D/g, '');
        const cents = parseInt(raw || '0', 10);
        setValueCents(cents);
    };

    const handleSaveValue = async () => {
        const realValue = valueCents / 100;
        try {
            const { error } = await supabase
                .from('crm_leads')
                .update({ value: realValue, updated_at: new Date().toISOString() })
                .eq('id', lead.id);

            if (error) throw error;
            setShowEditValue(false);
            if (onUpdateValue) onUpdateValue(lead.id, realValue);
            toast.success("Valor atualizado!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar o valor.");
        }
    };

    const handleSaveProduct = async () => {
        const trimmed = productInputValue.trim();
        try {
            const { error } = await supabase
                .from('crm_leads')
                .update({ product_tag: trimmed, updated_at: new Date().toISOString() })
                .eq('id', lead.id);

            if (error) throw error;
            setProductTag(trimmed);
            setIsEditingProduct(false);
            if (onUpdateProduct) onUpdateProduct(lead.id, trimmed);
            toast.success("Produto atualizado!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar o produto.");
        }
    };

    const confirmDeleteLead = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('crm_leads')
                .delete()
                .eq('id', lead.id);

            if (error) throw error;

            toast.success("Lead removido permanentemente!");
            if (onDeleteLead) onDeleteLead(lead.id);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao remover o sistema não processou sua solicitação.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col gap-0 max-h-[90vh]">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {lead.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 flex-wrap">
                        {lead.request_details && <span className="flex items-center gap-1 bg-green-100 text-green-700 font-medium px-2 py-1 rounded border border-green-200"><Building2 className="w-3 h-3" /> {lead.request_details}</span>}
                        {/* Etiqueta azul do produto */}
                        <span
                            className="flex items-center gap-1 bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={() => { setIsEditingProduct(true); setProductInputValue(productTag); }}
                            title="Clique para editar o produto"
                        >
                            <ShoppingBag className="w-3 h-3" /> {productTag || 'Produto'}
                        </span>
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
                                        <span className="text-muted-foreground">Nicho/Busca:</span>
                                        <span className="font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block w-max text-xs">{lead.request_details || "-"}</span>
                                    </div>

                                    {/* Produto/Venda - Etiqueta azul editável */}
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <span className="text-muted-foreground">Produto:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-block w-max text-xs">
                                                {productTag || 'Produto'}
                                            </span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => {
                                                setProductInputValue(productTag);
                                                setIsEditingProduct(true);
                                            }}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {lead.company && lead.company !== "WhatsApp" && (
                                        <div className="grid grid-cols-[100px_1fr] gap-2">
                                            <span className="text-muted-foreground">Sócios:</span>
                                            <span className="font-medium text-xs leading-relaxed">{lead.company}</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="text-muted-foreground">Telefone:</span>
                                        <span className="font-medium">{lead.phone || "-"}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <span className="text-muted-foreground">Valor Estimado:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-600 font-bold">R$ {formatCurrency(toCents(lead.value || 0))}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => {
                                                setValueCents(toCents(lead.value || 0));
                                                setShowEditValue(true);
                                            }}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                        </div>
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

                <div className="p-4 border-t bg-muted/10 flex justify-between gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? "Removendo..." : "Remover Lead"}
                    </Button>
                    <div className="flex gap-2">
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
                </div>
            </DialogContent>

            {/* Modal Profissional de Confirmação de Remoção */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Tem certeza que deseja apagar o lead <strong>{lead.title}</strong> do CRM permanentemente? Todos os históricos e anotações atreladas a esse lead serão perdidos.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteLead} disabled={isDeleting}>
                            {isDeleting ? "Excluindo..." : "Sim, excluir lead"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Atualização de Valor com Máscara Monetária */}
            <Dialog open={showEditValue} onOpenChange={setShowEditValue}>
                <DialogContent className="sm:max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Atualizar Valor Estimado</DialogTitle>
                        <DialogDescription>
                            Defina o valor monetário estimado para esta negociação.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                            <Input
                                value={formatCurrency(valueCents)}
                                onChange={handleCurrencyInput}
                                className="pl-9 h-12 text-lg font-semibold text-right"
                                inputMode="numeric"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Digite apenas os números. O valor é formatado automaticamente.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowEditValue(false);
                            setValueCents(toCents(lead.value || 0));
                        }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveValue} className="bg-green-600 hover:bg-green-700 text-white">
                            Salvar Valor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Edição do Produto */}
            <Dialog open={isEditingProduct} onOpenChange={setIsEditingProduct}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-blue-600" /> O que você está vendendo?
                        </DialogTitle>
                        <DialogDescription>
                            Defina o produto ou serviço que você está oferecendo para este lead.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input
                            value={productInputValue}
                            onChange={(e) => setProductInputValue(e.target.value)}
                            placeholder="Ex: Consórcio, Plano de Saúde, Seguro..."
                            className="h-11"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveProduct()}
                        />
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Sugestões rápidas:</p>
                            <div className="flex flex-wrap gap-2">
                                {PRODUCT_SUGGESTIONS.map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setProductInputValue(suggestion)}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${productInputValue === suggestion
                                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                            }`}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsEditingProduct(false);
                            setProductInputValue(productTag);
                        }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveProduct} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Salvar Produto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
