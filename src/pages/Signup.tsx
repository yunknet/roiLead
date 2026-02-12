import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: ""
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao conectar com Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast({
        title: "Aceite os termos",
        description: "Você precisa aceitar os termos para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { email, password, firstName, lastName, phone } = formData;

      // Get plan from URL query params
      const searchParams = new URLSearchParams(window.location.search);
      const plan = searchParams.get("plan");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          },
        },
      });

      if (error) throw error;

      // Explicitly create profile if session exists immediately
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error("Erro ao criar perfil automaticamente:", profileError);
          // Non-blocking error
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao roiLead.",
      });

      if (data.session) {
        navigate(`/dashboard?plan=${plan || ''}`);
      } else {
        // Session is null, likely waiting for DB trigger to confirm email.
        // Retry login logic...
        let attempts = 0;
        let loggedIn = false;

        while (attempts < 3 && !loggedIn) {
          await new Promise(resolve => setTimeout(resolve, 800));
          const { data: loginData } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (loginData.session) {
            loggedIn = true;
            navigate(`/dashboard?plan=${plan || ''}`);
            return;
          }
          attempts++;
        }

        toast({
          title: "Cadastro realizado!",
          description: "Sua conta foi criada. Faça login para continuar.",
        });
        navigate("/login");
      }

    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-card items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="mb-8 animate-float select-none">
            <span className="text-6xl font-bold text-foreground">roi<span className="text-primary">Lead</span></span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Comece a prospectar hoje
          </h2>
          <p className="text-muted-foreground">
            Encontre seus primeiros leads agora mesmo.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Criar sua conta
          </h1>
          <p className="text-muted-foreground mb-8">
            Preencha seus dados para começar
          </p>

          <div className="grid gap-4 mb-6">
            <Button variant="outline" onClick={handleGoogleLogin} className="w-full">
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Entrar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com e-mail
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="João"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Silva"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                Aceito os{" "}
                <a href="#" className="text-primary hover:underline">Termos de Uso</a>
                {" "}e a{" "}
                <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
              </label>
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-muted-foreground mt-8">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
