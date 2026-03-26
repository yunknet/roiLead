import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptMessage } from './crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Debug Logger: Store raw payload to check reception (Commented out because webhook_logs table is being deleted)
    /*
    try {
      await supabaseClient.from('webhook_logs').insert({
        payload: payload
      });
    } catch (logErr) {
      console.error('Failed to log webhook:', logErr);
    }
    */
    const eventType = payload.event || payload.type;
    const instanceStr = payload.instance;
    const data = payload.data;
    // Only process upsert messages (new messages)
    if (eventType !== 'messages.upsert' && eventType !== 'MESSAGES_UPSERT') {
      return new Response(JSON.stringify({
        message: 'Ignored event type'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Extract User ID from Instance Name
    let userId = instanceStr?.startsWith('user_') ? instanceStr.replace('user_', '') : null;

    // Se não for o padrão user_UUID, busca no banco pelo apelido da instância (ex: roiLead)
    if (!userId && instanceStr) {
      const { data: agent } = await supabaseClient
        .from('ai_agents')
        .select('user_id')
        .eq('instance_name', instanceStr)
        .maybeSingle();

      if (agent) userId = agent.user_id;
    }

    if (!userId) {
      console.error('Could not identify user from instance name:', instanceStr);
      // Return 200 to acknowledge webhook and stop retries, but log error
      return new Response(JSON.stringify({
        error: 'User identification failed'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Handle both Array array and Single Object (Evolution v1 vs v2)
    let messages = [];
    if (data?.messages && Array.isArray(data.messages)) {
      messages = data.messages;
    } else if (Array.isArray(data)) {
      messages = data;
    } else if (data && typeof data === 'object') {
      // v2 evolution passes single message directly inside data
      if (data.key) {
        messages = [data];
      } else if (data.message && data.message.extendedTextMessage) {
        messages = [data];
      }
    }

    // NEW: Stop processing immediately if it's a group message to avoid sending to n8n
    const isGroup = messages.some(msg => msg.key?.remoteJid?.includes('@g.us'));
    if (isGroup) {
      // console.log('Ignore group message from instance:', instanceStr);
      return new Response(JSON.stringify({ message: 'Ignored group message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    for (const msg of messages) {
      if (!msg.key) continue;
      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      // Ignore status updates
      if (remoteJid?.includes('status@broadcast')) continue;
      
      const phone = remoteJid?.replace('@s.whatsapp.net', '');
      // Get message content
      let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || (msg.message?.imageMessage ? '📷 Foto' : null) || (msg.message?.audioMessage ? '🎤 Áudio' : null) || (msg.message?.videoMessage ? '🎥 Vídeo' : null) || '';
      if (!text && msg.message?.templateButtonReplyMessage) {
        text = msg.message.templateButtonReplyMessage.selectedDisplayText;
      }
      if (!text) continue;
      // OTIMIZAÇÃO DE CPU: Pulamos o download e processamento de Base64 de mídias (fotos/áudios)
      // para evitar que o servidor MICRO trave com mensagens grandes.
      const msgType = msg.message?.imageMessage ? 'image' : msg.message?.audioMessage ? 'audio' : msg.message?.videoMessage ? 'video' : 'text';
      let mediaUrl = null;
      
      /* 
      // Trecho pesado comentado para economizar CPU:
      let rawBase64 = ... processo de download ...
      mediaUrl = `data:${safeMimeType};base64,${cleanBase64}`; 
      */

      // Placeholder amigável para preservar performance
      if (msgType !== 'text') {
        text = text || (msgType === 'image' ? '📷 Foto' : msgType === 'audio' ? '🎤 Áudio' : '🎥 Vídeo');
      }
      
      // Encrypt the message text before saving to database
      const encryptedText = await encryptMessage(text, userId);

      // Insert into chat_messages
      const { error: msgError } = await supabaseClient.from('chat_messages').insert({
        user_id: userId,
        contact_phone: phone,
        message: encryptedText,
        sender: fromMe ? 'me' : 'them',
        status: fromMe ? 'sent' : 'delivered',
        type: msgType,
        media_url: mediaUrl,
        created_at: new Date(msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now()).toISOString()
      });
      if (msgError) {
        console.error('Error saving message:', msgError);
        continue;
      }
      // Update or Insert Lead (even if fromMe, so the chat shows up in CRM)
      // Check if lead exists
      const { data: existingLead } = await supabaseClient.from('crm_leads').select('id, title').eq('user_id', userId).eq('phone', phone).maybeSingle();
      if (existingLead) {
        // Se o lead existe mas o título é o telefone e temos um pushName de mensagem RECEBIDA, atualiza com o nome do contato
        const updateData: any = { updated_at: new Date().toISOString() };
        if (!fromMe && msg.pushName && existingLead.title === phone) {
          updateData.title = msg.pushName;
        }
        await supabaseClient.from('crm_leads').update(updateData).eq('id', existingLead.id);
      } else {
        // Para novo lead: só usa pushName se a msg veio DO contato (!fromMe)
        // Se fromMe = true, pushName é o nome do REMETENTE (o próprio usuário), não do contato
        const contactName = !fromMe && msg.pushName ? msg.pushName : phone;
        await supabaseClient.from('crm_leads').insert({
          user_id: userId,
          title: contactName,
          phone: phone,
          company: "WhatsApp",
          status: 'new',
          value: 0
        });
      }

      // O envio para o N8N foi movido para o final do arquivo, fora do loop, para evitar duplicações.
    }

    // A MÁGICA ACONTECE AQUI: A Trava do Agente (Gate de Inteligência)
    // Após salvar as conversas no banco de dados local perfeitamente, decidimos se repassamos ao N8N
    try {
      const { data: agentData } = await supabaseClient
        .from('ai_agents')
        .select('is_active, tokens_balance, is_locked')
        .eq('user_id', userId)
        .maybeSingle();

      const isAgentActive = agentData?.is_active === true;
      const hasTokens = (agentData?.tokens_balance ?? 0) > 0;
      const isLocked = agentData?.is_locked === 'sim';
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

      if (isAgentActive && hasTokens && n8nWebhookUrl) {
        console.log(`Agente ATIVADO e com SALDO (${agentData.tokens_balance}). Repassando payload para o N8N: ${n8nWebhookUrl}`);

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload) // <-- Enviando o payload bruto para o bot assumir
        });

        if (!n8nResponse.ok) {
          console.error(`Falha ao encaminhar ao n8n. Status: ${n8nResponse.status}`, await n8nResponse.text());
        } else {
          console.log(`Payload enviado ao n8n com sucesso (Usuário: ${userId})`);
        }
      } else {
        const reason = !isAgentActive ? 'DESATIVADO' : !hasTokens ? 'SEM SALDO' : 'N8N_URL vazia';
        console.log(`Agente não chamado. Motivo: ${reason}. Controle exclusivamente humano.`);
      }
    } catch (agentErr) {
      console.error("Erro ao verificar status do agente ou falha de comunicação n8n:", agentErr);
    }

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
