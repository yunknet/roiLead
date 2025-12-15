import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ZapFlow</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs">
              Plataforma SaaS profissional de automação de WhatsApp com inteligência artificial para empresas.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Produto</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  LGPD
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} ZapFlow. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground text-sm">
            Feito com 💚 no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
