import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bot, Save, Power, PowerOff } from "lucide-react";

const DEFAULT_PROMPT = `Você é um Vendedor Especialista focado em qualificar leads e fechar vendas pelo WhatsApp.

=== SUAS REGRAS DE OURO ===
1. Seja sempre amigável, educado e use emojis moderadamente (👋, 😊, 🚀).
2. Seu objetivo principal NÃO é dar o preço de cara, mas sim entender a dor do cliente.
3. Faça sempre UMA ÚNICA pergunta no final da sua mensagem. Nunca mande textos gigantes.
4. Se o cliente perguntar o preço, dê uma estimativa e pergunte algo em seguida para manter o controle da conversa.
5. Se o cliente mostrar interesse em avançar, diga que um especialista humano (ou gerente) vai assumir a conversa para finalizar os detalhes.

=== EXEMPLO DE POSTURA ===
Lead: "Qual o valor?"
Você: "Olá! Tudo bem? 👋 O valor varia bastante dependendo da sua necessidade exata (ex: tamanho, urgência). Para eu te dar uma estimativa certinha, me conta: qual é o seu objetivo principal hoje?"`;

export function AIAgentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [agentId, setAgentId] = useState<string | null>(null);

    useEffect(() => {
        fetchAgentSettings();
    }, []);

    const fetchAgentSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setAgentId(data.id);
                setIsActive(data.is_active);
                setSystemPrompt(data.system_prompt || "");
            } else {
                // Se não tem dados salvos, deixa vazio mas o placeholder vai mostrar o exemplo genial
                setSystemPrompt("");
            }
        } catch (err) {
            console.error("Erro ao buscar configurações do agente:", err);
            toast.error("Erro ao carregar configurações do Agente de IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Usuário não autenticado");
                return;
            }

            const payload = {
                user_id: user.id,
                is_active: isActive,
                system_prompt: systemPrompt.trim() !== "" ? systemPrompt : DEFAULT_PROMPT, // Salva o default se a pessoa deixar em branco
                updated_at: new Date().toISOString()
            };

            let error;
            if (agentId) {
                const { error: updateError } = await supabase
                    .from('ai_agents')
                    .update(payload)
                    .eq('id', agentId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('ai_agents')
                    .insert([payload]);
                error = insertError;
            }

            if (error) {
                console.error("Erro no supabase ai_agents:", error);
                throw error;
            }

            toast.success("Configurações do Agente IA salvas com sucesso!");
            fetchAgentSettings();
        } catch (err) {
            console.error("Erro ao salvar:", err);
            toast.error("Erro ao salvar configurações do agente.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 w-full space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Bot className="w-8 h-8 text-primary" />
                    Meu Agente de Inteligência Artificial
                </h2>
                <p className="text-muted-foreground">
                    Crie a personalidade e as regras do seu vendedor automático para interagir com leads no WhatsApp.
                </p>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Status do Agente</h3>
                        <p className="text-sm text-muted-foreground">Ligar ou desligar a inteligência artificial para novas conversas.</p>
                    </div>
                    <Button
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "bg-green-600 hover:bg-green-700 text-white" : "text-muted-foreground"}
                        onClick={() => setIsActive(!isActive)}
                    >
                        {isActive ? <Power className="w-4 h-4 mr-2" /> : <PowerOff className="w-4 h-4 mr-2" />}
                        {isActive ? "Agente Ligado" : "Agente Desligado"}
                    </Button>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground block">
                        Instruções do Vendedor (System Prompt)
                    </label>
                    <p className="text-sm text-muted-foreground mb-2">
                        Descreva detalhadamente como o seu Agente deve ler, pensar e responder aos clientes. Se você deixar em branco e ativar, usaremos o exemplo abaixo pro padrão.
                    </p>
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full min-h-[350px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 text-foreground resize-y outline-none leading-relaxed"
                        placeholder={DEFAULT_PROMPT}
                    />
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
