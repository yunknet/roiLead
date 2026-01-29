import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    // 1. Inicia o Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 2. SEGURANÇA: Token da Hubla (Obrigatório)
    const hublaToken = Deno.env.get("HUBLA_WEBHOOK_TOKEN")
    const receivedToken = req.headers.get("x-hubla-token")

    if (!hublaToken || receivedToken !== hublaToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // 3. Pega os dados
    const payload = await req.json()
    const eventName = payload.event || ""
    const data = payload.data || {}

    console.log(`Evento Hubla V2: ${eventName}`)

    // 4. FILTRO DE EVENTOS (Versão Corrigida para V2)
    // O seu código anterior tinha um erro aqui que bloqueava "invoice."
    if (!eventName.startsWith("invoice.") && !eventName.startsWith("subscription.")) {
      console.log(`Ignorando evento: ${eventName}`)
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 })
    }

    // 5. IDENTIFICA O USUÁRIO (pelo src do link)
    const referenceId = data.utm?.src || data.metadata?.src

    if (!referenceId) {
      console.warn(`Evento ${eventName} sem 'src' (ID do usuário).`)
      return new Response(JSON.stringify({ ignored: true, reason: "missing_src" }), { status: 200 })
    }

    // 6. BUSCA O USUÁRIO NO BANCO
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, subscription_status")
      .eq("user_id", referenceId) // Busca pelo ID do usuário
      .maybeSingle()

    if (!sub) {
      console.error(`Usuário ID ${referenceId} não encontrado no banco.`)
      return new Response(JSON.stringify({ ignored: true, reason: "user_not_found" }), { status: 200 })
    }

    // 7. ATUALIZA OS STATUS (Mapeamento V2)
    let newStatus = sub.subscription_status
    let paymentStatus = "pending"

    switch (eventName) {
      // SUCESSO: Libera o acesso
      case "subscription.activated":    // Assinatura ativa (v2)
      case "invoice.paid":              // Pagamento da fatura realizado (v2)
        newStatus = "active"
        paymentStatus = "paid"
        break

      // CANCELAMENTO: Mantém até expirar ou cancela
      case "subscription.canceled":
      case "subscription.deactivated":
        newStatus = "canceled"
        break

      // REEMBOLSO: Corta na hora
      case "invoice.refunded":
        newStatus = "suspended"
        paymentStatus = "refunded"
        break

      default:
        // Outros eventos (ex: invoice.created) não mudam status
        return new Response(JSON.stringify({ received: true, action: "none" }), { status: 200 })
    }

    // 8. SALVA NO BANCO
    const updates: any = {
      subscription_status: newStatus,
      payment_status: paymentStatus,
      last_event_type: eventName,
      updated_at: new Date().toISOString()
    }

    if (data.amount) updates.amount_paid = Number(data.amount)

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", sub.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, status: newStatus }), { status: 200 })

  } catch (err: any) {
    console.error("Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})