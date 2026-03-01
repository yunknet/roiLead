import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    // 🔒 SECURANÇA: CRÍTICO
    // Verifica se a requisição tem o segredo configurado (no header ou na query string)
    // Se você não configurou isso na Hubla, configure agora!
    const secret = Deno.env.get("HUBLA_WEBHOOK_SECRET")
    if (secret) {
      const tokenHeader = req.headers.get("x-hubla-token")
      const url = new URL(req.url)
      const tokenQuery = url.searchParams.get("token")

      if (tokenHeader !== secret && tokenQuery !== secret) {
        console.error("⛔ Acesso Negado: Token de webhook inválido.")
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      }
    } else {
      console.warn("⚠️ ALERTA DE SEGURANÇA: HUBLA_WEBHOOK_SECRET não configurado. Qualquer pessoa pode simular pagamentos!")
    }

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

    // --- FUNÇÃO DE BUSCA DE DADOS (ROBUSTA & SEGURA) ---
    const getCustomerData = (data: any) => {
      const invoice = data.invoice || {}
      // Tenta achar o objeto de usuário em vários lugares possíveis do payload
      const user = data.user || data.customer || data.payer || invoice.payer || data.subscriber || {}

      // E-mail: varre todas as possibilidades
      const email = user.email || data.email || invoice.email || data.userEmail

      // Telefone: varre todas as possibilidades e limpa
      let phone = user.phone || data.phone || invoice.phone || data.userPhone || ""
      if (phone) phone = phone.replace(/\D/g, "")

      // Nome: varre e formata
      const firstName = user.firstName || data.first_name || user.name || data.userName || ""
      const lastName = user.lastName || ""
      const fullName = `${firstName} ${lastName}`.trim() || firstName || "Cliente"

      return { email, firstName, fullName, phone, invoice, user }
    }

    // --- FUNÇÃO PARA MASCARAR DADOS SENSÍVEIS (LOGS) ---
    const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A"
    const maskPhone = (phone: string) => phone ? phone.slice(-4).padStart(phone.length, '*') : "N/A"

    // ====================================================
    // GRUPO 1: VENDA APROVADA / ASSINATURA ATIVA
    // ====================================================
    if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid' || eventType === 'subscription.activated') {

      const { email, firstName, fullName, phone, invoice } = getCustomerData(eventData)

      const cents = invoice.amount?.totalCents || 0
      // Se cents > 0 divide por 100, senão tenta pegar de data.amount (number normal)
      const amount = cents > 0 ? cents / 100 : (Number(eventData.amount) || 0)

      const planName = "Anual";

      // Tenta pegar UTM Content (referenceID) ou usa o ID da invoice
      const externalId = invoice.paymentSession?.utm?.content || invoice.id || `sub_${Date.now()}`

      console.log(`💰 Aprovado roiLead: ${maskEmail(email)} | R$ ${amount}`)

      if (email) {
        // Busca usuário para vincular (opcional, mas bom ter)
        let userId = null
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (userProfile) userId = userProfile.id

        // Upsert na tabela subscriptions
        // Agora usamos external_reference_id como chave única (garantido pela migration de segurança)
        const { error: dbError } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          email: email,
          full_name: fullName,
          phone_number: phone,
          plan_name: planName,
          amount_paid: amount,
          payment_status: "paid",
          subscription_status: "active",
          external_reference_id: externalId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'external_reference_id' })

        if (dbError) {
          console.error("❌ Erro no upsert (Subscriptions):", dbError.message)
          // Tenta fallback por email SOMENTE se o erro for diferente de constraint violation no external_id
          if (!dbError.message.includes("subscriptions_external_reference_id_key")) {
            console.log("⚠️ Tentando fallback upsert por email...")
            await supabase.from("subscriptions").upsert({
              email: email,
              full_name: fullName,
              phone_number: phone,
              plan_name: planName,
              amount_paid: amount,
              payment_status: "paid",
              subscription_status: "active",
              external_reference_id: externalId, // Tenta salvar msm assim
              updated_at: new Date().toISOString()
            }, { onConflict: 'email' })
          }
        } else {
          console.log("✅ Banco atualizado: Assinatura ATIVA")
        }

        // Atualiza status no Profile tbm para garantir o acesso imediato
        if (userId) {
          await supabase.from('profiles').update({
            payment_status: 'PAID',
            access_status: 'PAID_USER'
          }).eq('id', userId)
        }
      }

      // Envia WhatsApp do roiLead (v2.1)
      if (eventType === 'invoice.payment_succeeded' && phone && evoUrl && evoInstance) {
        const textMessage = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nJá liberei seu acesso e estou pronto para te ajudar a configurar tudo.\n\n📋 O QUE VOCÊ PODE PEDIR?
Diferente de buscas simples, aqui você tem filtros de precisão. Você pode solicitar empresas por:
📍 Local: Estado, Cidade.
🏢 Perfil: Capital Social, Data de Abertura.
⚖️ Tipo: Incluir/Excluir MEI, Simples Nacional.
📞 Contato: Apenas com Celular/WhatsApp ou excluir e-mails de contadores.

💡 COMO PEDIR (Exemplo):
"Busque Transportadoras em Guarulhos, com capital acima de 100 mil, que não sejam MEI."

⚠️ IMPORTANTE:
Como a ficha técnica é extensa, por aqui te envio o Resumo Essencial para agilizar a leitura.
👉 Todos os dados completos ficam salvos no seu Dashboard, onde você pode inclusive exportar para planilha (https://roilead.com.br/dashboard).

Vamos começar? Me diga: qual segmento e cidade você quer atacar hoje?
(Obs: Busco até 50 empresas por vez para não travar seu celular com mensagens grandes). 👇`
        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    // ====================================================
    // GRUPO 2: CANCELAMENTO / REEMBOLSO
    // ====================================================
    else if (
      eventType === 'invoice.refunded' ||
      eventType === 'subscription.canceled' ||
      eventType === 'CanceledSubscription' ||
      eventType === 'subscription.desactivated'
    ) {

      const { email, firstName, phone } = getCustomerData(eventData)

      console.log(`🚫 Cancelando acesso roiLead de: ${maskEmail(email)}`)

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

        if (error) console.error("❌ Erro ao atualizar banco (Cancelamento):", error)
        else console.log("✅ Banco atualizado: Status CANCELADO")

        // Opcional: remover acesso no perfil
        await supabase.from('profiles').update({
          payment_status: 'NONE',
          access_status: 'NEW'
        }).eq('email', email)
      }

      if (phone && evoUrl && evoInstance) {
        const textMessage = `Olá, ${firstName}. 👋\n\nNotei aqui que sua assinatura do *roiLead* foi cancelada/reembolsada e seu acesso foi pausado.\n\nPara voltar a aproveitar todos os benefícios, você pode assinar novamente acessando o painel.`
        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    // Resposta padrão 200 para a Hubla não ficar retentando em loop se for um evento desconhecido
    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error("❌ Erro Crítico:", err.message)
    // Retornamos 400 apenas em erro crítico de execução, mas idealmente 200 pra não travar a fila da Hubla
    return new Response(JSON.stringify({ error: err.message }), { status: 200 })
  }
})

// Função de Envio WhatsApp (Evolution API)
async function sendWhatsapp(url: string, key: string, instance: string, phone: string, text: string) {
  try {
    let cleanPhone = phone
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone

    // Remove espaços do instance name
    const safeInstanceName = instance.trim()

    const response = await fetch(`${url}/message/sendText/${safeInstanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": key },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
        linkPreview: false
      })
    })

    if (!response.ok) {
      console.error(`❌ Erro Evolution:`, await response.text())
    } else {
      console.log("✅ WhatsApp enviado com sucesso.")
    }
  } catch (e) { console.error("❌ Falha na conexão Evolution:", e) }
}