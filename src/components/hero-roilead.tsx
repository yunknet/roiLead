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
            setCurrentSlide((prev) => (prev + 1) % 2);
        }, 5000);
        return () => clearInterval(timer);
    }, [isManual]);

    return (
        <div className="flex flex-col overflow-hidden bg-background">
            <div className="max-w-7xl mx-auto pt-8 sm:pt-12 pb-8 px-4 text-center">
                <p className="text-primary text-xs sm:text-sm font-bold tracking-widest uppercase mb-6 mx-auto animate-slide-up">
                    Geração de Leads Inteligente via Contato
                </p>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-medium text-foreground mb-6 leading-[1.1] animate-slide-up tracking-tight">
                    A maneira mais fácil <br className="hidden sm:block" />
                    de encontrar seu{" "}
                    <span className="font-extrabold text-gradient">próximo</span> cliente
                </h1>

                <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto animate-slide-up px-4 font-light">
                    Busque empresas por região e nicho diretamente no seu Contato.
                    Receba contatos prontos para prospectar.
                </p>

                <div className="w-full max-w-[90vw] md:max-w-7xl mx-auto mb-8 px-2 sm:px-6 lg:px-8 xl:px-0 animate-slide-up">
                    <VturbVideo />
                </div>

                <div className="flex flex-col items-center justify-center gap-4 mb-12 animate-slide-up px-4">
                    <Button
                        variant="hero"
                        size="xl"
                        className="group w-full sm:w-auto"
                        onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                    >
                        Começar Agora
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
                                        <span className="hidden md:block text-sm">roiLead</span>
                                    </div>
                                    <div onClick={() => {setCurrentSlide(1); setIsManual(true);}} className={`h-10 w-full rounded-md flex items-center px-3 cursor-pointer transition-colors hover:bg-muted ${currentSlide === 1 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                                        <MessageSquare className="w-4 h-4 md:mr-3" />
                                        <span className="hidden md:block text-sm">CRM</span>
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
                                        
                                        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm mb-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Search className="w-4 h-4 text-primary" />
                                                <h3 className="text-lg font-bold text-foreground">Nova Busca de Leads</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-foreground">Palavra-chave</label>
                                                    <div className="h-9 bg-background border border-border rounded-md px-3 flex items-center text-xs text-muted-foreground">Ex: Engenharia Civil...</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-foreground">Estado(s)</label>
                                                    <div className="h-9 bg-background border border-border rounded-md px-3 flex items-center text-xs text-muted-foreground">Ex: SP, MG</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-lg border border-border">
                                                    <span className="text-xs font-semibold">Quantidade:</span>
                                                    <span className="text-xs bg-background px-2 py-0.5 rounded border border-border">50</span>
                                                </div>
                                                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 cursor-pointer">
                                                    <Search className="w-3.5 h-3.5" /> Minerar Leads
                                                </div>
                                            </div>
                                        </div>

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

const VturbVideo = () => {
  useEffect(() => {
    const scriptId = "vturb-script-69c57ed15341b955f71f8592";
    if (!document.getElementById(scriptId)) {
        const s = document.createElement("script");
        s.id = scriptId;
        s.src = "https://scripts.converteai.net/9b95671b-5a37-4971-bb6c-6d970b6b4a27/players/69c57ed15341b955f71f8592/v4/player.js";
        s.async = true;
        document.head.appendChild(s);
    }
  }, []);

  return (
    <div className="w-full relative shadow-2xl rounded-2xl overflow-hidden mx-auto" style={{ aspectRatio: '16/9' }}>
      {/* @ts-expect-error Vturb custom element */}
      <vturb-smartplayer id="vid-69c57ed15341b955f71f8592" style={{ display: "block", margin: "0 auto", width: "100%", height: "100%" }}></vturb-smartplayer>
    </div>
  );
};
