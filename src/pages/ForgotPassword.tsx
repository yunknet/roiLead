import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Eye, EyeOff, Mail, KeyRound, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [emailSent, setEmailSent] = useState(false);

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Use redirect URL to absolute path
            const redirectTo = `${window.location.origin}/update-password`;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });

            if (error) throw error;

            setEmailSent(true);
            toast.success("Link enviado! Verifique seu e-mail.");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao enviar link: " + error.message);
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
                        <span className="text-2xl font-bold text-foreground">
                            roi<span className="text-primary">Lead</span>
                        </span>
                    </div>

                    {!emailSent ? (
                        <>
                            {/* Header */}
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                Recuperar Senha
                            </h1>
                            <p className="text-muted-foreground mb-8">
                                Informe seu e-mail para receber um link de redefinição de senha.
                            </p>

                            {/* Form */}
                            <form onSubmit={handleSendLink} className="space-y-6">
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
                                    {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Verifique seu e-mail</h2>
                            <p className="text-muted-foreground">
                                Enviamos um link de recuperação para <strong>{email}</strong>.
                                <br />
                                Clique no link para criar uma nova senha.
                            </p>
                            <div className="pt-4">
                                <Button variant="outline" onClick={() => setEmailSent(false)}>
                                    Tentar outro e-mail
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Decorative (Hidden on mobile) */}
            <div className="hidden lg:flex flex-1 bg-gradient-card items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-hero-pattern" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />

                <div className="relative z-10 text-center max-w-md">
                    <div className="mb-8 animate-float select-none">
                        <span className="text-6xl font-bold text-foreground">
                            roi<span className="text-primary">Lead</span>
                        </span>
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
