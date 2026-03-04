import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
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
  Lock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Filter,
  Search,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ModeToggle } from "@/components/ModeToggle";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";

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
    price: "67,00",
    period: "/ano",
    features: [
      "Leads ilimitados",
      "Busca por região e nicho",
      "WhatsApp conectado",
      "Filtros avançados",
      "Suporte prioritário",
      "Histórico ilimitado",

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
  const [subscriptionCreatedAt, setSubscriptionCreatedAt] = useState<string | null>(null);

  // Editing state
  const [phone, setPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempLastName, setTempLastName] = useState("");

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [loading, setLoading] = useState(true);

  const [leadRequests, setLeadRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtro de requisições baseado no termo de busca
  const filteredRequests = leadRequests.filter((req) => {
    if (!searchQuery.trim()) return true;

    // Normaliza strings para comparação (remove acentos e lowercase)
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const details = JSON.stringify(req.request_details || "").toLowerCase();
    const term = normalize(searchQuery);

    return normalize(details).includes(term);
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Resetar para página 1 quando a busca muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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



        // Extrai nome do Google/Metadados se disponível
        const googleName = meta.full_name || meta.name || "";
        let googleFirstName = "";
        let googleLastName = "";

        if (googleName) {
          const parts = googleName.split(" ");
          googleFirstName = parts[0];
          googleLastName = parts.slice(1).join(" ");
        }

        // SELF-HEALING & SYNC: Create or Update Profile
        if (!profile) {

          const newProfile = {
            id: user.id,
            email: email,
            phone_number: meta.phone || "",
            first_name: meta.first_name || googleFirstName || "",
            last_name: meta.last_name || googleLastName || "",
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
        } else if (!profile.first_name && (googleFirstName || meta.first_name)) {
          // SYNC: Se o perfil existe mas não tem nome, e temos nome nos metadados (Google), atualiza agora.

          const updates = {
            first_name: meta.first_name || googleFirstName,
            last_name: meta.last_name || googleLastName,
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          // Atualiza o objeto local para refletir na UI imediatamente
          profile.first_name = updates.first_name;
          profile.last_name = updates.last_name;
        }

        // Update State from DB Profile (Source of Truth)
        if (profile) {
          setUserProfile({
            firstName: profile.first_name || "Usuário",
            lastName: profile.last_name || "",
            email: email,
          });
          setTempFirstName(profile.first_name || "");
          setTempLastName(profile.last_name || "");

          if (profile.phone_number) {
            setPhone(profile.phone_number);
          } else if (meta.phone) {
            setPhone(meta.phone);
          }
        } else {
          // Fallback purely to metadata if DB failed hard
          setUserProfile({
            firstName: meta.first_name || googleFirstName || "Usuário",
            lastName: meta.last_name || googleLastName || "",
            email: email,
          });
        }

        // 2. Fetch Subscription Status directly from subscriptions table
        // This is the source of truth for "Plano Contratado"
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('subscription_status, created_at')
          .eq('email', email)
          .eq('subscription_status', 'active')
          .maybeSingle();

        setHasActiveSubscription(!!subData);
        if (subData?.created_at) {
          setSubscriptionCreatedAt(subData.created_at);
        }

        // 3. Fetch Lead Requests (History)
        // Sanitiza o telefone para busca (apenas números)
        const userPhone = profile?.phone_number || meta.phone || "";
        const cleanPhone = userPhone.replace(/\D/g, "");

        let queryBuilder = supabase
          .from('lead_requests')
          .select('*')
          .order('created_at', { ascending: false });

        // Tenta buscar por ID do usuário OU Telefone (para pegar leads gerados pelo Bot)
        if (cleanPhone && cleanPhone.length > 5) {
          const phoneWith55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const phoneWithout55 = cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone;

          // Monta query OR: user_id igual AO SEU OU telefone igual a um dos formatos
          queryBuilder = queryBuilder.or(`user_id.eq.${user.id},phone_number.eq.${cleanPhone},phone_number.eq.${phoneWith55},phone_number.eq.${phoneWithout55}`);
        } else {
          queryBuilder = queryBuilder.eq('user_id', user.id);
        }

        const { data: requests, error: requestsError } = await queryBuilder;

        if (!requestsError && requests) {
          setLeadRequests(requests);
        } else if (requestsError) {
          console.error("Error fetching requests:", requestsError);
        }

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

  const handleSavePhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Telefone atualizado com sucesso!");
      setIsEditingPhone(false);
      // Atualiza estado local
      setUserProfile(prev => prev ? ({ ...prev, phone_number: phone }) : null);

    } catch (err: any) {
      toast.error("Erro ao atualizar telefone: " + err.message);
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
          userId: user.id,
          email: userProfile?.email || user.email
        }
      });

      if (error) throw error;
      const paymentUrl = data?.payment_url || data?.url;

      if (!paymentUrl) throw new Error("URL de pagamento não gerada");

      if (data.referenceId) {
        localStorage.setItem("subscription_ref", data.referenceId);
      }

      window.location.href = paymentUrl;

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao processar assinatura: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao alterar senha. Tente deslogar e logar novamente.");
    } finally {
      setIsChangingPassword(false);
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

  const calculateDaysLeft = (createdAt: string) => {
    const start = new Date(createdAt);
    const end = new Date(start);
    end.setFullYear(start.getFullYear() + 1); // Plano Anual
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
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
            <div className="flex items-center text-2xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
              <span style={{ color: '#81BB3D' }}>roi</span>
              <span className="text-sidebar-foreground">Lead</span>
            </div>
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
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {activeMenu === "search" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-foreground">Histórico de Pesquisas</h2>
                  <p className="text-muted-foreground">
                    {hasActiveSubscription
                      ? "Veja o registro de todas as suas solicitações de leads."
                      : "Assine um plano para realizar pesquisas e ver seu histórico."}
                  </p>
                </div>

                {hasActiveSubscription && (
                  <div className="w-full sm:w-[320px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar no histórico..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>

              {!hasActiveSubscription ? (
                <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Histórico Bloqueado</h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Para iniciar a busca por leads e acessar o histórico, é necessário assinar um plano.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setActiveMenu("subscription")}
                  >
                    Ver Planos
                  </Button>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {searchQuery ? "Nenhuma pesquisa encontrada" : "Nenhuma pesquisa encontrada"}
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {searchQuery
                      ? `Não encontramos resultados para "${searchQuery}".`
                      : "Você ainda não realizou nenhuma pesquisa com o roiLead."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedRequests.map((req) => (
                      <RequestCard key={req.id} request={req} onDelete={() => {
                        setLeadRequests(current => current.filter(r => r.id !== req.id));
                      }} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm font-medium px-4">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="gap-1"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )
              }
            </div>
          )}

          {activeMenu === "subscription" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">Gerenciar Assinatura</h2>
                <p className="text-muted-foreground">Escolha o plano ideal para o seu negócio.</p>
              </div>

              {hasActiveSubscription && subscriptionCreatedAt && (
                <div className="w-full max-w-md bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-fade-in mx-auto">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold uppercase tracking-wider text-xs">Tempo de Assinatura</span>
                  </div>
                  <div className="text-4xl font-black text-foreground mb-1">
                    {calculateDaysLeft(subscriptionCreatedAt)} <span className="text-lg font-bold">dias</span>
                  </div>
                  <p className="text-sm text-muted-foreground">restantes no seu plano anual</p>
                </div>
              )}

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
                      disabled={loadingPlan === plan.id || hasActiveSubscription}
                    >
                      {loadingPlan === plan.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                      {loadingPlan === plan.id ? "Processando..." : hasActiveSubscription ? "Assinado" : "Assinar " + plan.name}
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
                          onClick={() => {
                            if (isEditingPhone) {
                              handleSavePhone();
                            } else {
                              setIsEditingPhone(true);
                            }
                          }}
                        >
                          {isEditingPhone ? "Salvar" : "Alterar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco de Alterar Senha */}
                <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Lock className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">Alterar Senha</h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Proteja sua conta utilizando uma senha forte com letras e números.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        type="password"
                        placeholder="Nova Senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Confirmar Nova Senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={!newPassword || !confirmPassword || isChangingPassword}
                    >
                      {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {isChangingPassword ? "Alterando..." : "Salvar Nova Senha"}
                    </Button>
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
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-secondary-foreground"
                          }`}>
                          {hasActiveSubscription ? `${subscriptionCreatedAt ? calculateDaysLeft(subscriptionCreatedAt) : 0} dias restantes` : "Inativo"}
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

const RequestCard = ({ request, onDelete }: { request: any, onDelete?: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [page, setPage] = useState(1);

  // Format Date
  const date = new Date(request.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Extract Query Text
  let queryText = "Pesquisa de Leads";
  if (request.request_details) {
    if (typeof request.request_details === 'string') {
      queryText = request.request_details;
    } else if (typeof request.request_details === 'object') {
      queryText = request.request_details.message || request.request_details.query || "Detalhes da pesquisa";
      if (queryText === "Detalhes da pesquisa" && Object.keys(request.request_details).length > 0) {
        queryText = JSON.stringify(request.request_details).substring(0, 50) + "...";
      }
    }
  }

  // Parse Leads Data
  let leads: any[] = [];
  try {
    let rawData = request.leads_data;

    // 1. String parsing
    if (typeof rawData === 'string') {
      try { rawData = JSON.parse(rawData); } catch (e) {
        // Try cleanup if needed (unescape)
        try { rawData = JSON.parse(rawData.replace(/\\n/g, '').replace(/\\"/g, '"')); } catch (e2) { }
      }
    }
    // Double parse check
    if (typeof rawData === 'string') {
      try { rawData = JSON.parse(rawData); } catch (e) { }
    }

    // 2. Structure Extraction
    if (Array.isArray(rawData)) {
      // Support for wrapped response: [ { total: 12, cnpjs: [...] } ]
      // or flat response: [ { ... }, { ... } ]
      leads = rawData.flatMap((item: any) => item.cnpjs || [item]);
    } else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.cnpjs)) leads = rawData.cnpjs;
      else if (Array.isArray(rawData.leads)) leads = rawData.leads;
      else if (Array.isArray(rawData.data)) leads = rawData.data;
      else if (Array.isArray(rawData.companies)) leads = rawData.companies;
    }
  } catch (err) {
    console.error("Error extracting leads data:", err);
  }

  // Paginação dos Leads no Card
  useEffect(() => {
    setPage(1);
  }, [request.id]);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE);
  const paginatedLeads = leads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita expandir o card ao clicar no botão
    if (leads.length === 0) {
      toast.error("Não há leads para exportar nesta requisição.");
      return;
    }

    try {
      // Formata os dados para exportação
      const exportData = leads.map(lead => ({
        "Nome": lead.nome_fantasia || lead["Nome Fantasia"] || lead.razao_social || lead["Razão Social"] || "N/A",
        "CNPJ": lead.cnpj || lead.CNPJ || "",
        "Telefone": lead.contato_telefonico?.[0]?.completo || lead.contato_telefonico?.[0]?.numero || lead.Telefone || "",
        "Email": lead.contato_email?.[0]?.email || lead.Email || "",
        "Cidade": lead.endereco?.municipio || lead.Cidade || "",
        "UF": lead.endereco?.uf || lead.UF || "",
        "Logradouro": lead.endereco?.logradouro || "",
        "Bairro": lead.endereco?.bairro || "",
        "Porte": lead.porte_empresa?.descricao || lead.Porte || "",
        "Atividade Principal": lead.atividade_principal?.descricao || ""
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");

      // Nome do arquivo com data e identificador
      const fileName = `leads_roilead_${request.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toast.success(`Exportado ${leads.length} leads com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao gerar arquivo Excel.");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Tem certeza que deseja excluir este histórico?")) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('lead_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast.success("Histórico excluído com sucesso");
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Erro detalhado ao excluir:", error);
      toast.error(`Erro ao excluir: ${(error as any).message || "Verifique suas permissões ou console"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleting) return null;

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-primary/50">
        <div
          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-accent/5"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{date}</span>
            <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1" title={queryText}>
              {queryText}
            </h4>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {leads.length} Leads
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-2 hidden sm:flex"
              title="Exportar para Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Excel</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              title="Excluir histórico"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            {/* Botão Mobile Only para Download */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-8 w-8 sm:hidden text-muted-foreground"
            >
              <Download className="w-4 h-4" />
            </Button>

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border bg-muted/30 p-4 animate-in slide-in-from-top-2">
            {leads.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {paginatedLeads.map((lead, idx) => {
                    // Mapeamento inteligente de propriedades (snake_case novo vs CamelCase antigo)
                    const nome = lead.nome_fantasia || lead["Nome Fantasia"] || lead.razao_social || lead["Razão Social"] || "Empresa sem nome";
                    const porte = lead.porte_empresa?.descricao || lead.Porte || "N/A";
                    const cnpj = lead.cnpj || lead.CNPJ || "";

                    const cidade = lead.endereco?.municipio || lead.Cidade || "";
                    const uf = lead.endereco?.uf || lead.UF || "";

                    const telefone = lead.contato_telefonico?.[0]?.completo || lead.contato_telefonico?.[0]?.numero || lead.Telefone || "N/A";
                    const email = lead.contato_email?.[0]?.email || lead.Email || "N/A";

                    return (
                      <div key={idx} className="bg-background border border-border rounded-md p-3 text-sm space-y-2 shadow-sm relative group">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-primary line-clamp-1" title={nome}>{nome}</h5>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(lead);
                            }}
                            className="shrink-0 text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium transition-colors border border-green-200"
                          >
                            Visualizar Completo
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-1 text-muted-foreground">
                          <div className="mb-1">
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground whitespace-nowrap inline-block">
                              {porte}
                            </span>
                          </div>

                          <p className="truncate"><span className="font-medium text-foreground">CNPJ:</span> {cnpj}</p>
                          <p className="truncate"><span className="font-medium text-foreground">Local:</span> {cidade}/{uf}</p>
                          <p className="truncate"><span className="font-medium text-foreground">Tel:</span> {telefone}</p>
                          <p className="truncate" title={email}><span className="font-medium text-foreground">Email:</span> {email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="gap-1 h-8 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Anterior
                    </Button>
                    <span className="text-xs font-medium px-2 text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="gap-1 h-8 text-xs"
                    >
                      Próximo
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado detalhado disponível ou formato desconhecido.</p>
            )}
          </div>
        )}
      </div>

      <LeadDetailsModal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
      />
    </>
  );
};
