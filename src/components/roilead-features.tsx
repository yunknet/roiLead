"use client";

import {
    Search,
    MapPin,
    Filter,
    MessageCircle,
    ShieldCheck,
    Zap,
    BarChart3,
    Lock
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function RoiLeadFeatures() {
    return (
        <section className="py-20 bg-background" id="features">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
                    Tudo o que você precisa para <span className="text-emerald-500">vender mais</span>
                </h2>

                {/* Grid ajustado para 1 coluna (mobile), 2 (tablet), 4 (desktop) */}
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {features.map((feature, index) => (
                        <GridItem
                            key={index}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                        />
                    ))}
                </ul>
            </div>
        </section>
    );
}

// Dados extraídos da imagem de referência do roiLead
const features = [
    {
        title: "Busca Inteligente de Leads",
        description: "Encontre empresas por nicho, região, tamanho e outros critérios diretamente no WhatsApp.",
        icon: <Search className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Filtro por Localização",
        description: "Busque leads em cidades, estados ou regiões específicas para prospecção local.",
        icon: <MapPin className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Segmentação por Nicho",
        description: "Filtre empresas por setor de atuação: tecnologia, saúde, varejo, indústria e mais.",
        icon: <Filter className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Integração WhatsApp",
        description: "Conecte seu número e receba leads diretamente no chat. Prospecte sem sair do WhatsApp.",
        icon: <MessageCircle className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Dados Verificados",
        description: "Leads com informações atualizadas: telefone, email, endereço e responsável.",
        icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Resultados Instantâneos",
        description: "Receba listas de leads em segundos. Sem espera, sem processos complicados.",
        icon: <Zap className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Histórico de Buscas",
        description: "Acompanhe suas buscas anteriores e leads salvos para organizar sua prospecção.",
        icon: <BarChart3 className="h-6 w-6 text-emerald-500" />,
    },
    {
        title: "Dados Seguros",
        description: "Suas buscas e contatos são privados. Isolamento total entre clientes.",
        icon: <Lock className="h-6 w-6 text-emerald-500" />,
    },
];

interface GridItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const GridItem = ({ icon, title, description }: GridItemProps) => {
    return (
        <li className="list-none min-h-[14rem]">
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3 bg-secondary/50">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-border bg-card p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-6">
                    <div className="relative flex flex-1 flex-col justify-start gap-4">
                        <div className="w-fit rounded-lg border-[0.75px] border-border bg-secondary p-3">
                            {icon}
                        </div>
                        <div className="space-y-3">
                            <h3 className="pt-0.5 text-lg leading-tight font-semibold font-sans tracking-tight md:text-xl text-foreground">
                                {title}
                            </h3>
                            <p className="font-sans text-sm leading-relaxed md:text-base text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};
