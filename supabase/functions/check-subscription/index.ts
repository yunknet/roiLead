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

    const { referenceId } = await req.json()

    if (!referenceId) {
      throw new Error("referenceId é obrigatório")
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("subscription_status, payment_status, plan_name")
      .eq("external_reference_id", referenceId)
      .single()

    if (error || !data) {
      throw new Error("Assinatura não encontrada")
    }

    return new Response(
      JSON.stringify({
        active: data.subscription_status === "active",
        payment_status: data.payment_status,
        plan: data.plan_name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
