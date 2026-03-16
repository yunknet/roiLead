import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Bot, Save, Power, PowerOff, AlertCircle, BotOff, Coins, Zap, ShoppingCart, Info, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

    // Novos estados para tokens
    const [tokensBalance, setTokensBalance] = useState(0);
    const [trialUsed, setTrialUsed] = useState(false);
    const [claimingTrial, setClaimingTrial] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [isWhatsappConnected, setIsWhatsappConnected] = useState<boolean | null>(null);

    useEffect(() => {
        fetchAgentSettings();
        checkWhatsappConnection();
    }, []);

    const checkWhatsappConnection = async () => {
        try {
            // Primeiro busca o nome da instância se existir
            const { data: { user } } = await supabase.auth.getUser();
            let instanceName = undefined;
            if (user) {
                const { data: agent } = await supabase.from('ai_agents').select('instance_name').eq('user_id', user.id).maybeSingle();
                if (agent?.instance_name) instanceName = agent.instance_name;
            }

            const { data } = await supabase.functions.invoke('whatsapp', {
                body: { action: 'create_instance', instanceName }
            });
            const isConnected = data?.state === 'open' || data?.instance?.state === 'open';
            setIsWhatsappConnected(isConnected);
            return isConnected;
        } catch (e) {
            console.error("Erro ao checar conexão whatsapp:", e);
            setIsWhatsappConnected(false);
            return false;
        }
    };

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
                setTokensBalance(data.tokens_balance || 0);
                setTrialUsed(data.trial_used || false);
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
        // Se estiver tentando ligar, faz uma checagem fresca da conexão
        if (!isActive) {
            checkWhatsappConnection();
        }

        if (!isActive && tokensBalance <= 0) {
            toast.error("Você não possui saldo de créditos para ligar o agente.");
            return;
        }

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

    const handleClaimTrial = async () => {
        setClaimingTrial(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Update DB with 100 tokens and trial_used = true
            const { error } = await supabase
                .from('ai_agents')
                .update({
                    tokens_balance: (tokensBalance + 100),
                    trial_used: true
                })
                .eq('user_id', user.id);

            if (error) throw error;

            setTokensBalance(prev => prev + 100);
            setTrialUsed(true);
            toast.success("Você recebeu 100 créditos de presente! 🎁");
        } catch (err) {
            console.error("Erro ao resgatar trial:", err);
            toast.error("Erro ao resgatar seus créditos de teste.");
        } finally {
            setClaimingTrial(false);
        }
    };

    const handlePurchaseTokens = async (planId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: { plan: planId, email: user?.email }
            });

            if (error) throw error;
            if (data?.payment_url) {
                // No mobile, redirecionar na mesma aba é mais seguro para evitar bloqueadores de popup
                window.location.href = data.payment_url;
            }
        } catch (err) {
            console.error("Erro ao gerar checkout:", err);
            toast.error("Erro ao abrir checkout. Tente novamente.");
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
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Novo
                    </span>
                </h2>
                <p className="text-muted-foreground">
                    Crie a personalidade e as regras do seu vendedor automático para interagir com leads no WhatsApp.
                </p>
                {isWhatsappConnected === false && (
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-600">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="text-sm">
                            <p className="text-sm font-bold">
                                Atenção: O Agente de IA só funcionará após você conectar seu WhatsApp.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* SEÇÃO DE CRÉDITOS E RECARGA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CARD DE SALDO */}
                <div className="md:col-span-1 bg-card border border-border p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Coins className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo Disponível</h3>
                        <div className="text-4xl font-black text-foreground">{tokensBalance.toLocaleString()}</div>
                        <p className="text-xs text-primary animate-pulse font-bold">Créditos de Mensagens</p>
                    </div>

                    {!trialUsed && (
                        <Button
                            variant="outline"
                            className="w-full h-11 border-primary/30 hover:bg-primary/5 text-primary gap-2 font-bold"
                            onClick={handleClaimTrial}
                            disabled={claimingTrial}
                        >
                            {claimingTrial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-primary" />}
                            Ganhar 100 Créditos Grátis
                        </Button>
                    )}
                </div>

                {/* CARD DE RECARGA (AGORA MAIS LARGO NOVAMENTE) */}
                <div className="md:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-foreground">Recarregar Créditos</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { tokens: "1.000", price: "50,00", planId: "1mil" },
                            { tokens: "5.000", price: "225,00", planId: "5mil", popular: true },
                            { tokens: "10.000", price: "400,00", planId: "10mil" }
                        ].map((pack, idx) => (
                            <div
                                key={idx}
                                onClick={() => handlePurchaseTokens(pack.planId)}
                                className={`p-4 rounded-xl border flex flex-col items-center transition-all hover:scale-[1.02] active:scale-95 cursor-pointer select-none ${pack.popular ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-muted/20'}`}
                            >
                                {pack.popular && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full mb-2 uppercase">Melhor Custo</span>}
                                <span className="text-xl font-black text-foreground">{pack.tokens}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-3">Créditos</span>
                                <div className="text-lg font-bold text-primary mb-4">R$ {pack.price}</div>
                                <Button
                                    className="w-full h-10 text-xs font-black uppercase pointer-events-none"
                                    variant={pack.popular ? "default" : "secondary"}
                                >
                                    Comprar
                                </Button>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic mt-2">
                        * Os créditos não expiram e são consumidos apenas no envio de respostas da IA.
                    </p>
                </div>
            </div>

            {/* BANNER: ENTENDA O AGENTE (POSICIONADO ABAIXO PARA NÃO COMPETIR COM PREÇOS) */}
            <div 
                onClick={() => setShowInfoModal(true)}
                className="bg-gradient-to-r from-primary to-green-600 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer hover:opacity-95 transition-all shadow-md group relative overflow-hidden"
            >
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors" />
                
                <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">Entenda o Agente de IA</h3>
                        <p className="text-sm text-white/90 font-medium">Descubra como nossa máquina de vendas escala seu atendimento por um custo baixíssimo.</p>
                    </div>
                </div>

                <Button variant="secondary" className="w-full sm:w-auto bg-white text-primary font-black hover:bg-white/90 shadow-xl px-8 h-12 uppercase tracking-tight relative z-10">
                    Clique aqui para entender 🚀
                </Button>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Status do Agente</h3>
                        <p className="text-sm text-muted-foreground">Ligar ou desligar a inteligência artificial para novas conversas.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div
                            className={`w-12 h-6 rounded-full relative transition-[background-color] duration-300 ease-in-out cursor-pointer flex-shrink-0 ${isActive ? 'bg-[#1bc678]' : 'bg-slate-300'}`}
                            onClick={handleToggleActive}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] transition-transform duration-300 ease-in-out shadow-md ${isActive ? 'translate-x-[26px]' : 'translate-x-[2px]'}`} />
                        </div>
                    </div>
                </div>

                {/* Seção de Pausa Temporária separada para não confundir com o Botão Master */}
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            {isLocked ? <Bot className="w-5 h-5 text-green-600" /> : <BotOff className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Pausa Temporária (Handover)</p>
                            <p className="text-xs text-muted-foreground">Impeça a IA de enviar respostas automáticas enquanto você atende os clientes.</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLockModal(true)}
                        className={`h-9 px-6 text-xs gap-2 transition-all duration-300 font-bold w-full sm:w-auto ${isLocked
                            ? 'border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white'
                            : 'border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white'
                            }`}
                    >
                        {isLocked ? (
                            <>
                                <Bot className="w-4 h-4" />
                                Destravar Agente Agora
                            </>
                        ) : (
                            <>
                                <BotOff className="w-4 h-4" />
                                Travar Agente Agora
                            </>
                        )}
                    </Button>
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
            {/* MODAL EXPLICATIVO DO AGENTE IA */}
            <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-background">
                    <div className="bg-primary p-6 text-white relative overflow-hidden">
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Bot className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold leading-none">Como o Agente IA funciona?</h3>
                                <p className="text-white/80 text-sm mt-2">Sua máquina de vendas 24 horas</p>
                            </div>
                        </div>
                        {/* Círculos decorativos de fundo */}
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="mt-1 bg-primary/10 p-2 rounded-lg h-fit">
                                    <Zap className="w-5 h-5 text-primary fill-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">Velocidade que Converte</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Leads que não são respondidos em minutos esfriam. Seu agente responde em segundos, garantindo que o cliente se sinta atendido na hora.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1 bg-primary/10 p-2 rounded-lg h-fit">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">Cérebro de Especialista</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Ele utiliza tecnologia avançada para entender o contexto, tirar dúvidas complexas e quebrar objeções como se fosse você digitando.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1 bg-primary/10 p-2 rounded-lg h-fit">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">Economia e Transparência</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Você só gasta 1 crédito quando a IA envia uma resposta. Atendimentos manuais são gratuitos. É o melhor custo-benefício para escalar sua operação.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-xl border border-border">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Dica de Ouro 💡</p>
                            <p className="text-sm italic text-foreground/80">"Quanto mais detalhado for o seu roteiro (System Prompt), mais persuasivo e certeiro o seu agente será nas respostas!"</p>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-0">
                        <Button onClick={() => setShowInfoModal(false)} className="w-full h-12 text-sm font-bold uppercase tracking-tight">
                            Entendi, Vamos Escalar! 🚀
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
