import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "framer-motion";

const testimonials = [
    {
        text: "O sistema transformou nossa prospecção. Agora conseguimos listas de construtoras com WhatsApp em segundos, direto na palma da mão!",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
        name: "Mariana Souza",
        role: "Gestora de Vendas",
    },
    {
        text: "A integração com o agente inteligente é surreal. Ele qualifica os leads B2B de forma automática, economizando horas da minha equipe comercial.",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop",
        name: "Carlos Mendes",
        role: "Diretor Comercial",
    },
    {
        text: "Ter acesso ao capital social e CNAE exato das empresas mudou o nosso jogo. Exportar os dados enriquecidos pelo Dashboard é muito prático.",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
        name: "Amanda Costa",
        role: "Analista de Inteligência",
    },
    {
        text: "Antes perdíamos dias a procurar empresas no Google. Agora eu peço 'farmácias em SP que não são MEI' e a inteligência traz a lista na hora.",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop",
        name: "Roberto Almeida",
        role: "Sócio-Fundador",
    },
    {
        text: "O modelo de distribuição de leads em tempo real deixou nossos vendedores muito mais ágeis. Quem demora a clicar, perde a oportunidade!",
        image: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?q=80&w=200&auto=format&fit=crop",
        name: "Juliana Silva",
        role: "Coordenadora de SDRs",
    },
    {
        text: "A inteligência comercial por trás da plataforma é fantástica. Filtros super precisos que nos colocam direto a falar com o decisor da empresa.",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop",
        name: "Thiago Fernandes",
        role: "Consultor de Negócios",
    },
    {
        text: "Implementação incrivelmente rápida. Em menos de 24 horas já estávamos a prospectar dezenas de imobiliárias na nossa região com contatos quentes.",
        image: "https://images.unsplash.com/photo-1508214751196-bfd1411c8cb4?q=80&w=200&auto=format&fit=crop",
        name: "Beatriz Nogueira",
        role: "Gerente de Marketing",
    },
    {
        text: "O próprio nome já diz. O ROI que tivemos no primeiro mês de uso pagou a ferramenta para o ano todo. Extremamente assertivo.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
        name: "Lucas Ferreira",
        role: "CEO",
    },
    {
        text: "A melhor plataforma de enriquecimento B2B. A interface é rápida e o facto de consultar as bases oficiais garante que os números funcionam.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
        name: "Camila Rocha",
        role: "Gerente de Operações",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export function Testimonials() {
    return (
        <section className="bg-background my-20 relative">
            <div className="container z-10 mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
                >
                    <div className="flex justify-center">
                        <div className="border border-primary/20 bg-primary/5 text-primary py-1 px-4 rounded-full text-sm font-medium">
                            Resultados Reais
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mt-6 text-center">
                        O que dizem os nossos clientes
                    </h2>
                    <p className="text-center mt-4 text-muted-foreground text-lg">
                        Veja como empresas estão a escalar as suas vendas utilizando a nossa inteligência de dados B2B.
                    </p>
                </motion.div>

                <div className="flex justify-center gap-6 mt-14 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] max-h-[740px] overflow-hidden">
                    <TestimonialsColumn testimonials={firstColumn} duration={15} />
                    <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
                    <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
                </div>
            </div>
        </section>
    );
}
