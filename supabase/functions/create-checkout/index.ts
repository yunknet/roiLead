import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const hublaLink = Deno.env.get('HUBLA_CHECKOUT_LINK')

    // Debug: Confirma que achou o link
    console.log("🔗 Buscando HUBLA_CHECKOUT_LINK...", hublaLink ? "Encontrado" : "NÃO ENCONTRADO")

    if (!hublaLink) {
      throw new Error('A variável HUBLA_CHECKOUT_LINK não está cadastrada nos Secrets.')
    }

    const paymentUrl = new URL(hublaLink)
    paymentUrl.searchParams.append("utm_source", "site_roiLead")

    // Tenta pegar o email (opcional)
    try {
      const { email } = await req.json()
      if (email) paymentUrl.searchParams.append("email", email)
    } catch (e) {
      // Ignora se não vier json
    }

    console.log("🚀 URL Gerada com Sucesso:", paymentUrl.toString())

    // --- A CORREÇÃO ESTÁ AQUI EMBAIXO ---
    // Voltamos o nome da chave para 'payment_url' para seu site reconhecer
    return new Response(JSON.stringify({ payment_url: paymentUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("❌ ERRO:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})