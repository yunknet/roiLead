import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  LayoutDashboard, 
  Bot, 
  Users, 
  Settings, 
  LogOut,
  QrCode,
  TrendingUp,
  Send,
  UserCheck,
  Bell,
  Search,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Bot, label: "Agentes de IA", active: false },
  { icon: MessageSquare, label: "Conversas", active: false },
  { icon: Users, label: "Contatos", active: false },
  { icon: QrCode, label: "WhatsApp", active: false },
  { icon: Settings, label: "Configurações", active: false },
];

const stats = [
  { label: "Mensagens Hoje", value: "1,234", change: "+12%", icon: Send },
  { label: "Conversas Ativas", value: "89", change: "+5%", icon: MessageSquare },
  { label: "Leads Qualificados", value: "34", change: "+23%", icon: UserCheck },
  { label: "Taxa de Resposta", value: "94%", change: "+2%", icon: TrendingUp },
];

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">ZapFlow</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => setActiveMenu(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeMenu === item.label
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
              <p className="text-xs text-muted-foreground truncate">joao@empresa.com</p>
            </div>
            <button className="text-muted-foreground hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9 w-64 bg-secondary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-muted-foreground">Professional</span>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium">
                Ativo
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Olá, João! 👋
            </h1>
            <p className="text-muted-foreground">
              Aqui está o resumo da sua automação hoje.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="p-5 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-primary font-medium">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* WhatsApp Connection */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Conexão WhatsApp</h3>
                <span className="px-2 py-1 rounded bg-success/20 text-success text-xs font-medium">
                  Conectado
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">+55 11 99999-9999</p>
                  <p className="text-sm text-muted-foreground">Última atividade: há 2 min</p>
                </div>
              </div>
            </div>

            {/* Active Agents */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Agentes Ativos</h3>
                <Button variant="ghost" size="sm">
                  Gerenciar
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-foreground">Agente de Prospecção</span>
                  </div>
                  <span className="text-xs text-muted-foreground">127 conversas</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-foreground">Agente de Atendimento</span>
                  </div>
                  <span className="text-xs text-muted-foreground">45 conversas</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Agente de Qualificação</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Inativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
