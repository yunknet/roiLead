import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    // 🔒 SECURANÇA: CRÍTICO
    // Verifica se a requisição tem o segredo configurado (no header ou na query string)
    // Se você não configurou isso na Hubla, configure agora!
    const secret = Deno.env.get("HUBLA_WEBHOOK_SECRET")
    if (secret) {
      const tokenHeader = req.headers.get("x-hubla-token")
      const url = new URL(req.url)
      const tokenQuery = url.searchParams.get("token")

      if (tokenHeader !== secret && tokenQuery !== secret) {
        console.error("⛔ Acesso Negado: Token de webhook inválido.")
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      }
    } else {
      console.warn("⚠️ ALERTA DE SEGURANÇA: HUBLA_WEBHOOK_SECRET não configurado. Qualquer pessoa pode simular pagamentos!")
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const evoUrl = Deno.env.get("EVOLUTION_API_URL")
    const evoKey = Deno.env.get("EVOLUTION_GLOBAL_KEY") || Deno.env.get("EVOLUTION_API_KEY")
    const evoInstance = Deno.env.get("EVOLUTION_INSTANCE")

    // 1. Pega o Payload
    const payload = await req.json()
    const eventType = payload.type
    const eventData = payload.event

    console.log(`⚡ Evento Recebido: ${eventType}`)

    // --- FUNÇÃO DE BUSCA DE DADOS (ROBUSTA & SEGURA) ---
    const getCustomerData = (data: any) => {
      const invoice = data.invoice || {}
      // Tenta achar o objeto de usuário em vários lugares possíveis do payload
      const user = data.user || data.customer || data.payer || invoice.payer || data.subscriber || {}

      // E-mail: varre todas as possibilidades
      const email = user.email || data.email || invoice.email || data.userEmail

      // Telefone: varre todas as possibilidades e limpa
      let phone = user.phone || data.phone || invoice.phone || data.userPhone || ""
      if (phone) phone = phone.replace(/\D/g, "")

      // Nome: varre e formata
      const firstName = user.firstName || data.first_name || user.name || data.userName || ""
      const lastName = user.lastName || ""
      const fullName = `${firstName} ${lastName}`.trim() || firstName || "Cliente"

      return { email, firstName, fullName, phone, invoice, user }
    }

    // --- FUNÇÃO PARA MASCARAR DADOS SENSÍVEIS (LOGS) ---
    const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A"
    const maskPhone = (phone: string) => phone ? phone.slice(-4).padStart(phone.length, '*') : "N/A"

    // ====================================================
    // GRUPO 1: VENDA APROVADA / ASSINATURA ATIVA
    // ====================================================
    if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid' || eventType === 'subscription.activated') {

      const { email, firstName, fullName, phone, invoice } = getCustomerData(eventData)

      const cents = invoice.amount?.totalCents || 0
      // Se cents > 0 divide por 100, senão tenta pegar de data.amount (number normal)
      const amount = cents > 0 ? cents / 100 : (Number(eventData.amount) || 0)

      const planName = "Anual";

      // Tenta pegar UTM Content (referenceID) ou usa o ID da invoice
      const externalId = invoice.paymentSession?.utm?.content || invoice.id || `sub_${Date.now()}`

      console.log(`💰 Aprovado roiLead: ${maskEmail(email)} | R$ ${amount}`)

      let isNewUser = false

      if (email) {
        // Busca usuário para vincular (opcional, mas bom ter)
        let userId: string | null = null
        const defaultPassword = "12345" // User requested simple password

        // Busca de forma elástica, ignorando letras maiúsculas/minúsculas
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()

        if (userProfile && userProfile.id) {
          userId = userProfile.id
        } else {
          // Fallback final: tenta achar no Auth Admin se não tiver perfil
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const existing = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

          if (existing) {
            userId = existing.id
          } else {
            console.log(`✨ Criando usuário automático de Checkout (Senha: 12345) para ${email}`)
            isNewUser = true

            const { data: newUserReq, error: authErr } = await supabase.auth.admin.createUser({
              email: email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: { first_name: firstName, phone: phone }
            })

            if (authErr) {
              console.error("❌ Erro ao criar auth.user:", authErr)
            } else if (newUserReq.user) {
              userId = newUserReq.user.id
            }
          }
        }

        // Upsert na tabela subscriptions
        // Agora usamos external_reference_id como chave única (garantido pela migration de segurança)
        const { error: dbError } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          email: email,
          full_name: fullName,
          phone_number: phone,
          plan_name: planName,
          amount_paid: amount,
          payment_status: "paid",
          subscription_status: "active",
          external_reference_id: externalId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'external_reference_id' })

        if (dbError) {
          console.error("❌ Erro no upsert (Subscriptions):", dbError.message)
          // Se falhou por chave duplicada (provavelmente o email já existia num external_id antigo)
          // Em vez de upsert com onConflict por email (que pode dar ruim se a constraint tiver outro nome), 
          // a gente apenas FAZ UM UPDATE explícito para o email.
          console.log("⚠️ Tentando fallback seguro por email...")
          const subData = {
            user_id: userId,
            email: email,
            full_name: fullName,
            phone_number: phone,
            plan_name: planName,
            amount_paid: amount,
            payment_status: "paid",
            subscription_status: "active",
            external_reference_id: externalId,
            updated_at: new Date().toISOString()
          }

          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("email", email)
            .maybeSingle()

          if (existingSub) {
            const { error: updateErr } = await supabase.from("subscriptions").update(subData).eq("id", existingSub.id)
            if (updateErr) console.error("❌ Erro final no update por email:", updateErr.message)
            else console.log("✅ Banco atualizado por e-mail (UPDATE): Assinatura ATIVA")
          } else {
            const { error: insertErr } = await supabase.from("subscriptions").insert([subData])
            if (insertErr) console.error("❌ Erro final no insert de fallback:", insertErr.message)
            else console.log("✅ Banco atualizado (INSERT fallback): Assinatura ATIVA")
          }
        } else {
          console.log("✅ Banco atualizado: Assinatura ATIVA")
        }

        // Atualiza status no Profile tbm para garantir o acesso imediato
        if (userId) {
          const { error: profileErr } = await supabase.from('profiles').update({
            payment_status: 'PAID'
          }).eq('id', userId)

          if (profileErr) {
            // Caso não exista, ele faz um upsert de segurança
            await supabase.from('profiles').upsert({
              id: userId,
              email: email,
              full_name: fullName,
              phone_number: phone,
              payment_status: 'PAID',
              access_status: 'NEW'
            }, { onConflict: 'id' })
          }
        }
      }

      // Envia WhatsApp do roiLead (v2.1)
      if (eventType === 'invoice.payment_succeeded' && phone && evoUrl && evoInstance) {
        if (isNewUser) {
          // Mensagem de Boas Vindas + Acesso
          const msg1 = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nPara facilitar, já criei sua conta temporária! Acesse: https://roilead.com.br/login.\n\nCom seu E-mail:${email} e a Senha padrão: 12345\n\nPor segurança, peço que vá no Menu Configurações e altere sua senha.⚠️`

          // Mensagem de Instruções de Uso
          const msg2 = `O QUE VOCÊ PODE PEDIR?\nDiferente de buscas simples, aqui você tem filtros de precisão. Você pode solicitar empresas por:\n📍 Local: Estado, Cidade.\n🏢 Perfil: Capital Social, Data de Abertura.\n⚖️ Tipo: Incluir/Excluir MEI, Simples Nacional.\n📞 Contato: Apenas com Celular/WhatsApp ou excluir e-mails de contadores.\n\n💡 COMO PEDIR (Exemplo):\n"Busque Transportadoras em Guarulhos, com capital acima de 100 mil, que não sejam MEI."\n\n⚠️ IMPORTANTE:\nComo a ficha técnica é extensa, por aqui te envio o Resumo Essencial para agilizar a leitura.\n👉 Todos os dados completos ficam salvos no seu Dashboard, onde você pode inclusive exportar para planilha (https://roilead.com.br/dashboard).\n\nVamos começar? Me diga: qual segmento e cidade você quer atacar hoje?\n(Obs: Busco até 50 empresas por vez para não travar seu celular com mensagens grandes). 👇`

          await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msg1)

          // Pausa de 1,5 segundos para evitar que as mensagens cheguem fora de ordem no celular
          await new Promise(resolve => setTimeout(resolve, 1500))

          await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msg2)

        } else {
          // Usuários que já tinham conta (Veteranos) recebem a mensagem padrão antiga de uma vez
          const textMessage = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nJá liberei seu acesso e estou pronto para te ajudar a configurar tudo.\n\n📋 O QUE VOCÊ PODE PEDIR?\nDiferente de buscas simples, aqui você tem filtros de precisão. Você pode solicitar empresas por:\n📍 Local: Estado, Cidade.\n🏢 Perfil: Capital Social, Data de Abertura.\n⚖️ Tipo: Incluir/Excluir MEI, Simples Nacional.\n📞 Contato: Apenas com Celular/WhatsApp ou excluir e-mails de contadores.\n\n💡 COMO PEDIR (Exemplo):\n"Busque Transportadoras em Guarulhos, com capital acima de 100 mil, que não sejam MEI."\n\n⚠️ IMPORTANTE:\nComo a ficha técnica é extensa, por aqui te envio o Resumo Essencial para agilizar a leitura.\n👉 Todos os dados completos ficam salvos no seu Dashboard, onde você pode inclusive exportar para planilha (https://roilead.com.br/dashboard).\n\nVamos começar? Me diga: qual segmento e cidade você quer atacar hoje?\n(Obs: Busco até 50 empresas por vez para não travar seu celular com mensagens grandes). 👇`
          await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
        }
      }
    }

    // ====================================================
    // GRUPO 2: CANCELAMENTO / REEMBOLSO
    // ====================================================
    else if (
      eventType === 'invoice.refunded' ||
      eventType === 'subscription.canceled' ||
      eventType === 'CanceledSubscription' ||
      eventType === 'subscription.desactivated'
    ) {

      const { email, firstName, phone } = getCustomerData(eventData)

      console.log(`🚫 Cancelando acesso roiLead de: ${maskEmail(email)}`)

      if (email) {
        const payStatus = eventType === 'invoice.refunded' ? 'refunded' : 'canceled'

        const { error } = await supabase
          .from("subscriptions")
          .update({
            subscription_status: "canceled",
            payment_status: payStatus,
            updated_at: new Date().toISOString()
          })
          .eq("email", email)

        if (error) console.error("❌ Erro ao atualizar banco (Cancelamento):", error)
        else console.log("✅ Banco atualizado: Status CANCELADO")

        // Opcional: remover acesso no perfil
        await supabase.from('profiles').update({
          payment_status: 'NONE',
          access_status: 'NEW'
        }).eq('email', email)
      }

      if (phone && evoUrl && evoInstance) {
        const textMessage = `Olá, ${firstName}. 👋\n\nNotei aqui que sua assinatura do *roiLead* foi cancelada/reembolsada e seu acesso foi pausado.\n\nPara voltar a aproveitar todos os benefícios, você pode assinar novamente acessando o painel.`
        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    // Resposta padrão 200 para a Hubla não ficar retentando em loop se for um evento desconhecido
    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error("❌ Erro Crítico:", err.message)
    // Retornamos 400 apenas em erro crítico de execução, mas idealmente 200 pra não travar a fila da Hubla
    return new Response(JSON.stringify({ error: err.message }), { status: 200 })
  }
})

// Função de Envio WhatsApp (Evolution API)
async function sendWhatsapp(url: string, key: string, instance: string, phone: string, text: string) {
  try {
    let cleanPhone = phone
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone

    // Remove espaços do instance name
    const safeInstanceName = instance.trim()

    const response = await fetch(`${url}/message/sendText/${safeInstanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": key },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
        linkPreview: false
      })
    })

    if (!response.ok) {
      console.error(`❌ Erro Evolution:`, await response.text())
    } else {
      console.log("✅ WhatsApp enviado com sucesso.")
    }
  } catch (e) { console.error("❌ Falha na conexão Evolution:", e) }
}