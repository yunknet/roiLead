
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
    const body = await req.json().catch(() => ({}));
    const requestedPlan = (body.plan || "anual").toLowerCase();

    // Seleciona a secret correta baseada no plano
    const secretKey = requestedPlan === 'mensal' ? 'HUBLA_CHECKOUT_MES' : 'HUBLA_CHECKOUT_LINK';
    const hublaLink = Deno.env.get(secretKey);

    console.log(`🔗 Buscando ${secretKey}...`, hublaLink ? "Encontrado" : "NÃO ENCONTRADO")

    if (!hublaLink) {
      throw new Error(`A variável ${secretKey} não está cadastrada nos Secrets.`)
    }

    const paymentUrl = new URL(hublaLink)
    paymentUrl.searchParams.append("utm_source", "site_roiLead")

    let email = body.email || ""
    if (email) {
      paymentUrl.searchParams.append("email", email)
      console.log("📧 E-mail injetado no checkout:", email)
    }

    // Função simples de máscara para logs
    const maskEmail = (e: string) => e ? e.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A"

    console.log("🚀 URL Gerada com Sucesso para:", maskEmail(email))

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
