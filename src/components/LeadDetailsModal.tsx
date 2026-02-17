import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Users,
    Briefcase,
    Calendar,
    FileText,
    Activity,
    Info,
    AlertTriangle,
    Globe
} from "lucide-react";

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export function LeadDetailsModal({ isOpen, onClose, lead }: LeadDetailsModalProps) {
    if (!lead) return null;

    // Helper to format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch (e) {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ATIVA': return 'bg-green-100 text-green-700 hover:bg-green-100/80';
            case 'BAIXADA': return 'bg-red-100 text-red-700 hover:bg-red-100/80';
            case 'INAPTA': return 'bg-orange-100 text-orange-700 hover:bg-orange-100/80';
            case 'SUSPENSA': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80';
            default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100/80';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <DialogTitle className="text-xl font-bold leading-tight">
                                        {lead.razao_social || lead.nome_fantasia || "Detalhes da Empresa"}
                                    </DialogTitle>
                                    {lead.matriz_filial && (
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                            {lead.matriz_filial}
                                        </Badge>
                                    )}
                                </div>
                                {lead.nome_fantasia && lead.nome_fantasia !== lead.razao_social && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {lead.nome_fantasia}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge className={`${getStatusColor(lead.situacao_cadastral?.situacao_atual)} border-0`}>
                                    {lead.situacao_cadastral?.situacao_atual || "STATUS DESCONHECIDO"}
                                </Badge>
                                {lead.bloqueado && (
                                    <Badge variant="destructive" className="text-[10px]">
                                        BLOQUEADO
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                {lead.cnpj}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Abertura: {formatDate(lead.data_abertura)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                                <Info className="w-4 h-4" />
                                Atualizado em: {formatDate(lead.data_consulta)}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 p-6">
                    <div className="space-y-8">

                        {/* Informações Básicas Detalhadas */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Informações da Empresa
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                    <span className="text-xs text-muted-foreground block">Porte</span>
                                    <span className="font-medium">{lead.porte_empresa?.descricao || "-"}</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                    <span className="text-xs text-muted-foreground block">Capital Social</span>
                                    <span className="font-medium">{formatCurrency(lead.capital_social || 0)}</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg space-y-1 md:col-span-2">
                                    <span className="text-xs text-muted-foreground block">Natureza Jurídica</span>
                                    <span className="font-medium">
                                        {lead.codigo_natureza_juridica} - {lead.descricao_natureza_juridica || lead.natureza_juridica}
                                    </span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                    <span className="text-xs text-muted-foreground block">Responsável Legal</span>
                                    <span className="font-medium">{lead.qualificacao_responsavel?.descricao || "-"}</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                    <span className="text-xs text-muted-foreground block">Situação Cadastral</span>
                                    <span className="font-medium block">
                                        {lead.situacao_cadastral?.situacao_atual} desde {formatDate(lead.situacao_cadastral?.data)}
                                    </span>
                                    {lead.situacao_cadastral?.motivo && lead.situacao_cadastral?.motivo !== "SEM MOTIVO" && (
                                        <span className="text-xs text-red-500 block mt-1">
                                            Motivo: {lead.situacao_cadastral?.motivo}
                                        </span>
                                    )}
                                </div>
                                {lead.situacao_especial?.descricao && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg space-y-1 md:col-span-2">
                                        <span className="text-xs text-yellow-700 block font-semibold flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Situação Especial
                                        </span>
                                        <span className="font-medium text-yellow-900">
                                            {lead.situacao_especial.descricao} ({formatDate(lead.situacao_especial.data)})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <Separator />

                        {/* Endereço Completo */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Localização Completa
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 p-4 bg-muted/30 rounded-lg text-sm space-y-2">
                                    <div className="font-medium text-base">
                                        {lead.endereco?.tipo_logradouro} {lead.endereco?.logradouro}, {lead.endereco?.numero}
                                        {lead.endereco?.complemento && ` - ${lead.endereco.complemento}`}
                                    </div>
                                    <div className="text-muted-foreground">
                                        {lead.endereco?.bairro} - {lead.endereco?.municipio}/{lead.endereco?.uf}
                                    </div>
                                    <div className="text-muted-foreground font-mono bg-background px-2 py-1 rounded w-fit text-xs border">
                                        CEP: {lead.endereco?.cep}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {lead.endereco?.ibge && (
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                            <div className="font-semibold text-muted-foreground flex items-center gap-1">
                                                <Globe className="w-3 h-3" /> Dados Geográficos
                                            </div>
                                            {lead.endereco.ibge.latitude && lead.endereco.ibge.longitude && (
                                                <div className="grid grid-cols-1 gap-1">
                                                    <div><span className="font-mono text-muted-foreground">Lat:</span> {lead.endereco.ibge.latitude}</div>
                                                    <div><span className="font-mono text-muted-foreground">Lon:</span> {lead.endereco.ibge.longitude}</div>
                                                </div>
                                            )}
                                            <div className="pt-1 border-t border-dashed border-muted-foreground/30">
                                                <div><span className="text-muted-foreground">Cód. Município:</span> {lead.endereco.ibge.codigo_municipio}</div>
                                                <div><span className="text-muted-foreground">Cód. UF:</span> {lead.endereco.ibge.codigo_uf}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Contato */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Contatos e Emails
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Telefones */}
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Telefones</span>
                                    {lead.contato_telefonico && lead.contato_telefonico.length > 0 ? (
                                        lead.contato_telefonico.map((tel: any, idx: number) => (
                                            tel.numero && (
                                                <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>({tel.ddd}) {tel.numero}</span>
                                                    {tel.tipo && <Badge variant="outline" className="text-[10px] ml-auto">{tel.tipo}</Badge>}
                                                </div>
                                            )
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Nenhum telefone informado</p>
                                    )}
                                </div>

                                {/* Emails */}
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">Emails</span>
                                    {lead.contato_email && lead.contato_email.length > 0 ? (
                                        lead.contato_email.map((email: any, idx: number) => (
                                            email.email && (
                                                <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <div className="flex flex-col">
                                                        <span className="truncate font-medium" title={email.email}>{email.email}</span>
                                                        {email.dominio && <span className="text-[10px] text-muted-foreground">{email.dominio}</span>}
                                                    </div>
                                                </div>
                                            )
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Nenhum email informado</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Atividades */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Atividades Econômicas
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">Principal</Badge>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-lg text-sm border-l-4 border-primary shadow-sm">
                                        <span className="font-mono text-xs text-primary font-bold mr-2 block mb-1">{lead.atividade_principal?.codigo}</span>
                                        <span className="font-medium text-foreground">{lead.atividade_principal?.descricao}</span>
                                    </div>
                                </div>

                                {lead.atividade_secundaria && lead.atividade_secundaria.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">Atividades Secundárias ({lead.atividade_secundaria.length})</span>
                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                            {lead.atividade_secundaria.map((atv: any, idx: number) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                                    <span className="font-mono text-xs text-muted-foreground mt-0.5 min-w-[50px]">{atv.codigo}</span>
                                                    <span>{atv.descricao}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {lead.quadro_societario && lead.quadro_societario.length > 0 && (
                            <>
                                <Separator />
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Quadro Societário
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {lead.quadro_societario.map((socio: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-transparent hover:border-border transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <UserIcon isPessoaFisica={socio.identificador_socio?.includes("Física")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate" title={socio.nome}>{socio.nome}</p>
                                                        <p className="text-xs text-muted-foreground">{socio.qualificacao_socio}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            {socio.faixa_etaria_descricao && (
                                                                <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border text-muted-foreground">
                                                                    {socio.faixa_etaria_descricao}
                                                                </span>
                                                            )}
                                                            {socio.data_entrada_sociedade && (
                                                                <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border text-muted-foreground">
                                                                    Entrada: {formatDate(socio.data_entrada_sociedade)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Simples / MEI */}
                        {(lead.simples || lead.mei) && (
                            <>
                                <Separator />
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        Regime Tributário
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {lead.simples && (
                                            <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                                                <span className="font-medium block mb-1">Simples Nacional</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Optante:</span>
                                                    <Badge variant={lead.simples.optante ? "outline" : "secondary"} className={lead.simples.optante ? "border-green-500 text-green-600" : ""}>
                                                        {lead.simples.optante ? "SIM" : "NÃO"}
                                                    </Badge>
                                                </div>
                                                {lead.simples.data_opcao_simples && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Opção: {formatDate(lead.simples.data_opcao_simples)}
                                                    </div>
                                                )}
                                                {lead.simples.data_exclusao_simples && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                        Exclusão: {formatDate(lead.simples.data_exclusao_simples)}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {lead.mei && (
                                            <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                                                <span className="font-medium block mb-1">MEI</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Optante:</span>
                                                    <Badge variant={lead.mei.optante ? "outline" : "secondary"} className={lead.mei.optante ? "border-blue-500 text-blue-600" : ""}>
                                                        {lead.mei.optante ? "SIM" : "NÃO"}
                                                    </Badge>
                                                </div>
                                                {lead.mei.data_opcao_mei && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Opção: {formatDate(lead.mei.data_opcao_mei)}
                                                    </div>
                                                )}
                                                {lead.mei.data_exclusao_mei && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                        Exclusão: {formatDate(lead.mei.data_exclusao_mei)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}

                    </div>
                </div>
                <div className="p-2 border-t bg-muted/20 text-[10px] text-center text-muted-foreground">
                    Dados fornecidos por Receita Federal • Versão {lead.versao || "v3"}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UserIcon({ isPessoaFisica }: { isPessoaFisica: boolean }) {
    if (isPessoaFisica) return <Users className="w-4 h-4 text-primary" />;
    return <Building2 className="w-4 h-4 text-primary" />;
}
