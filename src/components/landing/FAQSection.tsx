import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona a busca de leads?",
    answer: "É muito simples: envie uma mensagem no WhatsApp descrevendo o que precisa e nossa IA faz o resto. Você pode pedir algo direto como '3 construtoras em Curitiba' ou ser bem específico: 'Empresas de TI em São Paulo, abertas há menos de 2 anos com capital acima de 50 mil'. Em segundos, você recebe os contatos prontos para prospectar.",
  },
  {
    question: "De onde vêm os dados dos leads?",
    answer: "Trabalhamos com bases de dados empresariais atualizadas, incluindo CNPJ, razão social, telefones, emails e endereços verificados. Os dados são enriquecidos e validados regularmente.",
  },
  {
    question: "Posso filtrar leads por região específica?",
    answer: "Sim! Você pode buscar por cidade, estado ou região. Por exemplo: 'Empresas de saúde em São Paulo' ou 'Indústrias em Santa Catarina'.",
  },
  {
    question: "Os leads vêm com telefone de WhatsApp?",
    answer: "Fornecemos telefones comerciais verificados. Alguns podem ser WhatsApp, outros telefones fixos. Você recebe todas as informações disponíveis para contato.",
  },
  {
    question: "Posso exportar os leads para uma planilha Excel?",
    answer: "Sim! Você pode exportar seus leads gerados diretamente para uma planilha Excel através do painel do usuário.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tire suas dúvidas sobre a plataforma.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 bg-card data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
