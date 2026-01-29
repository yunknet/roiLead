import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    // 1. Configuração do Cliente Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 2. SEGURANÇA: Validar se a requisição veio mesmo da Hubla
    // Você deve criar essa variável de ambiente no Supabase com o token da Hubla
    const hublaToken = Deno.env.get("HUBLA_WEBHOOK_TOKEN")
    const receivedToken = req.headers.get("x-hubla-token")

    if (!hublaToken || receivedToken !== hublaToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // 3. Ler o corpo da requisição
    const payload = await req.json()
    console.log("Hubla Payload Recebido:", payload)

    const eventName = payload.event || ""
    const data = payload.data || {}

    // 4. Filtrar eventos importantes
    // Eventos comuns da Hubla: 'sale.approved', 'sale.refunded', 'subscription.renewed'
    if (!eventName.startsWith("sale.") && !eventName.startsWith("subscription.")) {
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 })
    }

    // 5. Extrair ID de Referência (O 'src' que você passou na URL)
    // A Hubla geralmente envia isso dentro de utm.src ou metadata
    // Exemplo URL: pay.hub.la/...?src=ID_DO_USER
    const referenceId = data.utm?.src || data.metadata?.src

    if (!referenceId) {
      console.error("Webhook sem referenceId (src/utm)")
      return new Response(
        JSON.stringify({ ignored: true, reason: "missing_reference_src" }),
        { status: 200 }
      )
    }

    // 6. Buscar Assinatura no Banco (pelo ID do usuário que passamos no SRC)
    // ATENÇÃO: Estou assumindo que 'referenceId' é o ID do Usuário (user_id) ou ID da Assinatura
    // Ajuste o .eq() abaixo conforme sua lógica (se src é user_id ou external_reference_id)
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, payment_status, subscription_status")
      .eq("user_id", referenceId) // <--- Mudei para user_id (ajuste se for outro campo)
      .single()

    // Se não achar, talvez você queira CRIAR a assinatura aqui em vez de dar erro?
    if (error || !sub) {
      console.error("Assinatura/Usuário não encontrado:", referenceId)
      // Se quiser que o código pare aqui:
      return new Response(
        JSON.stringify({ ignored: true, reason: "subscription_not_found" }),
        { status: 200 }
      )
    }

    // 7. Mapear Status da Hubla para seu Sistema
    let payment_status = sub.payment_status
    let subscription_status = sub.subscription_status

    switch (eventName) {
      case "sale.approved":
      case "order.approved":
      case "subscription.renewed":
        payment_status = "paid"
        subscription_status = "active"
        break

      case "sale.refunded":
      case "sale.chargedback":
        payment_status = "refunded"
        subscription_status = "suspended"
        break

      case "subscription.canceled":
        subscription_status = "canceled"
        break
    }

    // 8. Preparar dados para Atualizar
    const updates: any = {
      payment_status,
      subscription_status,
      hubla_transaction_id: data.transaction_id || data.id, // Mudei de kiwify para hubla
      last_event_type: eventName,
      // Hubla envia valor em centavos ou float dependendo da versão, verifique logs.
      // Geralmente em V2 é 'amount' direto.
      amount_paid: data.amount ? Number(data.amount) : null,
      updated_at: new Date().toISOString(),
    }

    // Dados do Pagador (se disponíveis)
    if (data.customer) {
      if (data.customer.email) updates.email = data.customer.email
      if (data.customer.name) updates.full_name = data.customer.name
      if (data.customer.phone) updates.phone_number = data.customer.phone
    }

    // 9. Atualizar no Supabase
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", sub.id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200 }
    )

  } catch (err: any) {
    console.error("Webhook critical error:", err)
    return new Response(
      JSON.stringify({ error: "server_error", details: err.message }),
      { status: 400 }
    )
  }
})