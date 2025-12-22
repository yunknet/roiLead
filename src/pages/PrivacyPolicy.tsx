import { Link } from "react-router-dom";
import { ArrowLeft, Target } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">roi<span className="text-primary">Lead</span></span>
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground mb-8">Última atualização: 03 de outubro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Esta Política de Privacidade descreve como o site roiLead (roilead.ynksystems.com) coleta, utiliza, armazena e protege as informações dos usuários que utilizam nossos serviços.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Ao utilizar os serviços do roiLead, você concorda com as práticas descritas nesta Política de Privacidade.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Informações que Coletamos</h2>

            <h3 className="text-lg font-medium text-foreground mb-3">a. Informações fornecidas diretamente pelo usuário:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Nome</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone (WhatsApp)</li>
              <li>Informações relacionadas ao uso da plataforma roiLead, como dados de cadastro, plano contratado, status de assinatura e histórico de interações com o sistema</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">b. Informações coletadas automaticamente:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Endereço IP</li>
              <li>Dados de navegação (páginas visitadas, tempo de acesso, dispositivo utilizado, navegador e sistema operacional)</li>
              <li>Cookies e identificadores de sessão</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Uso das Informações</h2>
            <p className="text-muted-foreground mb-3">As informações coletadas são utilizadas para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Permitir o funcionamento da plataforma e dos serviços oferecidos pelo roiLead</li>
              <li>Realizar cadastro, verificação e liberação de acesso ao sistema</li>
              <li>Gerenciar assinaturas, pagamentos e planos contratados</li>
              <li>Garantir a segurança, integridade e estabilidade da plataforma</li>
              <li>Melhorar a experiência do usuário</li>
              <li>Realizar análises internas e estatísticas de uso</li>
              <li>Enviar comunicações relacionadas ao serviço, como avisos operacionais, atualizações ou informações importantes</li>
              <li>Cumprir obrigações legais, regulatórias e contratuais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground mb-3">O roiLead não vende, aluga ou comercializa informações pessoais dos usuários.</p>
            <p className="text-muted-foreground mb-3">As informações poderão ser compartilhadas apenas quando:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Necessário para cumprimento de obrigações legais, regulatórias ou ordens judiciais</li>
              <li>Indispensável para operação do serviço (por exemplo, integração com provedores de pagamento e infraestrutura)</li>
              <li>Necessário para proteger os direitos, a segurança e a integridade da plataforma e dos usuários</li>
              <li>Houver consentimento explícito do usuário</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Armazenamento e Segurança dos Dados</h2>
            <p className="text-muted-foreground mb-3">Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais, incluindo:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Criptografia de informações sensíveis</li>
              <li>Controle de acesso restrito</li>
              <li>Autenticação segura</li>
              <li>Monitoramento de acessos e atividades</li>
              <li>Backups periódicos</li>
            </ul>
            <p className="text-muted-foreground mt-4">Apesar dos esforços, nenhum sistema é totalmente seguro, e o usuário reconhece os riscos inerentes ao ambiente digital.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Acesso, Correção e Exclusão de Dados</h2>
            <p className="text-muted-foreground mb-3">O usuário pode, a qualquer momento:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Solicitar acesso aos seus dados pessoais</li>
              <li>Corrigir ou atualizar informações cadastrais</li>
              <li>Solicitar a exclusão de sua conta e dados, observadas as obrigações legais de retenção</li>
            </ul>
            <p className="text-muted-foreground mt-4">As solicitações devem ser feitas através do e-mail: 📧 ynksystems@gmail.com</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Cookies e Dados de Navegação</h2>
            <p className="text-muted-foreground mb-3">O roiLead pode utilizar cookies e tecnologias semelhantes para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Melhorar a navegação e usabilidade do site</li>
              <li>Manter sessões ativas</li>
              <li>Analisar métricas de acesso e desempenho</li>
            </ul>
            <p className="text-muted-foreground mt-4">O usuário pode configurar seu navegador para recusar ou apagar cookies, ciente de que algumas funcionalidades da plataforma poderão ser afetadas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Alterações nesta Política de Privacidade</h2>
            <p className="text-muted-foreground">Esta Política de Privacidade pode ser atualizada periodicamente. Alterações relevantes serão publicadas no site oficial roilead.ynksystems.com, com a data de atualização revisada.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Isenção de Vínculo</h2>
            <p className="text-muted-foreground">O roiLead não possui qualquer tipo de vínculo, parceria ou relação com a empresa WHATSAPP, LLC ou Facebook Inc. O roiLead é uma ferramenta de automação.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Contato</h2>
            <p className="text-muted-foreground">Em caso de dúvidas, solicitações ou questões relacionadas à privacidade e proteção de dados, entre em contato:</p>
            <p className="text-primary mt-2">📧 E-mail: ynksystems@gmail.com</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
