import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Settings,
  LogOut,
  Menu,
  X,
  User,
  CreditCard,
  MessageCircle,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const menuItems = [
  { icon: MessageCircle, label: "roiLead", id: "search" },
  { icon: CreditCard, label: "Assinatura", id: "subscription" },
  { icon: Settings, label: "Configurações", id: "settings" },
];

const plans = [
  {
    id: "mensal",
    name: "Mensal",
    description: "Pagamento mensal flexível",
    price: "59,90",
    period: "/mês",
    features: ["Leads ilimitados", "Busca por região", "Busca por nicho", "WhatsApp conectado"],
    popular: false,
  },
  {
    id: "anual",
    name: "Anual",
    description: "Melhor custo-benefício",
    price: "39,90",
    period: "/mês",
    features: ["Tudo do plano Mensal", "Suporte prioritário", "Histórico ilimitado", "Economize R$ 240/ano"],
    popular: true,
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("search");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // User Profile state
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);

  // Editing state
  const [phone, setPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        // Get data from user metadata (saved during signup)
        const meta = user.user_metadata || {};

        setUserProfile({
          firstName: meta.first_name || "Usuário",
          lastName: meta.last_name || "",
          email: user.email || "",
          phone: meta.phone || ""
        });

        setPhone(meta.phone || "");

        // Check for plan param in URL
        const searchParams = new URLSearchParams(window.location.search);
        const plan = searchParams.get("plan");
        if (plan) {
          setActiveMenu("subscription");
        }

      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: planId,
          userId: user.id
        }
      });

      if (error) throw error;
      if (!data?.payment_url) throw new Error("URL de pagamento não gerada");

      if (data.referenceId) {
        localStorage.setItem("subscription_ref", data.referenceId);
      }

      window.location.href = data.payment_url;

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao processar assinatura: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoadingPlan(null);
    }
  };

  // Derived state for display
  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : "Carregando...";
  const userInitials = userProfile?.firstName ? userProfile.firstName.substring(0, 2).toUpperCase() : "US";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  const renderContent = () => {
    switch (activeMenu) {
      case "search":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-foreground">roiLead</h2>
              <p className="text-muted-foreground">Inicie uma conversa com nossa IA no WhatsApp para encontrar os melhores leads.</p>
            </div>

            <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8 text-[#25D366]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Converse com o roiLead</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Clique no botão abaixo para ser redirecionado ao WhatsApp e iniciar sua busca por leads qualificados de forma interativa.
              </p>
              <Button
                size="lg"
                className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white border-none"
                onClick={() => window.open("https://whatsa.me/5538998957907/?t=Oi,%20tudo%20bem?", "_blank")}
              >
                <MessageCircle className="w-5 h-5" />
                Chamar no WhatsApp
              </Button>
            </div>
          </div>
        );

      case "subscription":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-foreground">Gerenciar Assinatura</h2>
              <p className="text-muted-foreground">Escolha o plano ideal para o seu negócio.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`
                                        relative p-6 rounded-xl border-2 transition-all duration-200 bg-card
                                        ${plan.popular ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-border hover:border-primary/50'}
                                    `}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">R$ {plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" /> {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                    {loadingPlan === plan.id ? "Processando..." : "Assinar " + plan.name}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
              <p className="text-muted-foreground">Gerencie seus dados e preferências.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              {/* Personal Data */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Dados Pessoais</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <div className="p-2 bg-muted/50 rounded-md text-foreground">
                      {fullName}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                    <div className="p-2 bg-muted/50 rounded-md text-foreground">
                      {userProfile?.email}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Telefone / WhatsApp</label>
                    <div className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!isEditingPhone}
                        className={!isEditingPhone ? "bg-muted/50 border-none" : ""}
                      />
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingPhone(!isEditingPhone)}
                      >
                        {isEditingPhone ? "Salvar" : "Alterar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Plano Contratado</h3>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Plano Gratuito</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">Inativo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Assine um plano para liberar os recursos.</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveMenu("subscription")}>
                    Ver Planos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-sidebar-foreground">roi<span className="text-primary">Lead</span></span>
          </Link>
          <button
            className="lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveMenu(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeMenu === item.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Menu Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{userProfile?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              Bem-vindo, <span className="text-primary">{userProfile?.firstName}</span>!
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
