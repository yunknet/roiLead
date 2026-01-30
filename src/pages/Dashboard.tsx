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
  Loader2,
  Lock
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
    id: "anual",
    name: "Anual",
    description: "Plano completo para o seu negócio",
    price: "69,90",
    period: "/ano",
    features: [
      "Leads ilimitados",
      "Busca por região e nicho",
      "WhatsApp conectado",
      "Filtros avançados",
      "Suporte prioritário",
      "Histórico ilimitado",
      "Agente IA personalizado",
      "Acesso imediato"
    ],
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
  } | null>(null);

  // Subscription State
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Editing state
  const [phone, setPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempLastName, setTempLastName] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        // Get basic metadata
        const meta = user.user_metadata || {};
        const email = user.email || "";

        // 1. Fetch Profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // SELF-HEALING: If profile is missing but user exists in Auth, create it now.
        if (!profile) {
          console.log("Profile missing for user, creating now...", user.id);

          const newProfile = {
            id: user.id,
            email: email,
            phone_number: meta.phone || "",
            first_name: meta.first_name || "",
            last_name: meta.last_name || "",
            access_status: 'NEW',
            payment_status: 'NONE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (insertError) {
            console.error("Failed to auto-create profile:", insertError);
          } else {
            profile = newProfile;
          }
        }

        // Update State from DB Profile (Source of Truth)
        if (profile) {
          setUserProfile({
            firstName: profile.first_name || meta.first_name || "Usuário",
            lastName: profile.last_name || meta.last_name || "",
            email: email,
          });
          setTempFirstName(profile.first_name || meta.first_name || "");
          setTempLastName(profile.last_name || meta.last_name || "");

          if (profile.phone_number) {
            setPhone(profile.phone_number);
          } else if (meta.phone) {
            setPhone(meta.phone);
          }
        } else {
          // Fallback purely to metadata if DB failed hard
          setUserProfile({
            firstName: meta.first_name || "Usuário",
            lastName: meta.last_name || "",
            email: email,
          });
        }

        // 2. Fetch Subscription Status directly from subscriptions table
        // This is the source of truth for "Plano Contratado"
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('subscription_status')
          .eq('email', email)
          .eq('subscription_status', 'active')
          .maybeSingle();

        setHasActiveSubscription(!!subData);

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

  const handleSaveName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: tempFirstName,
          last_name: tempLastName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile(prev => prev ? ({ ...prev, firstName: tempFirstName, lastName: tempLastName }) : null);
      setIsEditingName(false);
      toast.success("Nome atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao atualizar nome: " + err.message);
    }
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

  const handleWhatsAppClick = () => {
    if (!hasActiveSubscription) {
      toast.info("Assinatura Necessária", {
        description: "Para falar com o roiLead, escolha um plano de assinatura.",
        action: {
          label: "Ver Planos",
          onClick: () => setActiveMenu("subscription"),
        }
      });
      setActiveMenu("subscription");
      return;
    }
    window.open("https://wa.me/3897426436?text=Oi+roiLead+🤖❤️", "_blank");
  };

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : "Carregando...";
  const userInitials = userProfile?.firstName ? userProfile.firstName.substring(0, 2).toUpperCase() : "US";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

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
          {activeMenu === "search" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">roiLead</h2>
                <p className="text-muted-foreground">Inicie uma conversa com nossa IA no WhatsApp para encontrar os melhores leads.</p>
              </div>

              <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${hasActiveSubscription ? 'bg-[#25D366]/10' : 'bg-muted'}`}>
                  {hasActiveSubscription ? (
                    <MessageCircle className="w-8 h-8 text-[#25D366]" />
                  ) : (
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Converse com o roiLead</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                  {hasActiveSubscription
                    ? "Clique no botão abaixo para ser redirecionado ao WhatsApp e iniciar sua busca."
                    : "Para iniciar a busca por leads e acessar o WhatsApp, é necessário assinar um plano."
                  }
                </p>
                <Button
                  size="lg"
                  className={`gap-2 border-none ${hasActiveSubscription ? 'bg-[#25D366] hover:bg-[#25D366]/90 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  onClick={handleWhatsAppClick}
                >
                  {hasActiveSubscription ? <MessageCircle className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  {hasActiveSubscription ? "Chamar no WhatsApp" : "Assinar para Liberar"}
                </Button>
              </div>
            </div>
          )}

          {activeMenu === "subscription" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">Gerenciar Assinatura</h2>
                <p className="text-muted-foreground">Escolha o plano ideal para o seu negócio.</p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl mx-auto">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`
                      w-full max-w-md relative p-6 rounded-xl border-2 transition-all duration-200 bg-card
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
          )}

          {activeMenu === "settings" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 items-center text-center">
                <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
                <p className="text-muted-foreground">Gerencie seus dados e preferências.</p>
              </div>

              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">Dados Pessoais</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <div className="flex gap-2 items-start">
                        {isEditingName ? (
                          <div className="flex-1 flex gap-2">
                            <div className="space-y-1 flex-1">
                              <Input
                                placeholder="Nome"
                                value={tempFirstName}
                                onChange={(e) => setTempFirstName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1 flex-1">
                              <Input
                                placeholder="Sobrenome"
                                value={tempLastName}
                                onChange={(e) => setTempLastName(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-muted/50 rounded-md text-foreground flex-1">
                            {fullName}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (isEditingName) {
                              handleSaveName();
                            } else {
                              setIsEditingName(true);
                            }
                          }}
                        >
                          {isEditingName ? "Salvar" : "Alterar"}
                        </Button>
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

                <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">Plano Contratado</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {hasActiveSubscription ? "Plano Premium" : "Plano Gratuito"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hasActiveSubscription
                          ? "bg-green-100 text-green-700"
                          : "bg-secondary text-secondary-foreground"
                          }`}>
                          {hasActiveSubscription ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveSubscription ? "Sua assinatura está ativa." : "Assine um plano para liberar os recursos."}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveMenu("subscription")}>
                      {hasActiveSubscription ? "Gerenciar Plano" : "Ver Planos"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
