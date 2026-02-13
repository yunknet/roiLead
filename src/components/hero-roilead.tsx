"use client";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Shield, Zap } from "lucide-react";

export function HeroRoiLead() {
    return (
        <div className="flex flex-col overflow-hidden bg-background">
            <ContainerScroll
                titleComponent={
                    <>
                        <div className="max-w-4xl mx-auto text-center mb-12">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-fade-in">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-sm text-muted-foreground">
                                    Geração de Leads Inteligente via WhatsApp
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-slide-up">
                                Encontre leads qualificados em{" "}
                                <span className="text-gradient">segundos</span>
                            </h1>

                            {/* Subheadline */}
                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up px-4">
                                Busque empresas por região e nicho diretamente no seu WhatsApp.
                                Receba contatos prontos para prospectar.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up px-4">
                                <Link to="/signup">
                                    <Button
                                        variant="hero"
                                        size="xl"
                                        className="group w-full sm:w-auto"
                                    >
                                        Começar Agora
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="heroOutline"
                                    size="xl"
                                    className="w-full sm:w-auto"
                                    onClick={() => document.getElementById("video-section")?.scrollIntoView({ behavior: "smooth" })}
                                >
                                    Ver como funciona
                                </Button>
                            </div>

                            {/* Trust Badges */}
                            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 animate-fade-in px-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Search className="w-5 h-5 text-primary" />
                                    <span className="text-xs sm:text-sm">Busca por região e nicho</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <span className="text-xs sm:text-sm">Dados atualizados</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Zap className="w-5 h-5 text-primary" />
                                    <span className="text-xs sm:text-sm">Resultados em segundos</span>
                                </div>
                            </div>
                        </div>

                    </>
                }
            >
                <div className="w-full h-full bg-card rounded-2xl overflow-hidden shadow-button border border-border flex flex-col">
                    {/* Header Mock */}
                    <div className="h-14 border-b border-border flex items-center px-4 justify-between bg-card/50">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-destructive/80" />
                            <div className="w-3 h-3 rounded-full bg-warning/80" />
                            <div className="w-3 h-3 rounded-full bg-success/80" />
                        </div>
                        <div className="h-2 w-24 bg-muted rounded-full" />
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar Mock */}
                        <div className="w-64 border-r border-border bg-sidebar p-4 hidden md:flex flex-col gap-4">
                            <div className="h-8 bg-sidebar-accent rounded-md w-full animate-pulse" />
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-8 w-full rounded-md flex items-center px-2 hover:bg-sidebar-accent/50 cursor-default">
                                        <div className="w-4 h-4 bg-muted rounded-sm mr-2" />
                                        <div className="h-2 w-20 bg-muted rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content Mock */}
                        <div className="flex-1 p-6 bg-background space-y-6 overflow-auto">
                            {/* Chat Bubble Right */}
                            <div className="flex justify-end">
                                <div className="bg-primary/20 text-foreground p-4 rounded-2xl rounded-tr-none max-w-md shadow-sm">
                                    <p className="text-sm font-medium">Quero empresas de tecnologia em Florianópolis abertas no último ano.</p>
                                </div>
                            </div>

                            {/* Chat Bubble Left */}
                            <div className="flex justify-start w-full">
                                <div className="bg-muted text-foreground p-4 rounded-2xl rounded-tl-none w-full shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <span className="text-[10px] text-primary-foreground font-bold">AI</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">roiLead</span>
                                    </div>

                                    <p className="text-sm text-muted-foreground">Encontrei 5 empresas correspondentes:</p>

                                    <div className="grid gap-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-card border border-border p-3 rounded-lg flex justify-between items-center transform transition-all hover:scale-[1.01]">
                                                <div>
                                                    <div className="h-3 w-32 bg-foreground/80 rounded-full mb-2" />
                                                    <div className="h-2 w-48 bg-muted-foreground/50 rounded-full" />
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <div className="h-4 w-4 bg-primary rounded-sm" />
                                                </div>
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
