
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

    // Normalização robusta do plano solicitado
    const requestedPlan = String(body.plan || "anual").toLowerCase().trim();

    console.log("📥 Payload recebido:", JSON.stringify(body));
    console.log("🎯 Plano Detectado:", requestedPlan);

    // Seleciona a secret correta baseada no plano
    let secretKey = 'HUBLA_CHECKOUT_LINK'; // Default anual

    console.log(`🔍 Comparando "${requestedPlan}" com opções disponíveis...`);

    if (requestedPlan.includes('mensal') || requestedPlan.includes('monthly') || requestedPlan === 'mês') {
      secretKey = 'HUBLA_CHECKOUT_MES';
    } else if (requestedPlan.includes('1mil') || requestedPlan.includes('1000')) {
      secretKey = 'HUBLA_1MIL';
    } else if (requestedPlan.includes('5mil') || requestedPlan.includes('5000')) {
      secretKey = 'HUBLA_5MIL';
    } else if (requestedPlan.includes('10mil') || requestedPlan.includes('10000')) {
      secretKey = 'HUBLA_10MIL';
    } else if (requestedPlan.includes('anual') || requestedPlan.includes('yearly')) {
      secretKey = 'HUBLA_CHECKOUT_LINK';
    }

    const hublaLink = Deno.env.get(secretKey);

    console.log(`🔗 Buscando Secret: ${secretKey}...`, hublaLink ? "✅ Encontrado" : "❌ NÃO ENCONTRADO")

    if (!hublaLink) {
      throw new Error(`A variável ${secretKey} não está cadastrada nos Secrets do Supabase.`)
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
