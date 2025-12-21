import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const rawBody = await req.text()
    const event = JSON.parse(rawBody)

    console.log("Kiwify webhook:", event)

    const status = event.order_status

    // 🔍 Recuperar referenceId (src)
    const trackingParams =
      event.TrackingParams ||
      event.tracking_parameters ||
      event.tracking_params

    const referenceId =
      trackingParams?.src ||
      trackingParams?.utm_source ||
      event.src

    if (!referenceId) {
      console.error("Webhook sem referenceId")
      return new Response(
        JSON.stringify({ ignored: true, reason: "missing_reference" }),
        { status: 200 }
      )
    }

    // 🔎 Buscar assinatura
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, payment_status, subscription_status")
      .eq("external_reference_id", referenceId)
      .single()

    if (error || !sub) {
      console.error("Assinatura não encontrada:", referenceId)
      return new Response(
        JSON.stringify({ ignored: true, reason: "subscription_not_found" }),
        { status: 200 }
      )
    }

    // ♻️ Idempotência para pagamento aprovado
    if (status === "paid" && sub.payment_status === "paid") {
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { status: 200 }
      )
    }

    // 🎯 Mapeamento de eventos Kiwify → banco
    let payment_status = sub.payment_status
    let subscription_status = sub.subscription_status

    switch (status) {
      case "paid":
        payment_status = "paid"
        subscription_status = "active"
        break

      case "refunded":
      case "chargeback":
        payment_status = "failed"
        subscription_status = "suspended"
        break

      case "subscription_canceled":
        subscription_status = "suspended"
        break

      case "subscription_overdue":
        subscription_status = "suspended"
        break

      case "subscription_renewed":
        payment_status = "paid"
        subscription_status = "active"
        break

      default:
        return new Response(
          JSON.stringify({ received: true, ignored: true, status }),
          { status: 200 }
        )
    }

    // 🧾 Dados do cliente (se vierem)
    const customer = event.Customer || event.customer || {}

    const updates: any = {
      payment_status: payment_status,
      subscription_status: subscription_status,
      kiwify_order_id: event.order_id || null,
      kiwify_status: event.order_status || null,
      amount_paid: event.amount ? event.amount / 100 : null,
    }


    if (customer.email) updates.email = customer.email
    if (customer.mobile) updates.phone_number = customer.mobile
    if (customer.full_name) updates.full_name = customer.full_name

    // ✅ Atualizar banco
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", sub.id)

    if (updateError) {
      console.error(updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("Webhook error:", err)
    return new Response(
      JSON.stringify({ error: "invalid_webhook", details: err.message }),
      { status: 400 }
    )
  }
})
