import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  // Tratamento de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Usuário não autenticado (Falta token)")
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      throw new Error("Usuário inválido ou não logado")
    }

    // 1. Definição do Plano
    const PLANO_NOME = "Anual"
    const PLANO_PRECO = 69.90

    // --- CORREÇÃO AQUI ---
    // Antes estava HUBLA_CHECKOUT_LINK, agora mudei para HUBLA_YEARLY_LINK
    // para bater com o seu print dos Secrets.
    const HUBLA_CHECKOUT_URL = Deno.env.get("HUBLA_YEARLY_LINK")

    if (!HUBLA_CHECKOUT_URL) {
      throw new Error("Erro de Configuração: O Secret 'HUBLA_YEARLY_LINK' não foi encontrado.")
    }

    const referenceId = crypto.randomUUID()

    // 2. Cria registro no banco
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        gateway_order_id: referenceId,
        plan_name: PLANO_NOME,
        amount_paid: PLANO_PRECO,
        payment_status: "pending",
        subscription_status: "inactive",
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error("Erro ao salvar no banco:", error)
      throw error
    }

    // 3. Gera URL
    const paymentUrl = new URL(HUBLA_CHECKOUT_URL)
    paymentUrl.searchParams.append("utm_content", referenceId)

    if (user.email) paymentUrl.searchParams.append("email", user.email)
    if (user.user_metadata?.phone) paymentUrl.searchParams.append("phone", user.user_metadata.phone)

    paymentUrl.searchParams.append("utm_source", "site_roiLead")

    // Retorna 'payment_url' corretamente
    return new Response(
      JSON.stringify({ payment_url: paymentUrl.toString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error("Erro na create-checkout:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})