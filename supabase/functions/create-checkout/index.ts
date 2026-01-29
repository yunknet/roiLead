import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  // 1. Tratamento de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 2. Inicializa Supabase com Auth Context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    )

    // 3. Verifica usuário logado
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error("Usuário não autenticado")
    }

    // 4. CONFIGURAÇÃO DO PLANO ÚNICO
    // Não precisamos mais ler o "req.json()" para saber o plano
    const PLAN_NAME = "anual"
    const PRICE = 69.90
    const checkoutUrl = Deno.env.get("HUBLA_CHECKOUT_LINK") // Link único agora

    if (!checkoutUrl) {
      throw new Error("Link de pagamento (HUBLA_CHECKOUT_LINK) não configurado")
    }

    const userId = user.id

    // 5. Salva a intenção de compra no banco
    const { error: dbError } = await supabaseClient.from("subscriptions").upsert({
      user_id: userId,
      payment_status: "pending",
      subscription_status: "inactive",
      plan_name: PLAN_NAME,
      amount_paid: null, // Será preenchido pelo webhook quando pagar
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (dbError) {
      console.error(dbError)
      throw new Error("Erro ao salvar assinatura inicial")
    }

    // 6. Gera o Link Final com Rastreamento (src)
    const paymentUrl = new URL(checkoutUrl)

    // Anexa o ID do usuário para o Webhook identificar depois
    paymentUrl.searchParams.set("src", userId)

    // Pré-preenche o e-mail (Opcional, mas ajuda a converter)
    if (user.email) {
      paymentUrl.searchParams.set("email", user.email)
    }

    return new Response(
      JSON.stringify({
        payment_url: paymentUrl.toString(),
        referenceId: userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || err }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})