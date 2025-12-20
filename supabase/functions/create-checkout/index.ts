import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { plan } = await req.json()

    if (!plan || !["mensal", "anual"].includes(plan)) {
      throw new Error("Plano inválido (mensal ou anual)")
    }

    const price = plan === "mensal" ? 59.9 : 599.9
    const checkoutUrl =
      plan === "mensal"
        ? Deno.env.get("KIWIFY_MONTHLY_LINK")
        : Deno.env.get("KIWIFY_YEARLY_LINK")

    if (!checkoutUrl) {
      throw new Error("Links de pagamento não configurados")
    }

    const referenceId = crypto.randomUUID()

    // cria assinatura pendente
    await supabase.from("subscriptions").insert({
      external_reference_id: referenceId,
      payment_status: "pending",
      subscription_status: "inactive",
      plan_name: plan,
      amount_paid: price,
    })

    // Adiciona o referenceId como parâmetro 'src' para rastreamento no webhook
    const paymentUrl = new URL(checkoutUrl)
    paymentUrl.searchParams.append("src", referenceId)

    return new Response(
      JSON.stringify({
        payment_url: paymentUrl.toString(),
        referenceId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || err }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    )
  }
})
