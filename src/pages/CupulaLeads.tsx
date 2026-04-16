import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CupulaBoard } from "@/components/crm/CupulaBoard";

const CupulaLeads = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login?redirect=/cupula-de-leads");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-px h-6 bg-border hidden sm:block"></div>
          <Link to="/cupula-de-leads" className="flex items-center">
            <img src="/cupula-logo.png" alt="Cúpula de Leads" className="h-9 sm:h-11 w-auto object-contain drop-shadow-sm dark:hidden" />
            <img src="/cupula-logo-dark.png" alt="Cúpula de Leads" className="h-9 sm:h-11 w-auto object-contain drop-shadow-sm hidden dark:block" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2 hidden sm:block" />
            <span className="hidden sm:block">Sair</span>
            <LogOut className="w-5 h-5 sm:hidden" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col w-full h-full relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        <CupulaBoard />
      </main>
    </div>
  );
};

export default CupulaLeads;
