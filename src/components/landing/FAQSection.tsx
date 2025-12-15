import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona a busca de leads?",
    answer: "Você conecta seu WhatsApp e envia comandos de busca como 'Quero 5 empresas de tecnologia em São Paulo'. Nossa IA encontra leads qualificados com base nos seus critérios e retorna os contatos diretamente no chat.",
  },
  {
    question: "Preciso instalar algum aplicativo?",
    answer: "Não! Você usa seu próprio WhatsApp. Basta conectar seu número via QR Code e pronto. Toda interação acontece no seu chat normal.",
  },
  {
    question: "De onde vêm os dados dos leads?",
    answer: "Trabalhamos com bases de dados empresariais atualizadas, incluindo CNPJ, razão social, telefones, emails e endereços verificados. Os dados são enriquecidos e validados regularmente.",
  },
  {
    question: "Posso filtrar leads por região específica?",
    answer: "Sim! Você pode buscar por cidade, estado, região ou até bairro. Por exemplo: 'Empresas de saúde na zona sul de São Paulo' ou 'Indústrias em Santa Catarina'.",
  },
  {
    question: "Os leads vêm com telefone de WhatsApp?",
    answer: "Fornecemos telefones comerciais verificados. Alguns podem ser WhatsApp, outros telefones fixos. Você recebe todas as informações disponíveis para contato.",
  },
  {
    question: "Posso exportar os leads?",
    answer: "Sim! Nos planos Professional e Enterprise você pode exportar suas listas de leads em CSV para usar em CRMs ou planilhas.",
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
