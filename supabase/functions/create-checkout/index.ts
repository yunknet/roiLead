import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  // 1. Tratamento de CORS (Padrão para browsers)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 2. Inicializa o Supabase
    // Precisamos do Auth context, então criamos o cliente passando o Header de Autorização
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    )

    // 3. Verifica QUEM é o usuário chamando a função
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error("Usuário não autenticado")
    }

    // 4. Recebe o plano escolhido
    const { plan } = await req.json()

    if (!plan || !["mensal", "anual"].includes(plan)) {
      throw new Error("Plano inválido (mensal ou anual)")
    }

    // 5. Define preços e links (configure isso nos Secrets do Supabase)
    const price = plan === "mensal" ? 59.9 : 238.8
    const checkoutUrl =
      plan === "mensal"
        ? Deno.env.get("HUBLA_MONTHLY_LINK")
        : Deno.env.get("HUBLA_YEARLY_LINK")

    if (!checkoutUrl) {
      throw new Error("Links de pagamento Hubla não configurados")
    }

    // 6. Prepara o Rastreamento
    // Usamos o ID do usuário como referência. Isso facilita muito no Webhook.
    const userId = user.id

    // 7. Salva/Atualiza a intenção de compra no Banco
    // Usamos 'upsert' para não criar duplicatas se o usuário clicar 10x no botão
    const { error: dbError } = await supabaseClient.from("subscriptions").upsert({
      user_id: userId,          // <--- IMPORTANTE: Vínculo com o usuário
      payment_status: "pending",
      subscription_status: "inactive", // Ainda não pagou
      plan_name: plan,
      amount_paid: null,        // Só preenche quando o webhook confirmar
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }) // Se já tiver linha pra esse user, atualiza

    if (dbError) {
      console.error(dbError)
      throw new Error("Erro ao salvar assinatura inicial")
    }

    // 8. Gera o Link Final da Hubla
    const paymentUrl = new URL(checkoutUrl)

    // IMPORTANTE: O Webhook espera ler o 'src'. 
    // A Hubla pega o parâmetro 'src' e devolve no webhook dentro de utm.src ou metadata
    paymentUrl.searchParams.set("src", userId)

    // Opcional: E-mail para pré-preencher o checkout (Aumenta conversão)
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