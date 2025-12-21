import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if we came from signup with an email to pre-fill
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : "Erro ao fazer login: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl font-bold text-foreground">roi<span className="text-primary">Lead</span></span>
          </div>

          {/* Header */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground mb-8">
            Entre para acessar sua conta
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-muted-foreground mt-8">
            Não tem uma conta?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-gradient-card items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="mb-8 animate-float select-none">
            <span className="text-6xl font-bold text-foreground">roi<span className="text-primary">Lead</span></span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Leads qualificados em segundos
          </h2>
          <p className="text-muted-foreground">
            Busque empresas por região e nicho diretamente no seu WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
