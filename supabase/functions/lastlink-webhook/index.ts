import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    // 🔒 SEGURANÇA: CRÍTICO
    // Aceita múltiplos tokens válidos (tanto o padrão do roiLead quanto o novo gerado pelo Playbook na LastLink)
    const configuredSecret = Deno.env.get("LASTLINK_WEBHOOK_SECRET")
    const validTokens = [
      configuredSecret,
      "3e760a7746354c4eae112b2a65257a04",
      "9ccc07a475ce45ca9b36c1f22066642a"
    ].filter(Boolean) as string[]

    if (validTokens.length > 0) {
      const authHeader = req.headers.get("authorization") || ""
      const tokenHeader = req.headers.get("x-lastlink-token") || req.headers.get("x-webhook-token") || ""
      const url = new URL(req.url)
      const tokenQuery = url.searchParams.get("token") || ""

      const cleanAuth = authHeader.replace(/^Bearer\s+/i, "").trim()

      const isAuthorized = validTokens.some(t => 
        (cleanAuth && t === cleanAuth) || 
        (tokenHeader && t === tokenHeader.trim()) || 
        (tokenQuery && t === tokenQuery.trim())
      )

      if (!isAuthorized) {
        console.error("⛔ Acesso Negado: Token de webhook inválido.")
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      }
    } else {
      console.warn("⚠️ ALERTA DE SEGURANÇA: Nenhum token de webhook configurado.")
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const evoUrl = Deno.env.get("EVOLUTION_API_URL")
    const evoKey = Deno.env.get("EVOLUTION_GLOBAL_KEY") || Deno.env.get("EVOLUTION_API_KEY")
    // Força o nome correto da instância (roiLead) para evitar erro de Case Sensitive
    const evoInstance = Deno.env.get("EVOLUTION_INSTANCE") || "roiLead"

    // 1. Pega o Payload
    const payload = await req.json().catch(() => ({}))
    const eventType = String(
      payload.type || 
      payload.event_type || 
      payload.event || 
      payload.event_name || 
      payload.status || 
      payload.action || 
      payload.data?.status || 
      payload.data?.event || 
      payload.data?.event_type || 
      "UNKNOWN"
    ).toLowerCase()
    const eventData = payload.data || payload.event_data || payload.event || payload || {}

    console.log(`⚡ Evento Recebido: ${eventType}`)

    // --- FUNÇÃO DE BUSCA DE DADOS (ROBUSTA & SEGURA) ---
    const getCustomerData = (data: any) => {
      const invoice = data.invoice || data.order || {}
      // Tenta achar o objeto de usuário em vários lugares possíveis do payload
      const user = data.user || data.customer || data.payer || invoice.payer || invoice.customer || data.subscriber || payload.customer || payload.user || {}

      // E-mail: varre todas as possibilidades
      const email = (user.email || data.email || invoice.email || data.userEmail || payload.email || "").toLowerCase().trim()

      // Telefone: varre todas as possibilidades e limpa
      let phone = user.phone || user.phone_number || user.cellphone || data.phone || invoice.phone || data.userPhone || ""
      if (phone) phone = String(phone).replace(/\D/g, "")

      // Nome: varre e formata
      const rawName = user.name || user.fullName || user.firstName || data.first_name || data.userName || data.name || ""
      const firstName = user.firstName || (rawName ? String(rawName).trim().split(' ')[0] : "") || "Cliente"
      const lastName = user.lastName || (rawName ? String(rawName).trim().split(' ').slice(1).join(' ') : "") || ""
      const fullName = String(user.fullName || rawName || `${firstName} ${lastName}`).trim() || firstName || "Cliente"

      return { email, firstName, fullName, phone, invoice, user }
    }

    // --- FUNÇÃO PARA MASCARAR DADOS SENSÍVEIS (LOGS) ---
    const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A"
    const maskPhone = (phone: string) => phone ? phone.slice(-4).padStart(phone.length, '*') : "N/A"

    // ====================================================
    // GRUPO 1: VENDA APROVADA / ASSINATURA ATIVA
    // ====================================================
    const isPaid = [
      'invoice.payment_succeeded',
      'invoice.paid',
      'subscription.activated',
      'compra_aprovada',
      'compra_completa',
      'compra completa',
      'completa',
      'completed',
      'order_completed',
      'paymentconfirmed',
      'payment_confirmed',
      'payment confirmed',
      'pedido_aprovado',
      'pedido aprovado',
      'pagamento_aprovado',
      'pagamento aprovado',
      'pagamento_efetuado',
      'pagamento efetuado',
      'pagamento_de_renovacao_efetuado',
      'pagamento de renovacao efetuado',
      'renovacao',
      'renewal',
      'subscription_payment_success',
      'order_approved',
      'charge_paid',
      'payment_approved',
      'approved',
      'paid'
    ].some(term => eventType.includes(term));
    
    if (isPaid) {

      const { email, firstName, fullName, phone, invoice } = getCustomerData(eventData)

      // Extração robusta do valor pago (em reais)
      let rawAmount = 0;
      if (invoice.amount?.totalCents) {
        rawAmount = invoice.amount.totalCents / 100;
      } else {
        const potentialAmounts = [
          eventData.amount,
          eventData.total,
          eventData.order?.total,
          eventData.order?.amount,
          eventData.order?.paid_amount,
          eventData.price,
          eventData.transaction?.amount,
          payload.amount,
          payload.total
        ];
        for (const amt of potentialAmounts) {
          if (amt !== undefined && amt !== null && !isNaN(Number(amt)) && Number(amt) > 0) {
            rawAmount = Number(amt);
            break;
          }
        }
      }

      // Se for centavos (ex: 49700 ou 9700), normaliza dividindo por 100
      const normalizedAmount = rawAmount > 1000 ? rawAmount / 100 : rawAmount;

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const senderEmail = "Equipe roiLead <contato@roilead.com.br>";

      // Junta todos os nomes possíveis de produto, oferta ou plano
      const allProductTexts = [
        eventData.product?.name,
        eventData.offer?.name,
        eventData.plan?.name,
        eventData.order?.plan_name,
        eventData.order?.offer_name,
        eventData.order?.product_name,
        eventData.products?.[0]?.name,
        eventData.items?.[0]?.name,
        payload.product_name,
        payload.offer_name,
        payload.plan_name,
        eventData.product?.code,
        eventData.product_codigo,
        payload.product_code
      ].filter(Boolean).join(" ").toLowerCase();

      // Detecta se é a compra do Playbook (Bônus de 7 dias)
      const isPlaybook = allProductTexts.includes("playbook") || allProductTexts.includes("playbook-yuri");

      // Identifica o plano cruzando Nomes e Valores
      let planName = "Mensal";
      if (isPlaybook) {
        planName = "Trial Playbook (7 dias)";
      } else if (allProductTexts.includes("anual") || allProductTexts.includes("yearly") || normalizedAmount >= 200) {
        planName = "Anual";
      } else if (allProductTexts.includes("mensal") || allProductTexts.includes("monthly") || (normalizedAmount > 0 && normalizedAmount < 200)) {
        planName = "Mensal";
      } else {
        planName = normalizedAmount > 100 ? "Anual" : "Mensal";
      }

      const externalId = eventData.order?.id || eventData.order?.code || invoice.paymentSession?.utm?.content || invoice.id || eventData.id || eventData.transaction_id || `sub_${Date.now()}`;

      const { data: existingSubStatus } = await supabase
        .from("subscriptions")
        .select("payment_status")
        .eq("external_reference_id", externalId)
        .maybeSingle();

      const alreadyPaid = existingSubStatus?.payment_status === "paid";

      console.log(`💰 Aprovado: ${maskEmail(email)} | R$ ${normalizedAmount} | Plano: ${planName} | Playbook: ${isPlaybook} | Já processado: ${alreadyPaid}`)

      let isNewUser = false
      const safeFirstName = firstName ? firstName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '') : "cliente";
      // Se for Playbook, a senha é fixa e amigável: playbook123 (conforme informado no e-mail de entrega)
      const defaultPassword = isPlaybook ? "playbook123" : `${safeFirstName}12345`;

      if (email) {
        // Busca usuário para vincular (opcional, mas bom ter)
        let userId: string | null = null

        // Busca de forma elástica, ignorando letras maiúsculas/minúsculas
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()

        if (userProfile && userProfile.id) {
          userId = userProfile.id
        } else {
          // Fallback: tenta achar no Auth Admin se não tiver perfil
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const existing = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

          if (existing) {
            userId = existing.id
          } else {
            console.log(`✨ Criando usuário automático de Checkout (Senha: ${defaultPassword}) para ${email}`)
            isNewUser = true

            const { data: newUserReq, error: authErr } = await supabase.auth.admin.createUser({
              email: email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: { first_name: firstName, phone: phone }
            })

            if (authErr) {
              console.error("❌ Erro ao criar auth.user:", authErr)
              // Resolve falha de concorrência
              const { data: authRetry } = await supabase.auth.admin.listUsers()
              const existingRetry = authRetry?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
              if (existingRetry) {
                userId = existingRetry.id
                console.log(`✅ Usuário recuperado após corrida concorrente: ${userId}`)
              }
            } else if (newUserReq.user) {
              userId = newUserReq.user.id
            }
          }
        }

        // Calcula a data de expiração baseada no plano
        const now = new Date();
        const expiresAt = new Date(now);
        if (isPlaybook) {
          expiresAt.setDate(now.getDate() + 7); // Exatos 7 dias de trial a partir da compra
        } else if (planName === "Anual") {
          expiresAt.setFullYear(now.getFullYear() + 1);
        } else {
          expiresAt.setDate(now.getDate() + 30);
        }

        // Upsert na tabela subscriptions com chave única external_reference_id
        const upsertData: any = {
          email: email,
          full_name: fullName,
          phone_number: phone,
          plan_name: planName,
          amount_paid: normalizedAmount,
          payment_status: "paid",
          subscription_status: "active",
          external_reference_id: externalId,
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString()
        }
        if (userId) upsertData.user_id = userId

        const { error: dbError } = await supabase.from("subscriptions").upsert(upsertData, { onConflict: 'external_reference_id' })

        if (dbError) {
          console.error("❌ Erro no upsert (Subscriptions):", dbError.message)
          console.log("⚠️ Tentando fallback seguro por email...")
          const subData: any = {
            email: email,
            full_name: fullName,
            phone_number: phone,
            plan_name: planName,
            amount_paid: normalizedAmount,
            payment_status: "paid",
            subscription_status: "active",
            external_reference_id: externalId,
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString()
          }
          if (userId) subData.user_id = userId

          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .ilike("email", email)
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

        // Atualiza status no Profile para garantir acesso imediato
        if (userId) {
          const { error: profileErr } = await supabase.from('profiles').update({
            payment_status: 'PAID'
          }).eq('id', userId)

          if (profileErr) {
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

      // ====================================================
      // BLOCO DE ENVIO 1: CONTA & LOGIN (Pagamento Confirmado)
      // ====================================================
      if (alreadyPaid) {
        console.log("⏭️ Pagamento já processado anteriormente. Pulando envios de boas-vindas.");
      } else if (isPlaybook) {
        console.log(`🎁 [PLAYBOOK TRIAL] Usuário ${maskEmail(email)} ativado com 7 dias de trial. Apenas e-mail (sem WhatsApp).`);
        if (isNewUser && email && resendApiKey) {
          const emailSubject = "Seu bônus de 7 dias no roiLead chegou! 🚀";
          const emailHtml = `Olá, ${firstName}!<br><br>Parabéns pela sua compra do <b>Playbook</b>! 🎉<br><br>Seu bônus de <b>7 dias grátis</b> de acesso completo ao <b>roiLead</b> (Gerador de Leads B2B) já foi liberado com sucesso.<br><br>Para começar a minerar seus leads agora mesmo, utilize os dados abaixo:<br><br>👉 Link de Acesso: <a href="https://roilead.com.br/login">https://roilead.com.br/login</a><br><br>E-mail: <b>${email}</b><br><br>Senha provisória: <b>${defaultPassword}</b><br><br>(Recomendamos alterar sua senha no menu Configurações após o primeiro acesso por segurança).<br><br>Bons estudos e excelentes prospecções!<br>Equipe roiLead.`;
          await sendEmail(resendApiKey, senderEmail, email, emailSubject, emailHtml);
        }
      } else {
        if (isNewUser) {
          // 1. E-mail de Boas-vindas (Novo Usuário) com senha provisória
          if (email && resendApiKey) {
            const emailSubject = "Seu acesso ao roiLead chegou! 🚀";
            const emailHtml = `Olá, ${firstName}!<br><br>Seja bem-vindo ao roiLead.<br><br>Vi que seu pagamento do plano <b>${planName}</b> foi confirmado! ✅<br><br>Para que você não perca tempo e já comece a minerar seus leads, você já pode acessar a plataforma agora mesmo com os dados abaixo:<br><br>👉 Link de Acesso: <a href="https://roilead.com.br/login">https://roilead.com.br/login</a><br><br>E-mail: <b>${email}</b><br><br>Senha provisória: <b>${defaultPassword}</b><br><br>(Recomendamos que você altere sua SENHA no menu Configurações após o primeiro login por segurança).<br><br>Equipe roiLead.`;
            await sendEmail(resendApiKey, senderEmail, email, emailSubject, emailHtml);
          }

          // 2. WhatsApp de Login (Novo Usuário) com senha provisória
          if (phone && evoUrl && evoInstance && evoKey) {
            const msgLogin = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nPara facilitar, já criei sua conta temporária! Acesse: https://roilead.com.br/login\n\nUtilize seu E-mail: *${email}*\nSua Senha padrão: *${defaultPassword}*\n\nPor segurança, peço que após entrar, vá no Menu Configurações e altere sua senha. ⚠️`
            await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msgLogin)
          }

          // 3. Dicas de uso no WhatsApp (4 segundos depois)
          await new Promise(resolve => setTimeout(resolve, 4000));
          if (phone && evoUrl && evoInstance && evoKey) {
            const msgInstrucoes = `📋 *DICAS DE USO - roiLead*\n\nCom a plataforma você pode minerar empresas com precisão:\n📍 Local: Estado, Cidade, DDD\n🏢 Perfil: Capital Social, Data de Abertura\n⚖️ Tipo: Incluir/Excluir MEI, Simples Nacional\n📞 Contato: Apenas com Celular/WhatsApp e E-mail\n\n💡 *Acesse seu painel agora:* https://roilead.com.br/dashboard\n\nBoas prospecções e muito sucesso! 🚀`
            await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msgInstrucoes)
          }
        } else {
          // E-mail e WhatsApp para veterano (Acesso liberado ou renovado)
          if (email && resendApiKey) {
            const emailSubject = "Pagamento Confirmado - roiLead! ✅";
            const emailHtml = `Olá, ${firstName}!<br><br>Seja bem-vindo de volta ao roiLead! 🚀<br><br>Seu pagamento do plano <b>${planName}</b> foi confirmado com sucesso e seu acesso já está liberado.<br><br>Você já pode acessar a plataforma com seu e-mail e senha habituais.<br><br>👉 <a href="https://roilead.com.br/login">Clique aqui para entrar</a>`;
            await sendEmail(resendApiKey, senderEmail, email, emailSubject, emailHtml);
          }
          if (phone && evoUrl && evoInstance && evoKey) {
            const msgVeterano = `Olá, ${firstName}! Seja bem-vindo de volta ao *roiLead*! 🚀\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nJá liberei seu acesso e estou pronto para te ajudar a encontrar os melhores leads. Você já pode acessar com seu e-mail e senha em: https://roilead.com.br/login`
            await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msgVeterano)
          }
        }
      }
    }

    // ====================================================
    // GRUPO 2: CANCELAMENTO / REEMBOLSO / EXPIRAÇÃO
    // ====================================================
    else if ([
      'invoice.refunded',
      'subscription.canceled',
      'canceledsubscription',
      'subscription.desactivated',
      'subscription.deactivated',
      'reembolso_solicitado',
      'reembolso solicitado',
      'pagamento_reembolsado',
      'pagamento reembolsado',
      'payment_refund',
      'paymentrefund',
      'subscription_canceled',
      'compra_cancelada',
      'compra cancelada',
      'pedido_cancelado',
      'pedido cancelado',
      'pedido_de_compra_cancelado',
      'pedido de compra cancelado',
      'pedido_de_compra_expirada',
      'pedido de compra expirada',
      'refund',
      'charge_refunded',
      'order_refunded',
      'chargeback',
      'payment_chargeback',
      'paymentchargeback',
      'dispute',
      'estorno',
      'estornado',
      'pagamento_estornado',
      'pagamento estornado',
      'assinatura_cancelada',
      'assinatura cancelada',
      'assinatura_expirada',
      'assinatura expirada',
      'fim_liberacao_de_acesso',
      'fim liberacao de acesso',
      'fim liberação de acesso'
    ].some(term => eventType.includes(term))) {

      const { email, firstName, phone } = getCustomerData(eventData)

      console.log(`🚫 Gerenciando encerramento de acesso roiLead para: ${maskEmail(email)} (Motivo: ${eventType})`)

      if (email) {
        const isExpiration = eventType.includes('deactivated') || eventType.includes('desactivated') || eventType.includes('expirada');
        const subStatus = isExpiration ? 'expired' : 'canceled';
        const payStatus = eventType.includes('refund') || eventType.includes('reembolso') ? 'refunded' : (isExpiration ? 'expired' : 'canceled');

        const { error } = await supabase
          .from("subscriptions")
          .update({
            subscription_status: subStatus,
            payment_status: payStatus,
            updated_at: new Date().toISOString()
          })
          .eq("email", email)

        if (error) console.error("❌ Erro ao atualizar banco (Encerramento):", error)
        else console.log(`✅ Banco atualizado: Status ${subStatus.toUpperCase()}`)

        await supabase.from('profiles').update({
          payment_status: 'NONE',
          access_status: 'NEW'
        }).eq('email', email)
      }

      const allProductTextsCancel = [
        eventData.product?.name,
        eventData.offer?.name,
        eventData.plan?.name,
        eventData.order?.plan_name,
        eventData.order?.offer_name,
        eventData.order?.product_name,
        eventData.products?.[0]?.name,
        payload.product_name,
        payload.offer_name,
        eventData.product?.code,
        eventData.product_codigo
      ].filter(Boolean).join(" ").toLowerCase();
      const isPlaybookCancel = allProductTextsCancel.includes("playbook");

      if (!isPlaybookCancel && phone && evoUrl && evoInstance && evoKey) {
        let textMessage = "";

        if (eventType.includes('deactivated') || eventType.includes('expirad')) {
          textMessage = `Olá, ${firstName}! 👋\n\nNotei aqui que sua assinatura do *roiLead* chegou ao fim.\n\nEspero que tenha gerado excelentes negócios nesse período! 🚀\n\nPara renovar seu acesso, basta entrar no seu painel: https://roilead.com.br/dashboard\n\nQualquer dúvida, estamos por aqui! 👇`
        } else {
          textMessage = `Olá, ${firstName}. 👋\n\nSua assinatura do *roiLead* foi cancelada/reembolsada e seu acesso foi pausado.\n\nPara voltar a aproveitar todos os recursos, você pode assinar novamente acessando: https://roilead.com.br`
        }

        await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, textMessage)
      }
    }

    // Retorna sempre 200 para a LastLink saber que o webhook foi recebido
    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    })

  } catch (err: any) {
    console.error("❌ Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    })
  }
})

// Função de Envio WhatsApp (Evolution API)
async function sendWhatsapp(url: string, key: string, instance: string, phone: string, text: string) {
  try {
    let cleanPhone = phone
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone

    const safeInstanceName = (instance || "roiLead").trim()

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

// Função de Envio de E-mail (Resend)
async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      console.error(`❌ Erro Resend:`, await response.text());
    } else {
      console.log(`✅ E-mail enviado com sucesso para ${to}`);
    }
  } catch (e) {
    console.error("❌ Falha na conexão com Resend:", e);
  }
}
