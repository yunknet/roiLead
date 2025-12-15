import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Target, 
  LayoutDashboard, 
  Search, 
  History, 
  Settings, 
  LogOut,
  QrCode,
  TrendingUp,
  Users,
  MapPin,
  Bell,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Search, label: "Buscar Leads", active: false },
  { icon: History, label: "Histórico", active: false },
  { icon: Users, label: "Leads Salvos", active: false },
  { icon: QrCode, label: "WhatsApp", active: false },
  { icon: Settings, label: "Configurações", active: false },
];

const stats = [
  { label: "Leads Buscados", value: "234", change: "+18%", icon: Search },
  { label: "Leads Salvos", value: "89", change: "+12%", icon: Users },
  { label: "Regiões Ativas", value: "5", change: "+2", icon: MapPin },
  { label: "Taxa de Conversão", value: "12%", change: "+3%", icon: TrendingUp },
];

const recentSearches = [
  { query: "Empresas de tecnologia em São Paulo", results: 15, date: "Há 2 min" },
  { query: "Clínicas odontológicas no RJ", results: 8, date: "Há 1 hora" },
  { query: "Indústrias em Santa Catarina", results: 23, date: "Há 3 horas" },
];

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">roi<span className="text-primary">Lead</span></span>
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
              <p className="text-xs text-muted-foreground truncate">Professional</p>
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
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Ex: 5 empresas de tecnologia em São Paulo..." 
                className="pl-9 bg-secondary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="hero" size="default">
              <Send className="w-4 h-4 mr-2" />
              Buscar Leads
            </Button>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">423 leads restantes</span>
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
              Pronto para encontrar novos leads hoje?
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

          {/* Quick Search & Recent */}
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
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">+55 11 99999-9999</p>
                  <p className="text-sm text-muted-foreground">Pronto para buscar leads</p>
                </div>
              </div>
            </div>

            {/* Recent Searches */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Buscas Recentes</h3>
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </div>
              <div className="space-y-3">
                {recentSearches.map((search, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">{search.query}</p>
                        <p className="text-xs text-muted-foreground">{search.results} resultados • {search.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
