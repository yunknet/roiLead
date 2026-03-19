import React, { useState, useEffect } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Shield, Zap, MessageSquare, Bot, CreditCard, Settings, User, Download, Trash2, ArrowLeftRight, ChevronRight, Pause, Info, PlusCircle } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

export function HeroRoiLead() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isManual, setIsManual] = useState(false);

    useEffect(() => {
        if (isManual) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(timer);
    }, [isManual]);

    return (
        <div className="flex flex-col overflow-hidden bg-background">
            <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-8 px-4 text-center">
                <HoverBorderGradient
                    containerClassName="mb-10 mx-auto"
                    className="bg-background text-foreground flex items-center gap-2"
                    as="div"
                >
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm">
                        Geração de Leads Inteligente via WhatsApp
                    </span>
                </HoverBorderGradient>

                <h1 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight animate-slide-up">
                    A maneira mais fácil <br className="hidden sm:block" />
                    de encontrar seu{" "}
                    <span className="text-gradient">próximo</span> cliente
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up px-4">
                    Busque empresas por região e nicho diretamente no seu WhatsApp.
                    Receba contatos prontos para prospectar.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up px-4">
                    <Button
                        variant="hero"
                        size="xl"
                        className="group w-full sm:w-auto"
                        onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                    >
                        Começar Agora
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        variant="heroOutline"
                        size="xl"
                        className="w-full sm:w-auto"
                        onClick={() => document.getElementById("video-section")?.scrollIntoView({ behavior: "smooth" })}
                    >
                        Ver como funciona
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 animate-fade-in text-muted-foreground font-medium">
                    <div className="flex items-center gap-2.5">
                        <Search className="w-5 h-5 text-primary" />
                        <span className="text-sm">Busca por região e nicho</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="text-sm">Dados atualizados</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="text-sm">Resultados em segundos</span>
                    </div>
                </div>
            </div>

            <ContainerScroll
                titleComponent={
                    <>
                        <div className="flex flex-col items-center justify-center px-4 text-center max-w-4xl mx-auto mb-4 animate-fade-in">
                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                                Tudo que você precisa em um dashboard
                            </h2>
                            <p className="text-base md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
                                No seu dashboard você poderá acompanhar o status de todas as suas pesquisas de leads e prospecções em tempo real. 
                                Dentro de cada campanha você terá o controle total, analisando quem já foi abordado, 
                                quem respondeu à IA e quem já está pronto para o fechamento.
                            </p>
                            
                            <div className="flex justify-center gap-3 mt-8">
                                <button 
                                    onClick={() => {setCurrentSlide(0); setIsManual(true);}} 
                                    className={`h-2 rounded-full transition-all duration-500 hover:bg-primary/80 ${currentSlide === 0 ? "w-10 bg-primary" : "w-2 bg-muted-foreground/30"}`} 
                                    title="Ver Histórico"
                                />
                                <button 
                                    onClick={() => {setCurrentSlide(1); setIsManual(true);}} 
                                    className={`h-2 rounded-full transition-all duration-500 hover:bg-primary/80 ${currentSlide === 1 ? "w-10 bg-primary" : "w-2 bg-muted-foreground/30"}`} 
                                    title="Ver CRM Funil"
                                />
                                <button 
                                    onClick={() => {setCurrentSlide(2); setIsManual(true);}} 
                                    className={`h-2 rounded-full transition-all duration-500 hover:bg-primary/80 ${currentSlide === 2 ? "w-10 bg-primary" : "w-2 bg-muted-foreground/30"}`} 
                                    title="Ver Agente IA"
                                />
                            </div>
                        </div>
                    </>
                }
            >
                <div className="w-full h-full bg-card rounded-2xl overflow-hidden shadow-button border border-border flex flex-col">
                    <div className="h-14 border-b border-border flex items-center px-4 justify-between bg-card/50">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-destructive/80" />
                            <div className="w-3 h-3 rounded-full bg-warning/80" />
                            <div className="w-3 h-3 rounded-full bg-success/80" />
                        </div>
                        <div className="h-2 w-24 bg-muted rounded-full" />
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-16 md:w-48 border-r border-border bg-sidebar p-3 hidden sm:flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="h-8 md:h-10 bg-primary/20 rounded-md w-full flex items-center justify-center mb-6">
                                    <span className="hidden md:inline-block text-primary font-bold">roiLead</span>
                                    <span className="md:hidden text-primary font-bold">rL</span>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div onClick={() => {setCurrentSlide(0); setIsManual(true);}} className={`h-10 w-full rounded-md flex items-center px-3 cursor-pointer transition-colors hover:bg-muted ${currentSlide === 0 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                                        <Search className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm">Histórico</span>
                                    </div>
                                    <div onClick={() => {setCurrentSlide(1); setIsManual(true);}} className={`h-10 w-full rounded-md flex items-center px-3 cursor-pointer transition-colors hover:bg-muted ${currentSlide === 1 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                                        <MessageSquare className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm">CRM</span>
                                    </div>
                                    <div onClick={() => {setCurrentSlide(2); setIsManual(true);}} className={`h-10 w-full rounded-md flex items-center px-3 cursor-pointer transition-colors hover:bg-muted ${currentSlide === 2 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                                        <Bot className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm flex-1">Agente IA</span>
                                        {currentSlide === 2 && <span className="hidden md:inline-block bg-primary text-background text-[8px] px-1.5 py-0.5 rounded-sm uppercase">Novo</span>}
                                    </div>
                                    <div className="h-10 w-full rounded-md flex items-center px-3 text-muted-foreground cursor-not-allowed opacity-50">
                                        <CreditCard className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm font-medium">Assinatura</span>
                                    </div>
                                    <div className="h-10 w-full rounded-md flex items-center px-3 text-muted-foreground cursor-not-allowed opacity-50">
                                        <Settings className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm font-medium">Configurações</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hidden md:flex">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                </div>
                                <div className="hidden md:block overflow-hidden">
                                    <div className="text-xs font-semibold truncate">João Silva</div>
                                    <div className="text-[10px] text-muted-foreground truncate">joao@email.com</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                            <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background">
                                <div className="font-semibold text-foreground text-sm">Bem-vindo, João!</div>
                                <div className="text-xs text-muted-foreground cursor-pointer hover:underline">Sair</div>
                            </div>
                            
                            <div className="flex flex-1 overflow-hidden">
                                {currentSlide === 0 && (
                                    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-500">
                                        <div>
                                            <h2 className="text-2xl font-bold text-foreground">Histórico de Pesquisas</h2>
                                            <p className="text-sm text-muted-foreground mt-1">Veja o registro de todas as suas solicitações de leads.</p>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {[
                                                { date: "19/03/2026, 14:30", title: "Indústria Têxtil - Blumenau (SC)", leads: 45 },
                                                { date: "18/03/2026, 09:15", title: "Clínicas Médicas - Belo Horizonte (MG)", leads: 112 },
                                                { date: "17/03/2026, 16:45", title: "Transportadoras - Goiânia (GO)", leads: 87 },
                                                { date: "15/03/2026, 10:20", title: "Agências de Marketing - São Paulo (SP)", leads: 204 },
                                            ].map((item, i) => (
                                                <div key={i} className="bg-card border border-border p-3 sm:p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex flex-col gap-1.5 overflow-hidden pr-2 sm:pr-4 flex-1">
                                                        <span className="text-[10px] text-muted-foreground font-medium">{item.date}</span>
                                                        <span className="text-sm sm:text-base font-bold text-foreground whitespace-normal leading-snug">{item.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-4 border-l border-border/50">
                                                        <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px] bg-success/5 p-2 rounded-xl">
                                                            <span className="text-lg sm:text-2xl font-black text-success leading-none">{item.leads}</span>
                                                            <span className="text-[8px] sm:text-[9px] text-success font-bold tracking-wider mt-1 uppercase">Leads</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {currentSlide === 1 && (
                                    <div className="flex-1 p-6 overflow-y-auto space-y-4 animate-in fade-in duration-500 bg-muted/10">
                                        <div>
                                            <h2 className="text-2xl font-bold text-foreground">CRM - Funil de Vendas</h2>
                                            <p className="text-sm text-muted-foreground mt-1">Arraste os cards para alterar a etapa do lead no funil de vendas.</p>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[400px]">
                                            {[
                                                { name: "Novos", count: 3, color: "bg-blue-100 text-blue-700", border: "border-blue-200" },
                                                { name: "Contatados", count: 0, color: "bg-amber-100 text-amber-700", border: "border-amber-200" },
                                                { name: "Em Negociação", count: 0, color: "bg-orange-100 text-orange-700", border: "border-orange-200" },
                                                { name: "Fechados", count: 0, color: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" }
                                            ].map((col, i) => (
                                                <div key={i} className="flex-shrink-0 w-64 bg-card/50 rounded-xl flex flex-col pt-3 px-3 border border-border">
                                                    <div className={`flex justify-between items-center px-3 py-1.5 rounded-lg mb-3 ${col.color}`}>
                                                        <span className="text-xs font-semibold">{col.name}</span>
                                                        <span className="text-xs font-bold">{col.count}</span>
                                                    </div>
                                                    <div className="flex-1 flex flex-col gap-3">
                                                        {i === 0 ? [
                                                            { name: "Filipe Quirino", date: "18/03/2026" },
                                                            { name: "Gustavo Cunha", date: "18/03/2026" },
                                                            { name: "Palloma Gomes", date: "18/03/2026" }
                                                        ].map((card, j) => (
                                                            <div key={j} className="bg-background border border-border p-3 rounded-xl shadow-sm hover:shadow-md cursor-grab">
                                                                <div className="font-semibold text-sm text-foreground">{card.name}</div>
                                                                <div className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium mt-1 mb-2">Produto</div>
                                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border pt-2">
                                                                    <span>{card.date}</span>
                                                                    <span className="font-semibold text-foreground">R$ 0,00</span>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-xs text-muted-foreground font-medium">
                                                                Solte aqui
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {currentSlide === 2 && (
                                    <div className="flex-1 p-6 overflow-y-auto space-y-6 animate-in fade-in duration-500">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                                                <Bot className="w-5 h-5 text-success" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">Meu Agente de Inteligência Artificial <span className="bg-success text-white text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Novo</span></h2>
                                                <p className="text-xs text-muted-foreground mt-0.5">Crie a personalidade e regras do seu vendedor automático para interagir com leads.</p>
                                            </div>
                                        </div>

                                        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-6 relative overflow-hidden flex flex-col justify-center mb-6">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-bl-full pointer-events-none" />
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-sm">Status do Agente</h3>
                                                    <p className="text-xs text-muted-foreground">Ligar ou desligar a inteligência artificial para novas conversas.</p>
                                                </div>
                                                <div className="w-10 h-5 bg-success rounded-full relative shadow-inner">
                                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                                                </div>
                                            </div>
                                            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Pause className="w-4 h-4 text-warning" />
                                                    <div>
                                                        <div className="text-xs font-bold text-warning-foreground">Pausa Temporária (Handover)</div>
                                                        <div className="text-[10px] text-muted-foreground">O agente está operando normalmente.</div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1.5 border border-warning/50 text-warning rounded-md text-[10px] font-bold">Travar Agente</div>
                                            </div>
                                        </div>

                                        <div className="bg-card border border-border p-5 rounded-xl shadow-sm mb-6">
                                            <h3 className="font-bold text-sm mb-1">Instruções do Vendedor (System Prompt)</h3>
                                            <p className="text-[10px] text-muted-foreground mb-3">Descreva como o seu Agente deve ler, pensar e responder aos clientes.</p>
                                            <div className="w-full bg-muted/30 border border-border rounded-lg p-3 h-24 text-[10px] font-mono text-muted-foreground overflow-hidden">
                                                # IDENTIDADE E MISSÃO<br/>Você é um vendedor especialista focado em contatar empresas...
                                                <br/><br/># REGRAS<br/>Seja direto e persuasivo...
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="w-72 border-l border-border bg-card hidden xl:flex flex-col">
                                    <div className="p-4 border-b border-border space-y-4 bg-sidebar/30">
                                        <div className="flex items-center gap-2 text-success font-semibold">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>WhatsApp</span>
                                        </div>
                                        <div className="relative">
                                            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-muted-foreground" />
                                            <div className="h-8 w-full bg-background rounded-full border border-border text-xs flex items-center pl-8 text-muted-foreground shadow-sm">
                                                Pesquisar conversa...
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-background p-2.5 rounded-lg border border-border shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Bot className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-medium text-foreground">Agente de IA</span>
                                            </div>
                                            <div className="w-8 h-4 bg-success rounded-full relative cursor-pointer opacity-90 shadow-inner">
                                                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {[
                                            { name: "Carlos Silva", msg: "Bom dia, tenho interesse na plataforma." },
                                            { name: "Amanda Ferreira", msg: "Podemos agendar uma reunião hoje?" },
                                            { name: "Construtora Nova Era", msg: "Obrigado pelo envio das cotações." },
                                            { name: "Roberto Macedo", msg: "AIAgent: Olá Roberto, como posso ajudar?" },
                                            { name: "Tech Solutions LTDA", msg: "Envia o relatório por favor." },
                                            { name: "Distribuidora Lider", msg: "Acabei de realizar o pagamento." },
                                        ].map((contact, i) => (
                                            <div key={i} className="p-3 hover:bg-muted rounded-lg cursor-pointer flex flex-col gap-1 transition-colors">
                                                <span className="text-sm font-semibold text-foreground truncate">{contact.name}</span>
                                                <span className="text-[11px] text-muted-foreground truncate">{contact.msg}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ContainerScroll>

            <div className="max-w-4xl mx-auto text-center mt-12 mb-20 relative z-30 px-4">
                <h1 className="text-4xl font-semibold text-foreground mb-8">
                    A inteligência que transforma dados em <br />
                    <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-primary">
                        Receita B2B
                    </span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    Filtre empresas, descubra contatos decisivos e exporte leads qualificados em segundos.
                </p>
            </div>
        </div>
    );
}
