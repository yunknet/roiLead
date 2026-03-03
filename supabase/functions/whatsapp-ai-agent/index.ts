import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

serve(async (req) => {
  // Configuração de CORS padrão do Supabase
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload = await req.json()

    // 1. FILTRAR EVENTO DA EVOLUTION API (Queremos apenas mensagens recebidas)
    // Geralmente o evento é "messages.upsert" e tem "fromMe": false
    if (payload.event !== 'messages.upsert') {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'not a message event' }), { status: 200 })
    }

    const instanceName = payload.instance;
    const messageData = payload.data?.message;
    const remoteJid = payload.data?.key?.remoteJid;
    const fromMe = payload.data?.key?.fromMe;

    // IGNORAR GRUPOS (Se o ID do chat contiver '@g.us', é um grupo)
    if (remoteJid && remoteJid.includes('@g.us')) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'group message' }), { status: 200 });
    }

    // Se a mensagem foi enviada pelo próprio usuário (vendedor), não fazemos nada (o Handover humano já desliga a IA no frontend)
    if (fromMe || !remoteJid || !messageData) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'from me or empty' }), { status: 200 })
    }

    // Extrair o texto da mensagem (depende do tipo de mensagem enviada no WhatsApp)
    const incomingText = messageData.conversation || messageData.extendedTextMessage?.text;
    if (!incomingText) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'not text message' }), { status: 200 })
    }

    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '');

    // 2. CONECTAR AO BANCO
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Precisamos achar o dono desta instância. Vamos assumir que na tabela profiles tem a coluna evolution_instance
    // Como POC, vou fazer uma busca no profiles onde EvolutionInstance = instanceName
    // Nota: Adapte essa busca para o campo exato onde você guarda qual usuário é dono da instância 'xyz'
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('evolution_instance', instanceName)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Instance not linked to user' }), { status: 400 });
    }

    const userId = profile.id;

    // 3. CONSULTAR REGRAS DA IA DESTE USUÁRIO
    const { data: agentConfig } = await supabase
      .from('ai_agents')
      .select('is_active, system_prompt')
      .eq('user_id', userId)
      .single();

    if (!agentConfig || !agentConfig.is_active || !agentConfig.system_prompt) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'agent is off or not configured' }), { status: 200 });
    }

    // 4. VERIFICAR SE A IA ESTÁ PAUSADA PARA ESTE LEAD ESPECÍFICO (Handover)
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('id, ai_auto_reply')
      // Busca pelo telefone exato armazenado no seu CRM. Pode ser necessário formatar.
      // Aqui usamos LIKE ou = dependendo de como os telefones ficam salvos.
      .ilike('telefone', `%${cleanPhone}%`)
      .single();

    if (lead && lead.ai_auto_reply === false) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'AI paused for this lead by human intervention' }), { status: 200 });
    }

    // 5. RECUPERAR O HISTÓRICO DE MENSAGENS PARA DAR CONTEXTO (Últimas 5 mensagens)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('message, sender')
      .eq('user_id', userId)
      .eq('contact_phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(6); // As 6 mais recentes

    // Gemini exige um array de `contents` onde alternamos as roles 'user' e 'model'
    // Vamos montar isso:
    const geminiHistory = [];
    if (history && history.length > 0) {
      // Reverter para ficar na ordem cronológica: do mais antigo para o mais novo
      const chronological = history.reverse();
      for (const msg of chronological) {
        // Ignorar se a mensagem for vazia
        if (!msg.message) continue;

        geminiHistory.push({
          role: msg.sender === 'me' ? 'model' : 'user', // Se "eu" (Agente/Humano) respondi, o Gemini entende como "model"
          parts: [{ text: msg.message }]
        });
      }
    }

    // Somar a mensagem que acabou de chegar
    geminiHistory.push({
      role: 'user',
      parts: [{ text: incomingText }]
    });

    // 6. SOLICITAR RESPOSTA A API DO GOOGLE GEMINI
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Configurar o Payload para o formato V1Beta do Gemini
    const geminiBody = {
      system_instruction: {
        parts: [{ text: agentConfig.system_prompt }]
      },
      contents: geminiHistory,
      generationConfig: {
        temperature: 0.7, // 0 a 2 (Criatividade. 0.7 é ideal para vendas, evita alucinações absurdas)
        maxOutputTokens: 250 // Evita respostas textões
      }
    };

    const geminiReq = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody)
    });

    const geminiResp = await geminiReq.json();

    if (!geminiReq.ok) {
      console.error("Gemini API Error:", geminiResp);
      return new Response(JSON.stringify({ error: 'Gemini formulation failed' }), { status: 500 });
    }

    // Extrair o texto da resposta
    const aiResponseText = geminiResp.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'gemini returned empty' }), { status: 200 });
    }

    // 7. ENVIAR A MENSAGEM VIA EVOLUTION API (WHATSAPP)
    const evolutionSendUrl = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
    const evoReq = await fetch(evolutionSendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        number: remoteJid, // Número com @s.whatsapp.net ou limpo, verifique formato da Evo
        options: { delay: 1500, presence: 'composing' }, // Simula digitando 1.5s
        textMessage: {
          text: aiResponseText
        }
      })
    });

    if (!evoReq.ok) {
      const evoErr = await evoReq.text();
      console.error("Evolution Send Error:", evoErr);
      return new Response(JSON.stringify({ error: 'Failed to send WhatsApp message' }), { status: 500 });
    }

    // 8. SALVAR A RESPOSTA DA IA NO BANCO DE DADOS (chat_messages) PARA APARECER NO PAINEL DO CRM
    await supabase.from('chat_messages').insert({
      user_id: userId,
      contact_phone: cleanPhone,
      message: aiResponseText,
      sender: 'me', // Fica verde no chat do CRM
      status: 'sending'
    });

    return new Response(JSON.stringify({ status: 'success', sent: aiResponseText }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Agent Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    });
  }
})
