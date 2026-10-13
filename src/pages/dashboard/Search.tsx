import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Lock,
  Search as SearchIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LeadDetailsModal } from '@/components/LeadDetailsModal';
import { LeadSearchForm } from '@/components/crm/LeadSearchForm';

export default function Search() {
  const navigate = useNavigate();
  const { hasActiveSubscription, userProfile } = useOutletContext<any>();
  const [leadRequests, setLeadRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cleanPhone = userProfile?.phone_number ? userProfile.phone_number.replace(/\D/g, '') : '';
        let queryBuilder = supabase
          .from('lead_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (cleanPhone && cleanPhone.length > 5) {
          const phoneWith55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const phoneWithout55 = cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone;
          queryBuilder = queryBuilder.or(`user_id.eq.${user.id},phone_number.eq.${cleanPhone},phone_number.eq.${phoneWith55},phone_number.eq.${phoneWithout55}`);
        } else {
          queryBuilder = queryBuilder.eq('user_id', user.id);
        }

        const { data, error } = await queryBuilder;
        if (!error && data) setLeadRequests(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userProfile !== undefined) fetchRequests();
  }, [userProfile, refreshKey]);

  const filteredRequests = leadRequests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const details = JSON.stringify(req.request_details || '').toLowerCase();
    const term = normalize(searchQuery);
    return normalize(details).includes(term);
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleOpenContact = async (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Número de telefone não encontrado.');
      return;
    }
    if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    toast.success('Abrindo contato...');
  };

  if (loading) return null;

  return (
    <div className="flex flex-1 h-full min-h-0">
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full">
        <div className="space-y-6">
          {hasActiveSubscription && (
            <LeadSearchForm onSearchComplete={() => setRefreshKey(prev => prev + 1)} />
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">Histórico de Pesquisas</h2>
                  {hasActiveSubscription && (
                    <span className="text-xs font-medium px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 flex items-center gap-1.5 w-fit">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Aviso: Exporte seus leads! O histórico é deletado automaticamente após 7 dias.
                    </span>
                  )}
                </div>
              <p className="text-muted-foreground">
                {hasActiveSubscription ? 'Veja o registro de todas as suas solicitações de leads.' : 'Assine um plano para realizar pesquisas e ver seu histórico.'}
              </p>
            </div>
            {hasActiveSubscription && (
              <div className="w-full sm:w-[320px] relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar no histórico..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            )}
          </div>

          {!hasActiveSubscription ? (
            <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Histórico Bloqueado</h3>
              <p className="text-muted-foreground max-w-md mb-8">Para iniciar a busca por leads e acessar o histórico, é necessário assinar um plano.</p>
              <Button size="lg" onClick={() => navigate('/dashboard/subscription')}>Ver Planos</Button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Nenhuma pesquisa encontrada</h3>
              <p className="text-muted-foreground max-w-md">{searchQuery ? `Não encontramos resultados para "${searchQuery}".` : 'Você ainda não realizou nenhuma pesquisa com o roiLead.'}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedRequests.map((req) => (
                  <RequestCard key={req.id} request={req} onDelete={() => setLeadRequests(current => current.filter(r => r.id !== req.id))} onCallLead={(lead) => {
                    const rawPhone = lead.telefone || lead.Telefone || lead.contato_telefonico?.[0]?.completo || lead.contato_telefonico?.[0]?.numero || '';
                    handleOpenContact(rawPhone);
                  }} />
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 py-4 relative">
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1 border-border/60">
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <span className="text-sm font-medium px-4 text-muted-foreground whitespace-nowrap">Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1 border-border/60">
                      Próximo <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="sm:absolute sm:right-0 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar:</span>
                  <select className="h-8 text-xs rounded-md border border-border bg-card px-2 outline-none focus:ring-1 focus:ring-primary/30" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                    <option value={10}>10 leads</option>
                    <option value={50}>50 leads</option>
                    <option value={200}>200 leads</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const RequestCard = ({ request, onDelete, onCallLead }: { request: any, onDelete?: () => void, onCallLead?: (lead: any) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [page, setPage] = useState(1);
  const date = new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let queryText = 'Pesquisa de Leads';
  if (request.request_details) {
    if (typeof request.request_details === 'string') queryText = request.request_details;
    else if (typeof request.request_details === 'object') {
      queryText = request.request_details.message || request.request_details.query || 'Detalhes da pesquisa';
      if (queryText === 'Detalhes da pesquisa' && Object.keys(request.request_details).length > 0) {
        queryText = JSON.stringify(request.request_details).substring(0, 50) + '...';
      }
    }
  }

  let leads: any[] = [];
  try {
    let rawData = request.leads_data;
    if (typeof rawData === 'string') {
      try { rawData = JSON.parse(rawData); } catch (e) {
        try { rawData = JSON.parse(rawData.replace(/\\n/g, '').replace(/\\"/g, '"')); } catch (e2) { }
      }
    }
    if (typeof rawData === 'string') { try { rawData = JSON.parse(rawData); } catch (e) { } }
    if (Array.isArray(rawData)) leads = rawData.flatMap((item: any) => item.cnpjs || [item]);
    else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.cnpjs)) leads = rawData.cnpjs;
      else if (Array.isArray(rawData.leads)) leads = rawData.leads;
      else if (Array.isArray(rawData.data)) leads = rawData.data;
      else if (Array.isArray(rawData.companies)) leads = rawData.companies;
    }
  } catch (err) {}

  useEffect(() => { setPage(1); }, [request.id]);
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE);
  const paginatedLeads = leads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (leads.length === 0) return toast.error('Não há leads para exportar.');
    try {
      const exportData = leads.map(lead => ({
        Nome: lead.nome_fantasia || lead['Nome Fantasia'] || lead.razao_social || lead['Razão Social'] || 'N/A',
        CNPJ: lead.cnpj || lead.CNPJ || '',
        Telefone: lead.contato_telefonico?.[0]?.completo || (lead.contato_telefonico?.[0]?.ddd && lead.contato_telefonico?.[0]?.numero ? `(${lead.contato_telefonico[0].ddd}) ${lead.contato_telefonico[0].numero}` : lead.contato_telefonico?.[0]?.numero) || lead.Telefone || '',
        Email: lead.contato_email?.[0]?.email || lead.Email || '',
        Cidade: lead.endereco?.municipio || lead.Cidade || '',
        UF: lead.endereco?.uf || lead.UF || '',
        Logradouro: lead.endereco?.logradouro || '',
        Bairro: lead.endereco?.bairro || '',
        Porte: lead.porte_empresa?.descricao || lead.Porte || '',
        'Atividade Principal': lead.atividade_principal?.descricao || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `leads_roilead_${request.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Exportado com sucesso!');
    } catch (error) { toast.error('Erro ao gerar arquivo Excel.'); }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('lead_requests').delete().eq('id', request.id);
      if (error) throw error;
      toast.success('Histórico excluído');
      if (onDelete) onDelete();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleting) return null;

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-primary/50">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-accent/5" onClick={() => setExpanded(!expanded)}>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{date}</span>
            <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1" title={queryText}>{queryText}</h4>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-primary/10 text-primary min-w-[60px] leading-tight">
              <span className="text-sm font-black">{leads.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">Leads</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-2 hidden sm:flex">
              <Download className="w-3.5 h-3.5" /> <span className="sr-only sm:not-sr-only">Excel</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </Button>
            {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
        {expanded && (
          <div className="border-t border-border bg-muted/30 p-4 animate-in slide-in-from-top-2">
            {leads.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {paginatedLeads.map((lead, idx) => {
                    const nome = lead.nome_fantasia || lead['Nome Fantasia'] || lead.razao_social || lead['Razão Social'] || 'Empresa sem nome';
                    const porte = lead.porte_empresa?.descricao || lead.Porte || 'N/A';
                    const cnpj = lead.cnpj || lead.CNPJ || '';
                    const cidade = lead.endereco?.municipio || lead.Cidade || '';
                    const uf = lead.endereco?.uf || lead.UF || '';
                    const telObj = lead.contato_telefonico?.[0];
                    const telefone = telObj?.completo || (telObj?.ddd && telObj?.numero ? `(${telObj.ddd}) ${telObj.numero}` : telObj?.numero) || lead.Telefone || 'N/A';
                    const email = lead.contato_email?.[0]?.email || lead.Email || 'N/A';

                    return (
                      <div key={idx} className="bg-background border border-border rounded-md p-3 text-sm space-y-2 shadow-sm relative group">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-primary line-clamp-1" title={nome}>{nome}</h5>
                          <div className="flex flex-col gap-1.5 shrink-0 items-end">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }} className="w-full text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium transition-colors border border-green-200 whitespace-nowrap">Visualizar Completo</button>
                            <button onClick={(e) => { e.stopPropagation(); if (onCallLead) onCallLead({ ...lead, telefone, nome_fantasia: nome }); }} className="w-full text-[10px] bg-[#2ecc71] text-black hover:bg-[#27ae60] px-2 py-1 rounded font-bold transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap">
                              <MessageCircle className="w-3 h-3" /> Chamar
                            </button>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) return toast.error('Usuário não logado');
                                const notesStr = `Nicho: ${lead.atividade_principal?.descricao ? lead.atividade_principal.descricao.substring(0, 50) : 'Geral'} | CNPJ: ${cnpj} | Porte: ${porte} | Tel: ${telefone} | Email: ${email} | Loc: ${cidade}/${uf}`;
                                const { error } = await supabase.from('crm_leads').insert({ user_id: user.id, title: nome, phone: telefone, notes: notesStr, status: 'new' });
                                if (error) throw error;
                                toast.success('Enviado para a coluna Novos do CRM!');
                              } catch (err: any) { toast.error(err.message || 'Erro ao enviar pro CRM'); }
                            }} className="w-full text-[10px] bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded font-bold transition-colors flex items-center justify-center shadow-sm whitespace-nowrap mt-1">Enviar p/ CRM</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-muted-foreground">
                          <div className="mb-1"><span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground whitespace-nowrap inline-block">{porte}</span></div>
                          <p className="truncate"><span className="font-medium text-foreground">CNPJ:</span> {cnpj}</p>
                          <p className="truncate"><span className="font-medium text-foreground">Local:</span> {cidade}/{uf}</p>
                          <p className="truncate"><span className="font-medium text-foreground">Tel:</span> {telefone}</p>
                          <p className="truncate" title={email}><span className="font-medium text-foreground">Email:</span> {email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="gap-1 h-8 text-xs"><ChevronLeft className="h-3 w-3" /> Anterior</Button>
                    <span className="text-xs font-medium px-2 text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gap-1 h-8 text-xs">Próximo <ChevronRight className="h-3 w-3" /></Button>
                  </div>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado detalhado disponível.</p>}
          </div>
        )}
      </div>
      <LeadDetailsModal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} lead={selectedLead} />
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmar Exclusão</DialogTitle><DialogDescription className="pt-2">Tem certeza que deseja excluir permanentemente o histórico da pesquisa <strong>{queryText}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-between items-center w-full"><Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancelar</Button><Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Excluindo...' : 'Sim, excluir'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

