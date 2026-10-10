import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  MessageCircle,
  Loader2,
  Kanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ModeToggle } from '@/components/ModeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const CupulaIcon = () => (
  <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center -ml-1.5 mr-1 flex-shrink-0">
    <img src="/cupula-icon.png" alt="Cúpula" className="w-full h-full object-contain dark:hidden" />
    <img src="/cupula-icon-dark.png" alt="Cúpula" className="w-full h-full object-contain hidden dark:block" />
  </div>
);

const menuItems = [
  { icon: MessageCircle, label: 'roiLead', path: '/dashboard' },
  { icon: Kanban, label: 'CRM', path: '/dashboard/crm' },
  { icon: CupulaIcon, label: 'Cúpula de Leads (em breve)', path: '/dashboard/cupula_leads', isNew: true, disabled: true },
  { icon: CreditCard, label: 'Assinatura', path: '/dashboard/subscription' },
  { icon: Settings, label: 'Configurações', path: '/dashboard/settings' },
];

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone_number?: string;
    last_phone_update?: string;
  } | null>(null);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string>('Gratuito');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [whatsappUnlockedAt, setWhatsappUnlockedAt] = useState<string | null>(null);
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login');
          return;
        }

        const meta = user.user_metadata || {};
        const email = user.email || '';

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const googleName = meta.full_name || meta.name || '';
        let googleFirstName = '';
        let googleLastName = '';

        if (googleName) {
          const parts = googleName.split(' ');
          googleFirstName = parts[0];
          googleLastName = parts.slice(1).join(' ');
        }

        if (!profile) {
          const newProfile = {
            id: user.id,
            email: email,
            phone_number: meta.phone || '',
            first_name: meta.first_name || googleFirstName || '',
            last_name: meta.last_name || googleLastName || '',
            access_status: 'NEW',
            payment_status: 'NONE',
            terms_accepted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (!insertError) profile = newProfile;
        }

        if (profile) {
          setUserProfile({
            firstName: profile.first_name || 'Usuário',
            lastName: profile.last_name || '',
            email: email,
            phone_number: profile.phone_number,
            last_phone_update: profile.last_phone_update
          });

          setTermsAccepted(!!profile.terms_accepted);
          if (!profile.terms_accepted) setShowTermsModal(true);
        } else {
          setUserProfile({
            firstName: meta.first_name || googleFirstName || 'Usuário',
            lastName: meta.last_name || googleLastName || '',
            email: email,
            phone_number: meta.phone || ''
          });
        }

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('subscription_status, created_at, expires_at, plan_name, whatsapp_unlocked_at')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isTimeValid = subData?.expires_at ? new Date(subData.expires_at) > new Date() : true;
        let isActivelySubscribed = false;

        if (subData) {
          isActivelySubscribed = isTimeValid && 
                                 subData.subscription_status !== 'canceled' && 
                                 subData.subscription_status !== 'refunded';
          if (profile?.access_status === 'PAID_USER') isActivelySubscribed = true;
          
          const daysToAdd = subData.plan_name?.toLowerCase() === 'mensal' ? 30 : 365;
          const calculatedFallback = new Date(new Date(subData.created_at).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
          setExpiresAt(subData.expires_at || calculatedFallback);
          setActivePlanName(subData.plan_name || 'Anual');
          if (subData.whatsapp_unlocked_at) setWhatsappUnlockedAt(subData.whatsapp_unlocked_at);
        } else {
          isActivelySubscribed = profile?.payment_status === 'PAID' || 
                                 profile?.access_status === 'PAID_USER';
        }

        setHasActiveSubscription(isActivelySubscribed);

      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAcceptTerms = async () => {
    setIsAcceptingTerms(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setTermsAccepted(true);
      setShowTermsModal(false);
      toast.success('Termos aceitos com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar aceite: ' + error.message);
    } finally {
      setIsAcceptingTerms(false);
    }
  };

  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : 'Carregando...';
  const userInitials = userProfile?.firstName ? userProfile.firstName.substring(0, 2).toUpperCase() : 'US';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center text-2xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
              <span style={{ color: '#81BB3D' }}>roi</span>
              <span className="text-sidebar-foreground">Lead</span>
            </div>
          </Link>
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard/');
              return (
                <li key={item.path}>
                  <Link
                    to={item.disabled ? '#' : item.path}
                    onClick={() => { if (!item.disabled) setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${isActive && !item.disabled
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : !item.disabled ? "text-sidebar-foreground hover:bg-sidebar-accent" : "text-sidebar-foreground"
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.isNew && (
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                        Novo
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border mb-12">
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

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 -ml-2 text-foreground" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                Bem-vindo, <span className="text-primary">{userProfile?.firstName}</span>!
              </h1>
            </div>
            {whatsappUnlockedAt ? (
              new Date(whatsappUnlockedAt) > new Date() ? (
                <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 w-fit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Agente no WhatsApp liberado em: {new Date(whatsappUnlockedAt).toLocaleDateString('pt-BR')}
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 w-fit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Agente no WhatsApp: Liberado
                </span>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="default" size="sm" disabled={true} className="hidden sm:flex bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-lg px-4 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Cúpula de Leads (em breve)
            </Button>
            <div className="flex items-center gap-2">
                <ModeToggle />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col overflow-hidden">
            <Outlet context={{
              userProfile, setUserProfile,
              hasActiveSubscription, activePlanName, expiresAt
            }} />
          </div>
        </div>
      </main>

      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Termos de Uso</DialogTitle>
            <DialogDescription>
              Para continuar usando o roiLead, você precisa aceitar nossos termos de uso.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted text-sm rounded-lg max-h-60 overflow-y-auto mb-4 custom-scrollbar text-foreground leading-relaxed">
            <h4 className="font-bold mb-2">1. Coleta de Dados e Privacidade</h4>
            <p className="mb-2">Ao continuar, você autoriza o roiLead a coletar e armazenar seu endereço de e-mail e número de telefone para fins de identificação, acesso aos serviços do plano e comunicação sobre atualizações da plataforma.</p>
            <p className="mb-4">O roiLead não compartilha essas informações com terceiros, exceto quando necessário para processar pagamentos através dos nossos parceiros.</p>
            <h4 className="font-bold mb-2">2. Comunicação e Transparência</h4>
            <p className="mb-2">Ao aceitar estes termos, você está ciente de que não enviaremos e-mails de marketing ou promoções externas, mas poderemos usar o seu e-mail e telefone para contatos referentes exclusivamente ao funcionamento, cobranças ou suporte da sua conta roiLead.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { toast.error('Você precisa aceitar os termos para usar a plataforma.'); setShowTermsModal(false); }} disabled={isAcceptingTerms} className="w-full sm:w-auto">
              Recusar e Sair
            </Button>
            <Button onClick={handleAcceptTerms} disabled={isAcceptingTerms} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              {isAcceptingTerms ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sim, eu aceito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

