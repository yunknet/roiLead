import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bot, Save, Power, PowerOff, AlertCircle, BotOff } from "lucide-react";

const DEFAULT_PROMPT = `# IDENTIDADE E MISSÃO
Você é [Seu Nome, ex: João], [Seu Cargo, ex: Especialista de Vendas] da empresa [Nome da sua Empresa].
Sua missão é atuar como um agente de suporte e vendas via WhatsApp, convertendo leads que iniciaram uma jornada de compra, mas travaram em alguma etapa.
O seu tom de voz é [Defina o tom, ex: direto, consultivo e muito acessível]. Você fala de forma natural, sem textos robóticos longos.

🚫 REGRAS ESTRITAS DE FORMATAÇÃO (PROIBIDO):

NUNCA use negrito, itálico ou qualquer marcação (proibido usar * ou **).

NUNCA use tópicos, listas, bullet points (•), setas (👉), traços (-) ou numerações (1., 2.).

NUNCA faça piadas, ironias, trocadilhos ou use tom de brincadeira.

NUNCA use gírias informais demais, mas também não use português arcaico ou robótico.

NUNCA envie emojis (ou, no máximo absoluto, apenas um emoji muito discreto de cordialidade como um aperto de mãos no início do atendimento, mas prefira texto puro).

Escreva sempre em texto corrido e parágrafos curtos, simulando a digitação humana.

# CONHECIMENTO DA EMPRESA E PRODUTO
O que nós vendemos: [Explique o seu produto ou serviço em 1 ou 2 frases].
Como funciona na prática: [Explique como o cliente usa ou recebe o produto/serviço].
Nossos Diferenciais: [Liste os diferenciais do seu produto em texto corrido, ex: nosso produto é original, tem garantia de 1 ano e suporte diário].
Limites ou Regras: [Escreva se há alguma regra, ex: atendemos apenas no estado de São Paulo / o prazo de entrega é de 5 dias].

# PLANOS E PREÇOS (COMO EXPLICAR)
Quando for falar de preços, explique de forma natural e discursiva, sem fazer listas.
Opção 1: [Descreva o plano básico/produto 1 e o valor em texto corrido. Ex: O plano básico custa 50 reais por mês e inclui X e Y].
Opção 2 (Mais vantajosa): [Descreva o plano premium/produto 2 e o valor em texto corrido. Ex: O pacote completo sai por 100 reais e você ganha Z de bônus].
Link para compra: [Insira o link do seu site, catálogo ou checkout].

# ARGUMENTOS DE VENDAS E QUEBRA DE OBJEÇÕES
Se o cliente achar caro: [Como responder? Ex: Diga que o valor reflete a qualidade superior e a economia de tempo a longo prazo].
Se o cliente disser que precisa pensar: [Como responder? Ex: Diga que compreende, mas reforce que a oferta atual tem limite de vagas/estoque].
Outra objeção comum: [Escreva aqui a objeção que você mais ouve e como a IA deve rebatê-la em texto corrido].

# FLUXO DE ABORDAGEM
Apresente-se: Olá, tudo bem? Aqui é [Seu Nome], da [Nome da sua Empresa].
Diga o motivo: Posso ajudar em algo? (Adapte o início da conversa conforme o assunto que o cliente trouxer).
Qualifique com uma pergunta curta: Nunca pergunte antes do usuário falar o que deseja. Assim que houver abertura, pergunte: [Sua pergunta principal, ex: Qual o seu principal objetivo com o nosso produto hoje?]
Fechamento: Caso haja objeções, contorne de maneira sutil e profissional, conduzindo o cliente a adquirir o produto e enviando o link do site quando houver interesse.

# REGRAS GERAIS DE COMUNICAÇÃO
Responda de forma concisa, enviando apenas uma ideia por mensagem.
Faça apenas uma pergunta por vez.
Nunca invente funcionalidades, preços ou promessas que não estão descritas aqui.`;

export function AIAgentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [agentId, setAgentId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockDuration, setLockDuration] = useState(1);
    const [lockUnit, setLockUnit] = useState<'min' | 'hour'>('min');

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
                setIsLocked(data.is_locked === 'sim');
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

    const handleLockAgent = async (unlock = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const seconds = unlock ? 0 : (lockUnit === 'min' ? lockDuration * 60 : lockDuration * 3600);
        const lockValue = unlock ? 'não' : 'sim';

        const { error } = await supabase
            .from('ai_agents')
            .update({
                is_locked: lockValue,
                lock_time_seconds: seconds
            })
            .eq('user_id', user.id);

        if (!error) {
            setShowLockModal(false);
            setIsLocked(!unlock);
            toast.success(unlock ? 'Agente destravado com sucesso!' : `Agente travado por ${lockDuration} ${lockUnit === 'min' ? 'minuto(s)' : 'hora(s)'}`);
        } else {
            console.error("Erro ao atualizar agente:", error);
            toast.error(unlock ? 'Erro ao destravar agente' : 'Erro ao travar agente');
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
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLockModal(true)}
                            className={`h-9 px-4 text-xs gap-2 transition-all duration-300 font-bold ${isLocked
                                ? 'border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white'
                                : 'border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white'
                                }`}
                        >
                            {isLocked ? (
                                <>
                                    <Bot className="w-4 h-4" />
                                    Destravar Agente
                                </>
                            ) : (
                                <>
                                    <BotOff className="w-4 h-4" />
                                    Travar Agente Agora
                                </>
                            )}
                        </Button>

                        <div
                            className={`w-12 h-6 rounded-full relative transition-[background-color] duration-300 ease-in-out cursor-pointer flex-shrink-0 ${isActive ? 'bg-[#1bc678]' : 'bg-slate-300'}`}
                            onClick={handleToggleActive}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-transform duration-300 ease-in-out shadow-md ${isActive ? 'translate-x-[26px]' : 'translate-x-[2px]'}`} />
                        </div>
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

                        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4">
                            <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-xl text-sm flex flex-col gap-4">
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
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>
            </div>

            {/* LOCK AGENT MODAL */}
            {showLockModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-2xl w-full max-w-[320px] animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <BotOff className="w-5 h-5" />
                            <h3 className="font-bold">Travar Agente IA</h3>
                        </div>

                        <p className="text-xs text-muted-foreground mb-4">
                            O agente irá parar de responder automaticamente para todas as suas conversas pelo tempo selecionado.
                        </p>

                        <div className="flex gap-2 mb-6 text-foreground">
                            <Input
                                type="number"
                                min="1"
                                value={lockDuration}
                                onChange={(e) => setLockDuration(Number(e.target.value))}
                                className="flex-1 h-9 text-sm"
                            />
                            <select
                                value={lockUnit}
                                onChange={(e) => setLockUnit(e.target.value as any)}
                                className="bg-background border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                                <option value="min">Minutos</option>
                                <option value="hour">Horas</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 font-semibold">
                            <Button variant="ghost" size="sm" onClick={() => setShowLockModal(false)} className="text-xs">Cancelar</Button>
                            {isLocked ? (
                                <Button onClick={() => handleLockAgent(true)} className="bg-green-500 hover:bg-green-600 text-white text-xs h-9">Destravar Agora</Button>
                            ) : (
                                <Button onClick={() => handleLockAgent(false)} className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-9">Travar Agora</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
