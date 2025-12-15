import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona o isolamento de dados entre clientes?",
    answer: "Cada cliente possui um tenant completamente isolado. Nenhum dado, conversa, contato ou histórico pode ser acessado por outro cliente. O administrador da plataforma visualiza apenas métricas de uso, nunca o conteúdo das mensagens.",
  },
  {
    question: "Preciso de conhecimento técnico para usar?",
    answer: "Não! A plataforma foi desenvolvida para ser intuitiva. Você conecta seu WhatsApp via QR Code, configura suas mensagens de prospecção e ativa os agentes de IA em poucos cliques.",
  },
  {
    question: "Como funciona a cobrança?",
    answer: "O pagamento é feito via Hubla de forma recorrente. Sem pagamento ativo, as funcionalidades de envio e agentes de IA são automaticamente bloqueadas. Você pode cancelar a qualquer momento.",
  },
  {
    question: "Os agentes de IA podem enviar qualquer mensagem?",
    answer: "Não. Todas as mensagens passam por um orquestrador central que controla qual agente responde, quando responde e se a mensagem pode ser enviada. Mensagens de prospecção são previamente definidas e controladas.",
  },
  {
    question: "Como funciona a proteção contra spam?",
    answer: "O sistema implementa proteções contra loops de mensagens, reenvio indevido, envio excessivo, contatos duplicados e números bloqueados. Respeitamos automaticamente solicitações de opt-out.",
  },
  {
    question: "Posso integrar com outros sistemas?",
    answer: "Sim! Nos planos Professional e Enterprise, você tem acesso a webhooks customizados e API de integração para conectar com seu CRM, ERP ou qualquer outro sistema.",
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
