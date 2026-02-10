import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const evoUrl = Deno.env.get("EVOLUTION_API_URL")
    const evoKey = Deno.env.get("EVOLUTION_API_KEY")
    const evoInstance = Deno.env.get("EVOLUTION_INSTANCE")

    // 1. Pega o Payload
    const payload = await req.json()
    const eventType = payload.type
    const eventData = payload.event

    console.log(`⚡ Evento Recebido: ${eventType}`)

    // --- FUNÇÃO DE BUSCA DE DADOS (AGORA COM SUPER-VISÃO) ---
    const getCustomerData = (data: any) => {
      const invoice = data.invoice || {}
      const user = data.user || data.customer || data.payer || invoice.payer || data.subscriber || {}

      // CORREÇÃO: Adicionei 'data.userEmail' na lista de busca
      const email = user.email || data.email || invoice.email || data.userEmail

      // CORREÇÃO: Adicionei 'data.userPhone'
      let phone = user.phone || data.phone || invoice.phone || data.userPhone || ""
      if (phone) phone = phone.replace(/\D/g, "")

      // CORREÇÃO: Adicionei 'data.userName'
      const firstName = user.firstName || data.first_name || user.name || data.userName || ""
      const fullName = `${firstName} ${user.lastName || ""}`.trim() || firstName || "Cliente"

      return { email, firstName, fullName, phone, invoice }
    }

    // ====================================================
    // GRUPO 1: VENDA APROVADA
    // ====================================================
    if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid' || eventType === 'subscription.activated') {

      const { email, firstName, fullName, phone, invoice } = getCustomerData(eventData)

      const cents = invoice.amount?.totalCents || 0
      const amount = cents > 0 ? cents / 100 : (Number(eventData.amount) || 0)

      let planName = amount > 100 ? "Anual" : "Mensal"
      if (amount === 0) planName = "Mensal"

      const externalId = invoice.paymentSession?.utm?.content || invoice.id

      console.log(`💰 Aprovado: ${fullName} | ${email} | R$ ${amount}`)

      if (email) {
        await supabase.from("subscriptions").upsert({
          email: email,
          full_name: fullName,
          phone_number: phone,
          plan_name: planName,
          amount_paid: amount,
          payment_status: "paid",
          subscription_status: "active",
          external_reference_id: externalId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' })
      }

      if (phone && evoUrl && evoInstance) {
        const textMessage = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nJá liberei seu acesso e estou pronto para te ajudar a configurar tudo. Se tiver qualquer dúvida, é só me chamar por aqui!`
        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    // ====================================================
    // GRUPO 2: CANCELAMENTO
    // ====================================================
    else if (
      eventType === 'invoice.refunded' ||
      eventType === 'subscription.canceled' ||
      eventType === 'CanceledSubscription' ||
      eventType === 'subscription.desactivated'
    ) {

      const { email, firstName, phone } = getCustomerData(eventData)

      // Agora vai mostrar o email certo!
      console.log(`🚫 Cancelando acesso de: ${email} (Tel: ${phone})`)

      if (email) {
        const payStatus = eventType === 'invoice.refunded' ? 'refunded' : 'canceled'

        const { error } = await supabase
          .from("subscriptions")
          .update({
            subscription_status: "canceled",
            payment_status: payStatus,
            updated_at: new Date().toISOString()
          })
          .eq("email", email)

        if (error) console.error("❌ Erro ao atualizar banco:", error)
        else console.log("✅ Banco atualizado: Status CANCELADO")
      } else {
        console.error("❌ E-mail não encontrado no evento de cancelamento.")
      }

      if (phone && evoUrl && evoInstance) {
        const textMessage = `Olá, ${firstName}. 👋\n\nNotei aqui que sua assinatura do *roiLead* foi cancelada/reembolsada e seu acesso foi pausado.\n\nPara voltar a aproveitar todos os benefícios, você pode assinar novamente clicando no link abaixo:\n\n👉 https://www.roilead.ynksystems.com`
        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error("❌ Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})

// Função de Envio Segura
async function sendWhatsapp(url: string, key: string, instance: string, phone: string, text: string) {
  try {
    let cleanPhone = phone
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone
    const safeInstanceName = encodeURIComponent(instance)
    const response = await fetch(`${url}/message/sendText/${safeInstanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": key },
      body: JSON.stringify({ number: cleanPhone, text: text })
    })
    if (!response.ok) { console.error(`❌ Erro Evolution:`, await response.text()) }
  } catch (e) { console.error("❌ Falha na conexão Evolution:", e) }
}