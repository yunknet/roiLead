import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Instagram, Linkedin } from "lucide-react";
import { useEffect } from "react";

const teamMembers = [
  {
    name: "Henrique Fernandes",
    role: "Founder / Gestor",
    image: "/Henrique.jpeg",
    instagram: "https://www.instagram.com/paidoroi",
  },
  {
    name: "Aureliano Soares",
    role: "Founder / Desenvolvedor Fullstack",
    image: "/Aureliano.jpeg",
    instagram: "https://www.instagram.com/netinho.so",
    linkedin: "https://www.linkedin.com/in/aureliano-soares-b43247332/",
  }
];

const AboutUs = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />

      <section className="py-20 md:py-32 bg-secondary/30 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-20">
            <div className="space-y-6 flex-1 max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-tight">
                Também vivemos a realidade de quem prospecta clientes
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Criado por quem vive a ineficiência do mercado B2B na pele. Literalmente, criamos o roiLead para ser a solução completa que elimina a desorganização, o amadorismo e a complexidade na hora de encontrar, qualificar e converter empresários e tomadores de decisão.
              </p>
            </div>
            <div className="relative w-full lg:w-[400px] xl:w-[450px] shrink-0">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
              <div className="relative aspect-[4/3] sm:aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border">
                <img
                  src="/equipeRoi.png"
                  alt="Equipe roiLead trabalhando"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-8">
            <span className="text-primary font-bold tracking-widest uppercase text-sm">
              Quem somos nós?
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Tecnologia criada por quem entende o mercado
            </h2>
            <div className="space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              <p>
                Nós vivíamos o caos da prospecção fria e do mercado de leads B2B: falta de organização, burocracia, listas de contatos frias e processos sem eficiência. Faltava uma ferramenta que realmente integrasse a busca, a validação e o contato com os empresários de forma fluida.
              </p>
              <p>
                Unindo conhecimento de gestão e desenvolvimento de software, decidimos criar o que não existia. Assim nasceu o <strong className="text-foreground">roiLead</strong>: para simplificar a prospecção, reduzir o trabalho manual na busca de CNPJs e devolver espaço e tempo para o que realmente importa: fechar bons negócios.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-16 text-center">
            Nossa equipe
          </h2>

          <div className="flex flex-wrap justify-center gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-card rounded-3xl p-6 border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 w-full sm:w-[320px]">
                <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-secondary/50">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=300&background=random`;
                    }}
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{member.role}</p>
                <div className="flex items-center gap-3">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-[#EAE2F8] dark:bg-primary/20 text-[#9C51E0] dark:text-primary flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.instagram && (
                    <a
                      href={member.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-[#EAE2F8] dark:bg-primary/20 text-[#9C51E0] dark:text-primary flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
