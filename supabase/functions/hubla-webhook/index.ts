import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Segurança (Opcional mas recomendado): Validar token da Hubla se configurado
    // const secret = req.headers.get('x-hubla-token') 
    
    const body = await req.json()
    console.log("Webhook recebido:", JSON.stringify(body))

    const event = body.event // Ex: 'invoice.paid' ou 'subscription.activated'
    const data = body.data

    // 2. Verifica se é um evento de pagamento aprovado
    // Na V2 Hubla, geralmente olhamos para 'invoice.paid' ou 'sale.approved'
    if (event === 'invoice.paid' || event === 'subscription.activated') {
      
      // 3. Recupera o ID que enviamos no passo anterior (utm_content)
      // A Hubla geralmente devolve isso dentro de 'utm' ou 'metadata'
      const referenceId = data.utm?.content 

      if (!referenceId) {
        console.error("ID de referência não encontrado no webhook")
        return new Response("ID não encontrado", { status: 200 }) // Retorna 200 para a Hubla parar de tentar
      }

      // 4. Extrai dados do cliente do payload da Hubla
      const customerEmail = data.customer?.email || data.payer?.email
      const customerName = data.customer?.name || data.payer?.name
      const customerPhone = data.customer?.phone || data.payer?.phone || data.customer?.phone_number
      const transactionId = data.id 

      // 5. Atualiza a tabela subscriptions
      const { error } = await supabase
        .from("subscriptions")
        .update({
          payment_status: "paid",
          subscription_status: "active", // Ativa o plano
          email: customerEmail,          // Salva o email digitado no checkout
          phone_number: customerPhone,   // Salva o telefone digitado no checkout
          full_name: customerName,
          gateway_order_id: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq("external_reference_id", referenceId) // Busca pelo ID que geramos no create-checkout

      if (error) {
        console.error("Erro ao atualizar banco:", error)
        throw error
      }
      
      console.log(`Assinatura ${referenceId} ativada para ${customerEmail}`)
    }

    // Tratamento para cancelamento ou reembolso (Opcional)
    if (event === 'invoice.refunded' || event === 'subscription.canceled') {
       const referenceId = data.utm?.content
       if (referenceId) {
         await supabase.from("subscriptions").update({
           subscription_status: "inactive",
           payment_status: "refunded"
         }).eq("external_reference_id", referenceId)
       }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})