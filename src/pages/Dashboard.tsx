import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Target,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  List,
  Menu,
  X,
  User,
  CreditCard,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: ShoppingCart, label: "Minhas Listas de Compras", id: "lists" },
  { icon: DollarSign, label: "Orçamento", id: "budget" },
  { icon: BarChart3, label: "Relatórios", id: "reports" },
  { icon: Settings, label: "Configurações", id: "settings" },
];

const mockLists = [
  { id: 1, name: "Compras do Mês", items: 12, total: 456.80, date: "15/12/2024" },
  { id: 2, name: "Feira da Semana", items: 8, total: 189.50, date: "10/12/2024" },
  { id: 3, name: "Produtos de Limpeza", items: 5, total: 87.30, date: "05/12/2024" },
];

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState("lists");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const userName = "João";

  // Mock data
  const budgetData = {
    total: 2000,
    spent: 1245.60,
    remaining: 754.40,
    savings: 312.50,
  };

  const handleLogout = () => {
    navigate("/");
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "lists":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Minhas Listas de Compras</h2>
              <Button variant="hero" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nova Lista
              </Button>
            </div>
            <div className="grid gap-4">
              {mockLists.map((list) => (
                <div key={list.id} className="p-4 sm:p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <List className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{list.name}</h3>
                        <p className="text-sm text-muted-foreground">{list.items} itens • {list.date}</p>
                      </div>
                    </div>
                    <span className="text-lg font-semibold text-foreground sm:text-right">R$ {list.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "budget":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Orçamento</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Orçamento Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {budgetData.total.toFixed(2)}</p>
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-muted-foreground">Gasto até Agora</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {budgetData.spent.toFixed(2)}</p>
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-muted-foreground">Saldo Restante</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {budgetData.remaining.toFixed(2)}</p>
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-warning" />
                  </div>
                  <span className="text-muted-foreground">Economia Acumulada</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {budgetData.savings.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full sm:w-auto">Ajustar Orçamento</Button>
          </div>
        );

      case "reports":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Relatórios</h2>
            <div className="p-5 rounded-xl bg-card border border-border">
              <h3 className="font-medium text-foreground mb-4">Resumo do Mês</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Gasto</span>
                  <span className="font-semibold text-foreground">R$ 1.245,60</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Economia</span>
                  <span className="font-semibold text-success">R$ 312,50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Itens Repetidos</span>
                  <span className="font-semibold text-foreground">23 itens</span>
                </div>
              </div>
              {/* Simple Chart Placeholder */}
              <div className="mt-6 h-40 bg-secondary/50 rounded-lg flex items-center justify-center">
                <div className="flex items-end gap-2 h-24">
                  <div className="w-8 bg-primary/60 rounded-t" style={{ height: '40%' }} />
                  <div className="w-8 bg-primary/60 rounded-t" style={{ height: '60%' }} />
                  <div className="w-8 bg-primary/60 rounded-t" style={{ height: '80%' }} />
                  <div className="w-8 bg-primary rounded-t" style={{ height: '100%' }} />
                  <div className="w-8 bg-primary/60 rounded-t" style={{ height: '70%' }} />
                  <div className="w-8 bg-primary/60 rounded-t" style={{ height: '50%' }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Gastos por semana</p>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Configurações</h2>
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Dados Pessoais</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="text-foreground">João Silva</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">E-mail</span>
                    <span className="text-foreground">joao@email.com</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Telefone</span>
                    <span className="text-foreground">(11) 99999-9999</span>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Plano Contratado</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="text-primary font-medium">Mensal - R$ 59,90</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-success">Ativo</span>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Status da Assinatura</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Próxima cobrança</span>
                    <span className="text-foreground">15/01/2025</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Membro desde</span>
                    <span className="text-foreground">15/10/2024</span>
                  </div>
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
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
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

        {/* User Menu */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">JS</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">João Silva</p>
              <p className="text-xs text-muted-foreground truncate">Mensal</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-sidebar-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              Bem-vindo, <span className="text-primary">{userName}</span>!
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* Summary Panel - Shows only on first load / lists section */}
          {activeMenu === "lists" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Saldo do Orçamento</span>
                </div>
                <p className="text-xl font-bold text-foreground">R$ {budgetData.remaining.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Gasto no Mês</span>
                </div>
                <p className="text-xl font-bold text-foreground">R$ {budgetData.spent.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <List className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Última Lista</span>
                </div>
                <p className="text-xl font-bold text-foreground truncate">Compras do Mês</p>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Economia Acumulada</span>
                </div>
                <p className="text-xl font-bold text-success">R$ {budgetData.savings.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Active Section Content */}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
