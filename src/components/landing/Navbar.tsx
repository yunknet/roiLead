import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModeToggle } from "@/components/ModeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center"
            onClick={() => window.scrollTo(0, 0)}
          >
            <div className="flex items-center text-2xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
              <span style={{ color: '#81BB3D' }}>roi</span>
              <span className="text-[#2D3E50] dark:text-white">Lead</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">
              Sobre Nós
            </Link>
            <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
            <a href="/#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <a href="#footer" className="text-muted-foreground hover:text-foreground transition-colors">
              Suporte
            </a>
            <div className="flex items-center gap-4">
              <ModeToggle />
              <Link to={session ? "/dashboard" : "/login"}>
                <Button variant="hero" size="sm">
                  {session ? "Dashboard" : "Entrar"}
                </Button>
              </Link>
            </div>
          </div>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link to="/sobre" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                Sobre Nós
              </Link>
              <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                Recursos
              </a>
              <a href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                Preços
              </a>
              <a href="/#faq" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                FAQ
              </a>
              <a href="/#footer" className="text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setIsOpen(false)}>
                Suporte
              </a>
              <Link to={session ? "/dashboard" : "/login"} onClick={() => setIsOpen(false)}>
                <Button variant="hero" className="w-full">{session ? "Dashboard" : "Entrar"}</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
