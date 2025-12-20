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

    const { referenceId, fullName, email, phone } = await req.json()

    if (!referenceId || !fullName || !email || !phone) {
      throw new Error("Todos os campos são obrigatórios")
    }

    // 🔎 Buscar assinatura
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, subscription_status")
      .eq("external_reference_id", referenceId)
      .single()

    if (error || !sub) {
      throw new Error("Assinatura não encontrada")
    }

    if (sub.subscription_status === "active") {
      throw new Error("Assinatura já está ativa")
    }

    // ✏️ Atualizar dados do cliente e avançar estado
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        full_name: fullName,
        email,
        phone_number: phone,
        email_verified: false,
        phone_verified: false,
        subscription_status: "pending_activation",
      })
      .eq("id", sub.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cadastro finalizado. Aguardando confirmação de pagamento.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    )
  }
})
