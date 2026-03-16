import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🔒 SECURANÇA: CRÍTICO
    const secret = Deno.env.get("HUBLA_WEBHOOK_SECRET")
    if (secret) {
      const tokenHeader = req.headers.get("x-hubla-token")
      const url = new URL(req.url)
      const tokenQuery = url.searchParams.get("token")

      if (tokenHeader !== secret && tokenQuery !== secret) {
        console.error("⛔ Acesso Negado: Token de webhook inválido.")
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ""
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    const eventType = (payload.type || payload.event_type || "").toLowerCase()
    const eventData = payload.event || payload

    console.log(`⚡ [AGENTE] Evento Recebido: ${eventType}`)

    // 1. Extração robusta de dados (Varre todas as possibilidades da Hubla)
    const invoice = eventData.invoice || {}
    const user = eventData.user || eventData.customer || eventData.payer || invoice.payer || eventData.subscriber || payload.user || {}

    const email = (user.email || eventData.email || invoice.email || payload.email || "").toLowerCase().trim()
    let phone = user.phone || eventData.phone || invoice.phone || user.phone_number || ""
    if (phone) phone = phone.replace(/\D/g, "")
    
    const firstName = (user.firstName || user.first_name || user.name || "Cliente").split(' ')[0]
    const fullName = user.fullName || user.name || firstName
    
    const productInfo = eventData.product?.name || eventData.products?.[0]?.name || payload.product_name || ""
    const offerName = eventData.offer?.name || eventData.products?.[0]?.offers?.[0]?.name || payload.offer_name || ""
    const combinedNames = `${productInfo} ${offerName}`.toLowerCase()
    const invoiceId = eventData.invoice?.id || eventData.id || `inv_${Date.now()}`

    console.log(`🔍 [AGENTE] Analisando nomes: "${combinedNames}" | InvID: ${invoiceId}`)

    // 2. Identificação dos Tokens (Verifica do maior para o menor para evitar conflitos)
    let tokensToAdd = 0;
    if (combinedNames.includes("10.000") || combinedNames.includes("10000") || combinedNames.includes("10 mil")) {
      tokensToAdd = 10000;
    } else if (combinedNames.includes("5.000") || combinedNames.includes("5000") || combinedNames.includes("5 mil")) {
      tokensToAdd = 5000;
    } else if (combinedNames.includes("1.000") || combinedNames.includes("1000") || combinedNames.includes("1 mil")) {
      tokensToAdd = 1000;
    }

    // Se não for evento de pagamento aprovado ou reembolso de tokens, ignoramos
    const isPaid = eventType.includes('paid') || eventType.includes('succeeded') || eventType.includes('active')
    const isRefund = eventType.includes('refunded')
    
    if ((!isPaid && !isRefund) || tokensToAdd === 0) {
      console.log(`ℹ️ Evento ignorado ou tokens não detectados. Tokens: ${tokensToAdd}, Pago: ${isPaid}, Refund: ${isRefund}, Evento: ${eventType}`)
      return new Response(JSON.stringify({ 
        message: "No action needed", 
        tokens: tokensToAdd, 
        type: eventType 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
    }

    if (!email) {
      console.error("❌ E-mail do comprador não encontrado.")
      return new Response(JSON.stringify({ error: "Email not found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
    }

    const actionText = isRefund ? "REEMBOLSO" : "RECARGA"
    console.log(`🪙 [${actionText}] Processando ${tokensToAdd} créditos para ${email}`)

    // 2. Localizar o Usuário no roiLead
    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
    
    if (!profile?.id) {
      console.error(`❌ Usuário não encontrado no banco para o e-mail: ${email}`)
      return new Response(JSON.stringify({ error: "User not found in system" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 })
    }

    const userId = profile.id

    // 3. Atualizar Saldo (Somar se pago, Subtrair se reembolso)
    const { data: agent } = await supabase.from('ai_agents').select('tokens_balance').eq('user_id', userId).maybeSingle()
    
    let newBalance = agent?.tokens_balance || 0
    if (isRefund) {
      newBalance = Math.max(0, newBalance - tokensToAdd)
      console.log(`📉 [REEMBOLSO] Subtraindo ${tokensToAdd}. Novo saldo: ${newBalance}`)
    } else {
      newBalance = newBalance + tokensToAdd
      console.log(`📈 [RECARGA] Adicionando ${tokensToAdd}. Novo saldo: ${newBalance}`)
    }

    const { error: tokenErr } = await supabase.from('ai_agents').upsert({
      user_id: userId,
      tokens_balance: newBalance,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

    if (tokenErr) {
      console.error("❌ Erro ao salvar créditos:", tokenErr.message)
      throw tokenErr
    }

    console.log(`✅ Créditos atualizados! Usuário ${userId} | Saldo: ${newBalance}`)

    // 4. Envio de Confirmação via WhatsApp (Evolution API)
    const evoUrl = Deno.env.get("EVOLUTION_API_URL")
    const evoKey = Deno.env.get("EVOLUTION_API_KEY")
    const evoInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME")

    if (phone && evoUrl && evoInstance && evoKey) {
      let msgTokens = `Olá, ${firstName}! 🪙\n\nSua recarga de *${tokensToAdd.toLocaleString()} créditos* no roiLead foi confirmada!\n\nSeu Agente de IA está com saldo atualizado e pronto para o trabalho. 🚀`
      
      if (isRefund) {
        msgTokens = `Olá, ${firstName}. ⚖️\n\nIdentificamos o estorno da sua compra de créditos. Por isso, removemos *${tokensToAdd.toLocaleString()} créditos* da sua conta.\n\nCaso tenha sido um erro, entre em contato com nosso suporte.`
      }
      
      try {
        await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
          body: JSON.stringify({
            number: phone.replace(/\D/g, ''),
            options: { delay: 1200, presence: "composing" },
            textMessage: { text: msgTokens }
          })
        })
      } catch (e) {
        console.error("⚠️ Erro ao enviar WhatsApp de confirmação:", e.message)
      }
    }

    // 5. Envio de E-mail (Resend)
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const senderEmail = "Equipe roiLead <contato@roilead.com.br>"

    if (email && resendApiKey) {
      let emailSubject = `🪙 Recarga de Créditos Confirmada - roiLead`
      let emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2D3748;">Recarga Confirmada!</h2>
          <p>Olá, <strong>${firstName}</strong>!</p>
          <p>Sua recarga de <strong>${tokensToAdd.toLocaleString()} créditos</strong> foi processada com sucesso.</p>
          <p>Seu Agente de IA já está com o saldo atualizado e pronto para atender seus clientes.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #718096;">Equipe roiLead</p>
        </div>
      `

      if (isRefund) {
        emailSubject = `⚖️ Estorno de Créditos - roiLead`
        emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #E53E3E;">Estorno de Créditos</h2>
            <p>Olá, <strong>${firstName}</strong>.</p>
            <p>Identificamos o estorno da sua compra de créditos. Por este motivo, removemos <strong>${tokensToAdd.toLocaleString()} créditos</strong> da sua conta.</p>
            <p>Se você acredita que isso foi um erro, entre em contato com nosso suporte.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #718096;">Equipe roiLead</p>
          </div>
        `
      }

      await sendEmail(resendApiKey, senderEmail, email, emailSubject, emailHtml)
    }

    return new Response(JSON.stringify({ success: true, newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error("❌ Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// Função de Envio de E-mail (Resend)
async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      console.error(`❌ Erro Resend:`, await response.text());
    } else {
      console.log(`✅ E-mail enviado com sucesso para ${to}`);
    }
  } catch (e) {
    console.error("❌ Falha na conexão com Resend:", e.message);
  }
}
