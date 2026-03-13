import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bot, Save, Power, PowerOff, AlertCircle } from "lucide-react";

const DEFAULT_PROMPT = `PERSONA E CONTEXTO
Você é [Nome do Agente, ex: João], consultor(a) especialista em [Seu Nicho/Mercado, ex: Planos de Saúde / Venda de Veículos / Estética].
Sua missão é atender leads no WhatsApp de forma cordial, natural e breve.
Não use palavras difíceis de serem entendidas!
Você DEVE coletar informações específicas para qualificação, mas SEM parecer um formulário ou um robô de "menus".
Não fale em terceira pessoa.

OBJETIVO DA CONVERSA
Você precisa extrair as seguintes informações essenciais do cliente, seguindo esta ordem lógica, mas adaptando a linguagem para ser fluida:

[Informação 1, ex: Qual o serviço/produto desejado?]
[Informação 2, ex: Qual a urgência do cliente ou prazo ideal?]
[Informação 3, ex: Qual o orçamento estimado ou faixa de preço?]
[Informação 4, se houver, ex: Qual a localização/bairro do cliente?]

(Nota: Apague ou adicione números acima conforme a necessidade do seu negócio).

REGRAS DE CONDUTA (IMPORTANTE)
1. NUNCA USE MENUS NUMERADOS: Jamais diga "Digite 1 para X". Pergunte naturalmente: "Você busca a opção X, Y ou Z?".
2. UM PASSO DE CADA VEZ: Faça apenas UMA pergunta por mensagem para não sobrecarregar o cliente.
3. SEJA RESILIENTE: Se o cliente responder de forma vaga (ex: "Não sei ainda"), explique educadamente que precisa de uma estimativa para conseguir ajudá-lo e pergunte novamente de forma amigável.

ROTEIRO DE FLUXO (GUIA LÓGICO)
PASSO 1: SAUDAÇÃO E PRIMEIRA PERGUNTA
(Apenas se for o início da conversa)
"Olá! Que bom ter você por aqui! 👋 Sou [Seu Nome], especialista em [Seu Nicho]. Para te ajudar da melhor forma, me conta rapidinho: [Insira aqui a sua 1ª pergunta]?"

PASSO 2: COLETA DE DADOS RESTANTES
Após a resposta, faça um elogio breve e avance para a próxima pergunta.
Exemplo: "Perfeito! [Insira aqui a próxima pergunta]"

PASSO 3: ENCERRAMENTO
Quando tiver tudo, encerre:
"Prontinho! Tudo anotado. Em alguns instantes você será atendido(a) para darmos andamento! ☎️"`;

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

    const handleToggleActive = async () => {
        const newValue = !isActive;
        setIsActive(newValue);

        try {
            // Sincroniza imediatamente com Evolution API (Webhook) + Settings
            await supabase.functions.invoke('whatsapp', {
                body: { action: 'set_webhook', useN8n: newValue }
            });

            // Salva no DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const payload = {
                    user_id: user.id,
                    is_active: newValue,
                    system_prompt: systemPrompt.trim() !== "" ? systemPrompt : DEFAULT_PROMPT,
                    updated_at: new Date().toISOString()
                };
                if (agentId) {
                    await supabase.from('ai_agents').update(payload).eq('id', agentId);
                } else {
                    const { data } = await supabase.from('ai_agents').insert([payload]).select().single();
                    if (data) setAgentId(data.id);
                }
            }
            toast.success(newValue ? "Agente Ligado!" : "Agente Desligado!");
        } catch (err) {
            console.error("Erro ao sincronizar status do agente:", err);
            toast.error("Erro ao alternar o status do agente.");
            setIsActive(!newValue); // rollback
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
                    <div
                        className={`w-12 h-6 rounded-full relative transition-[background-color] duration-300 ease-in-out cursor-pointer flex-shrink-0 ${isActive ? 'bg-[#1bc678]' : 'bg-slate-300'}`}
                        onClick={handleToggleActive}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-transform duration-300 ease-in-out shadow-md ${isActive ? 'translate-x-[26px]' : 'translate-x-[2px]'}`} />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground block">
                        Instruções do Vendedor (System Prompt)
                    </label>
                    <p className="text-sm text-muted-foreground mb-2">
                        Descreva detalhadamente como o seu Agente deve ler, pensar e responder aos clientes. Se você deixar em branco e ativar, usaremos o exemplo abaixo pro padrão.
                    </p>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="flex-1 min-h-[450px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 text-foreground resize-y outline-none leading-relaxed"
                            placeholder={DEFAULT_PROMPT}
                        />

                        <div className="w-full lg:w-[320px] shrink-0 bg-red-500/5 border border-red-500/20 p-5 rounded-xl text-sm flex flex-col gap-4">
                            <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-base">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                Como editar esse roteiro?
                            </div>

                            <p className="leading-relaxed font-medium text-foreground/80">
                                O texto esmaecido ao lado é um <strong>modelo otimizado</strong> de alta conversão. Você pode ignorá-lo e digitar o seu próprio texto do zero se preferir.
                            </p>

                            <div className="space-y-2 mt-2">
                                <p className="font-bold text-red-600/90 dark:text-red-400">
                                    Quer usar o nosso modelo e apenas trocar as palavras?
                                </p>
                                <p className="leading-relaxed text-muted-foreground">
                                    Por ser um texto de fundo (placeholder), não é possível apagar os colchetes diretamente agora.
                                </p>
                            </div>

                            <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-semibold text-red-700 dark:text-red-400 mt-2">
                                Para destravar o texto e personalizá-lo, deixe o campo em branco e clique em "Salvar Configurações". O sistema irá preenchê-lo definitivamente para você!
                            </div>
                        </div>
                    </div>
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
