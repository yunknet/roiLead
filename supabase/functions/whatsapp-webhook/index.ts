import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    // Debug Logger: Store raw payload to check reception
    try {
      await supabaseClient.from('webhook_logs').insert({
        payload: payload
      });
    } catch (logErr) {
      console.error('Failed to log webhook:', logErr);
    }
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
    // Extract User ID from Instance Name (Assuming format: user_<UUID>)
    let userId = instanceStr?.replace('user_', '');
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
        messages = [
          data
        ];
      } else if (data.message && data.message.extendedTextMessage) {
        messages = [
          data
        ];
      }
    }
    for (const msg of messages) {
      if (!msg.key) continue;
      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      // Ignore status updates
      if (remoteJid?.includes('status@broadcast')) continue;
      // Ignore group messages
      const isGroup = remoteJid?.includes('@g.us');
      if (isGroup) continue;
      const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '');
      // Get message content
      let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || (msg.message?.imageMessage ? '📷 Foto' : null) || (msg.message?.audioMessage ? '🎤 Áudio' : null) || (msg.message?.videoMessage ? '🎥 Vídeo' : null) || '';
      if (!text && msg.message?.templateButtonReplyMessage) {
        text = msg.message.templateButtonReplyMessage.selectedDisplayText;
      }
      if (!text) continue;
      console.log('Processing message from:', phone, 'Text:', text, 'User:', userId);
      // Handle Media Base64 if available
      let mediaUrl = null;
      const msgType = msg.message?.imageMessage ? 'image' : msg.message?.audioMessage ? 'audio' : msg.message?.videoMessage ? 'video' : 'text';
      let rawBase64 = msg.message?.base64 || msg.base64 || msg.message?.audioMessage?.base64 || msg.message?.imageMessage?.base64 || msg.message?.videoMessage?.base64 || data?.base64;
      if (!rawBase64 && msgType !== 'text') {
        try {
          const evoUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evoapi.ynksystems.com';
          const evoKey = Deno.env.get('EVOLUTION_GLOBAL_KEY') || 'nvVTU4qX7fkYtvQ6bfz5wiYEXSP0tTPJ';
          const mediaRes = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instanceStr}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evoKey
            },
            body: JSON.stringify({
              message: msg
            })
          });
          const mediaData = await mediaRes.json();
          if (mediaData.base64) rawBase64 = mediaData.base64;
          if (!mediaData.base64 && mediaData.message?.base64) rawBase64 = mediaData.message.base64;
        } catch (e) {
          console.error('Failed to fetch media base64:', e);
        }
      }
      if (rawBase64) {
        let mimeType = 'application/octet-stream';
        if (msg.message?.audioMessage) mimeType = msg.message.audioMessage.mimetype || 'audio/ogg';
        else if (msg.message?.imageMessage) mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
        else if (msg.message?.videoMessage) mimeType = msg.message.videoMessage.mimetype || 'video/mp4';
        // Trim prefixes if necessary, but usually Evolution API returns raw base64 encoded strings
        const cleanBase64 = rawBase64.replace(/^data:(.*,)?/, '');
        // Chrome and Safari fail to load data URIs with spaces in the mime-type (e.g. "audio/ogg; codecs=opus")
        const safeMimeType = mimeType.replace(/\s+/g, '');
        mediaUrl = `data:${safeMimeType};base64,${cleanBase64}`;
      }
      // Insert into chat_messages
      const { error: msgError } = await supabaseClient.from('chat_messages').insert({
        user_id: userId,
        contact_phone: phone,
        message: text,
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
