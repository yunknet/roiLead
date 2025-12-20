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

    const referenceId = crypto.randomUUID()

    // cria assinatura pendente
    await supabase.from("subscriptions").insert({
      external_reference_id: referenceId,
      payment_status: "pending",
      subscription_status: "inactive",
      plan_name: plan,
      amount_paid: price,
    })

    const response = await fetch(
      "https://api.abacatepay.com/v1/billing/create",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("ABACATE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frequency: "ONE_TIME", // ÚNICO VALOR ACEITO

          methods: ["PIX", "CARD"],

          returnUrl: "https://roilead.ynksystems.com/pagamento/sucesso",
          completionUrl: "https://roilead.ynksystems.com/pagamento/sucesso",

          products: [
            {
              externalId: `roilead-${plan}`,
              name: `Assinatura roiLead - ${plan}`,
              quantity: 1,
              price: Math.round(price * 100),
            },
          ],

          metadata: {
            reference_id: referenceId,
            plan,
          },
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw result
    }

    return new Response(
      JSON.stringify({
        payment_url: result.data.url,
        referenceId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err }),
      { status: 400 }
    )
  }
})
