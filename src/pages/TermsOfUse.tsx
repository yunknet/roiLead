import { Link } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center text-2xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
                <span style={{ color: '#81BB3D' }}>roi</span>
                <span className="text-[#2D3E50] dark:text-white">Lead</span>
              </div>
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Termos de Uso
        </h1>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Termos de Uso do roiLead (www.roilead.com.br)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              O roiLead é uma plataforma de inteligência voltada à geração automatizada de leads para empresas, utilizando tecnologia de automação e integração com Contato. Estes Termos de Uso têm como objetivo explicar, de forma clara e transparente, como funcionam nossos serviços e quais são os direitos e responsabilidades dos usuários ao utilizarem a plataforma.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Caso tenha qualquer dúvida ou solicitação, entre em contato pelo e-mail: 📧 contato@roilead.com.br
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ao utilizar os serviços do roiLead, você concorda integral e incondicionalmente com estes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer cláusula, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Definições</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong className="text-foreground">roiLead:</strong> Refere-se à plataforma acessível pelo domínio www.roilead.com.br, incluindo seus proprietários, mantenedores, sucessores e prestadores de serviços vinculados.</li>
              <li><strong className="text-foreground">Usuário:</strong> Pessoa física ou jurídica que se cadastra ou utiliza os serviços do roiLead.</li>
              <li><strong className="text-foreground">Serviços:</strong> Funcionalidades oferecidas pelo roiLead, incluindo geração automatizada de leads, envio de mensagens via Contato, gestão de contatos e acesso às integrações da plataforma.</li>
              <li><strong className="text-foreground">Conta de Usuário:</strong> Registro criado pelo usuário para acesso aos serviços do roiLead.</li>
              <li><strong className="text-foreground">Dispositivo de Acesso:</strong> Qualquer computador, smartphone ou outro dispositivo utilizado para acessar a plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Objetivo do roiLead</h2>
            <p className="text-muted-foreground">
              O roiLead tem como objetivo fornecer uma solução automatizada de geração de leads, permitindo que usuários recebam contatos qualificados diretamente por meio do Contato, de forma prática, escalável e segura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Fontes de Dados</h2>
            <p className="text-muted-foreground">Todos os dados disponibilizados são de domínio público e obtidos por meio da Receita Federal, conforme previsto na Lei de Acesso à Informação.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Cadastro e Utilização dos Serviços</h2>
            <p className="text-muted-foreground mb-3">Para utilizar o roiLead, o usuário deverá realizar cadastro informando, no mínimo:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Nome completo</li>
              <li>Endereço de e-mail válido</li>
              <li>Número de telefone (Contato)</li>
              <li>Plano contratado (mensal ou anual)</li>
            </ul>
            <p className="text-muted-foreground mb-4">O usuário declara ser maior de 18 anos e garante que todas as informações fornecidas são verdadeiras, completas e atualizadas.</p>
            <p className="text-muted-foreground">Após a confirmação do pagamento e validação dos dados, o acesso ao serviço será liberado conforme o plano contratado.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Responsabilidades do Usuário</h2>
            <p className="text-muted-foreground mb-3">O usuário compromete-se a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Não compartilhar sua conta com terceiros</li>
              <li>Utilizar a plataforma de forma lícita e ética</li>
              <li>Fornecer apenas informações verídicas</li>
              <li>Notificar imediatamente o roiLead em caso de uso indevido da conta</li>
            </ul>
            <p className="text-muted-foreground">O uso da plataforma para práticas ilegais, abusivas, spam ou violação de direitos de terceiros é estritamente proibido.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Funcionalidades Oferecidas</h2>
            <p className="text-muted-foreground mb-3">O usuário poderá, conforme o plano contratado:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Receber leads gerados automaticamente</li>
              <li>Interagir com o sistema via Contato</li>
              <li>Ter seu número validado e autorizado para uso do serviço</li>
              <li>Gerenciar dados básicos de cadastro</li>
              <li>Receber comunicações operacionais relacionadas ao serviço</li>
            </ul>
            <p className="text-muted-foreground">O usuário reconhece que as mensagens e interações podem ser processadas automaticamente por sistemas de inteligência artificial.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Direitos e Obrigações</h2>
            <p className="text-muted-foreground mb-3">O usuário tem direito a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Solicitar acesso aos seus dados pessoais</li>
              <li>Corrigir informações incorretas</li>
              <li>Solicitar a exclusão de sua conta, observadas as obrigações legais</li>
            </ul>
            <p className="text-muted-foreground mb-3">O roiLead compromete-se a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Proteger os dados dos usuários com medidas de segurança adequadas</li>
              <li>Manter a plataforma em funcionamento sempre que possível</li>
              <li>Fornecer suporte por meio do canal oficial de contato</li>
              <li>Respeitar a legislação aplicável, especialmente a Lei Geral de Proteção de Dados (LGPD)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Condições de Pagamento</h2>
            <p className="text-muted-foreground mb-3">
              Atualmente, o acesso à plataforma roiLead é concedido mediante pagamento único no valor de R$ 497,00 ou mensal de R$ 97,00, garantindo ao usuário a utilização conforme as condições vigentes no momento da contratação.
            </p>
            <p className="text-muted-foreground mb-3">
              No entanto, a roiLead reserva-se o direito de, a qualquer momento, realizar atualizações em seu modelo de negócios, funcionalidades, estrutura de acesso ou política comercial. Em decorrência dessas possíveis atualizações, o formato de cobrança poderá ser alterado para modelo de assinatura recorrente (mensal) ou sofrer reajustes de valores para novos acessos.
            </p>
            <p className="text-muted-foreground mb-3">
              Tais alterações não afetarão automaticamente acessos já concedidos sob as condições anteriormente contratadas, salvo em casos de mudança estrutural relevante na plataforma ou na forma de disponibilização do serviço.
            </p>
            <p className="text-muted-foreground mb-4">
              Ao realizar a contratação, o usuário declara estar ciente e de acordo com estas condições.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Pagamentos, Planos e Cancelamento</h2>
            <p className="text-muted-foreground mb-3">O acesso ao roiLead está condicionado à contratação de um plano pago, podendo ser mensal ou anual.</p>
            <p className="text-muted-foreground mb-3">Os valores, condições e benefícios de cada plano serão informados no momento da contratação.</p>
            <p className="text-muted-foreground mb-3">O cancelamento pode ser solicitado a qualquer momento, respeitando as regras do plano contratado.</p>
            <p className="text-muted-foreground">A não renovação ou cancelamento implicará a suspensão do acesso aos serviços ao final do período vigente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Limitações de Responsabilidade</h2>
            <p className="text-muted-foreground mb-3">O roiLead não se responsabiliza por:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Interrupções causadas por falhas de internet, servidores de terceiros ou integrações externas</li>
              <li>Resultados comerciais obtidos a partir dos leads gerados</li>
              <li>Danos decorrentes do uso indevido da plataforma pelo usuário</li>
              <li>Informações incorretas fornecidas por fontes externas ou pelo próprio usuário</li>
            </ul>
            <p className="text-muted-foreground">O roiLead fornece uma ferramenta de apoio à prospecção, não garantindo conversões, vendas ou resultados financeiros específicos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Alterações dos Termos de Uso</h2>
            <p className="text-muted-foreground">O roiLead poderá alterar estes Termos de Uso a qualquer momento. Alterações relevantes serão comunicadas por meio do site oficial ou pelo e-mail cadastrado. O uso contínuo da plataforma após a atualização implica aceitação integral dos novos termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Legislação Aplicável e Foro</h2>
            <p className="text-muted-foreground">Estes Termos de Uso são regidos pelas leis brasileiras, em especial pela LGPD. Para dirimir quaisquer conflitos relacionados ao uso do serviço, fica eleito o foro da Comarca de Várzea da Palma/MG, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Política de Proteção de Dados (LGPD) – Complementar</h2>

            <h3 className="text-lg font-medium text-foreground mb-3">Base Legal para Tratamento</h3>
            <p className="text-muted-foreground mb-3">O roiLead trata dados pessoais com base em:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Execução de contrato</li>
              <li>Consentimento do titular</li>
              <li>Cumprimento de obrigação legal</li>
              <li>Legítimo interesse, quando aplicável</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Dados Tratados</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Nome</li>
              <li>E-mail</li>
              <li>Número de telefone</li>
              <li>Dados de uso da plataforma</li>
              <li>Logs técnicos e operacionais</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Finalidade</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Prestação do serviço contratado</li>
              <li>Validação de acesso ao Contato</li>
              <li>Segurança e prevenção a fraudes</li>
              <li>Comunicação operacional</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Direitos do Titular</h3>
            <p className="text-muted-foreground mb-3">O usuário pode solicitar:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Acesso aos dados</li>
              <li>Correção</li>
              <li>Exclusão</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p className="text-muted-foreground">Solicitações via: 📧 contato@roilead.com.br</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Cláusula de Integrações e Terceiros</h2>
            <p className="text-muted-foreground mb-3">O roiLead utiliza serviços de terceiros, incluindo:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Contato (Meta)</li>
              <li>Infraestrutura em nuvem</li>
              <li>Supabase ou banco de dados equivalente</li>
              <li>Processadores de pagamento</li>
            </ul>
            <p className="text-muted-foreground">O roiLead não se responsabiliza por indisponibilidades causadas por tais serviços externos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Aviso Legal Importante</h2>
            <p className="text-muted-foreground mb-3">O roiLead:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Não garante vendas, conversões ou resultados financeiros</li>
              <li>Fornece leads e automação, não serviços de marketing direto</li>
              <li>Atua como plataforma tecnológica, não como intermediador comercial</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Status Legal do Produto</h2>
            <p className="text-muted-foreground">O roiLead é classificado como: <strong className="text-foreground">Software como Serviço (SaaS) de Automação e Inteligência para Geração de Leads</strong></p>
          </section>

          <p className="text-sm text-muted-foreground italic mt-8 border-t border-border/50 pt-4">
            Última atualização: 22/04/2026
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsOfUse;
