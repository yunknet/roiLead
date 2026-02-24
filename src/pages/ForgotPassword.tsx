import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"email" | "otp">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) throw error;

            setStep("otp");
            toast.success("Código enviado! Verifique seu e-mail.");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao enviar código: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem");
            return;
        }

        if (password.length < 6) {
            toast.error("A senha deve ter no mínimo 6 caracteres");
            return;
        }

        if (otp.length !== 8) {
            toast.error("Digite o código de 8 dígitos");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify OTP and Login
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: "email",
            });

            if (verifyError) throw verifyError;

            // 2. Update Password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            toast.success("Senha alterada com sucesso!");
            navigate("/dashboard");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao alterar senha: " + error.message);
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
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Login
                    </Link>

                    <div className="flex items-center gap-2 mb-8">
                        <div className="flex items-center text-3xl font-normal tracking-tighter" style={{ fontFamily: "'Varela Round', sans-serif" }}>
                            <span style={{ color: '#81BB3D' }}>roi</span>
                            <span className="text-[#2D3E50] dark:text-white">Lead</span>
                        </div>
                    </div>

                    {step === "email" ? (
                        <>
                            {/* Header */}
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                Recuperar Senha
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                Informe seu e-mail para receber um código de recuperação.
                            </p>

                            {/* Email Form */}
                            <form onSubmit={handleSendCode} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail cadastrado</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    variant="hero"
                                    className="w-full"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    {isLoading ? "Enviando..." : "Enviar Código"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Header OTP */}
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                Redefinir Senha
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                Digite o código enviado para <strong>{email}</strong> e sua nova senha.
                            </p>

                            {/* OTP + Password Form */}
                            <form onSubmit={handleResetPassword} className="space-y-6">

                                {/* OTP Input */}
                                <div className="space-y-2 flex flex-col items-center sm:items-start">
                                    <Label htmlFor="otp">Código de Verificação</Label>
                                    <InputOTP
                                        id="otp"
                                        value={otp}
                                        onChange={(value) => setOtp(value)}
                                        maxLength={8}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} />
                                            <InputOTPSlot index={1} />
                                            <InputOTPSlot index={2} />
                                            <InputOTPSlot index={3} />
                                            <InputOTPSlot index={4} />
                                            <InputOTPSlot index={5} />
                                            <InputOTPSlot index={6} />
                                            <InputOTPSlot index={7} />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>

                                {/* Password Fields */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Nova Senha</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Nova senha"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 pr-10"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirme a senha"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="pl-10 pr-10"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        type="submit"
                                        variant="hero"
                                        className="w-full"
                                        size="lg"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : null}
                                        {isLoading ? "Redefinir Senha" : "Alterar Senha"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => setStep("email")}
                                        disabled={isLoading}
                                    >
                                        Voltar
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Decorative (Hidden on mobile) */}
            <div className="hidden lg:flex flex-1 bg-gradient-card items-center justify-center p-8 relative overflow-hidden dark">
                <div className="absolute inset-0 bg-hero-pattern" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />

                <div className="relative z-10 text-center max-w-md">
                    <div className="mb-8 animate-float select-none">
                        <div className="flex items-center text-7xl font-normal tracking-tighter justify-center" style={{ fontFamily: "'Varela Round', sans-serif" }}>
                            <span style={{ color: '#81BB3D' }}>roi</span>
                            <span className="text-white">Lead</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                        Recuperação de Acesso
                    </h2>
                    <p className="text-muted-foreground">
                        Siga os passos para redefinir sua senha e voltar a prospectar leads qualificados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
