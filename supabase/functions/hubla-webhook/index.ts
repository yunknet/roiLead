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
    // Força o nome correto da instância (roiLead) para evitar erro de Case Sensitive (maiúsculas/minúsculas)
    const evoInstance = Deno.env.get("EVOLUTION_INSTANCE") || "roiLead"

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

      const cents = invoice.amount?.totalCents || 0;
      const amount = cents > 0 ? cents / 100 : (Number(eventData.amount) || 0);

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const senderEmail = "Equipe roiLead <contato@roilead.com.br>";

      // Identifica o plano de forma robusta e inteligente (v3.0)
      // Tenta cruzar dados de Nome do Produto/Oferta + Valor Pago para evitar erros de centavos/decimal
      const productInfo = eventData.product?.name || eventData.offer?.name || "";
      let planName = "Mensal";

      // Hubla amount pode vir em centavos (ex: 6700) ou decimal (67.00)
      // Se for > 1000, provavelmente é centavos e precisamos dividir por 100
      const normalizedAmount = amount > 1000 ? amount / 100 : amount;

      if (productInfo.toLowerCase().includes("shark tank")) {
        planName = productInfo;
      } else if (productInfo.toLowerCase().includes("anual")) {
        planName = "Anual";
      } else if (productInfo.toLowerCase().includes("mensal")) {
        planName = "Mensal";
      } else {
        // Fallback pelo valor caso não tenha nome claro no payload
        planName = normalizedAmount > 100 ? "Anual" : "Mensal";
      }

      // --- FLUXO NORMAL DE ASSINATURA ---
      const tokensToAdd = 0; // Nesta função agora é sempre 0 (tokens são na huba-webhook-agente)
      const externalId = invoice.paymentSession?.utm?.content || invoice.id || `sub_${Date.now()}`

      const { data: existingSubStatus } = await supabase
        .from("subscriptions")
        .select("payment_status")
        .eq("external_reference_id", externalId)
        .maybeSingle();

      const alreadyPaid = existingSubStatus?.payment_status === "paid";

      console.log(`💰 Aprovado roiLead: ${maskEmail(email)} | R$ ${normalizedAmount} | Plano: ${planName} | Já processado: ${alreadyPaid}`)

      let isNewUser = false
      const safeFirstName = firstName ? firstName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '') : "cliente";
      const defaultPassword = `${safeFirstName}12345`;

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
              // Resolve falha de concorrência (Outro evento pode ter criado no mesmo milissegundo)
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
        if (planName === "Anual") {
          expiresAt.setFullYear(now.getFullYear() + 1);
        } else {
          expiresAt.setDate(now.getDate() + 30);
        }

        // Upsert na tabela subscriptions
        // Agora usamos external_reference_id como chave única (garantido pela migration de segurança)
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
          // Se falhou por chave duplicada (provavelmente o email já existia num external_id antigo)
          // Em vez de upsert com onConflict por email (que pode dar ruim se a constraint tiver outro nome), 
          // a gente apenas FAZ UM UPDATE explícito para o email.
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

      // ====================================================
      // BLOCO DE ENVIO 1: CONTA & LOGIN (Pagamento Confirmado)
      // ====================================================
      if (alreadyPaid) {
        console.log("⏭️ Pagamento já processado anteriormente. Pulando envios de e-mail/whats de boas vindas.");
      } else if (tokensToAdd === 0 && (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid')) {

        if (isNewUser) {
          // 1. E-mail de Boas-vindas (Novo Usuário)
          if (email && resendApiKey) {
            const emailSubject = "Seu acesso ao roiLead chegou! 🚀";
            const emailHtml = `Olá, ${firstName}!<br><br>Seja bem-vindo ao roiLead.<br><br>Vi que seu pagamento do plano <b>${planName}</b> foi confirmado! ✅<br><br>Para que você não perca tempo e já comece a utilizar as nossas automações, você já pode acessar a plataforma agora mesmo com os dados abaixo:<br><br>👉 Link de Acesso: <a href="https://roilead.com.br/login">https://roilead.com.br/login</a><br><br>E-mail: <b>${email}</b><br><br>Senha provisória: <b>${defaultPassword}</b><br><br>(Recomendamos que você altere sua SENHA e também o NÚMERO de contato após o primeiro login por segurança).<br><br>Equipe roiLead.`;
            await sendEmail(resendApiKey, senderEmail, email, emailSubject, emailHtml);
          }

          // 2. WhatsApp de Login (Novo Usuário)
          if (phone && evoUrl && evoInstance && evoKey) {
            const msgLogin = `Olá, ${firstName}! Tudo bem? 🤖\n\nSou o assistente virtual do *roiLead*.\n\nVi que seu pagamento do plano *${planName}* foi confirmado! ✅\n\nPara facilitar, já criei sua conta temporária! Acesse: https://roilead.com.br/login\n\nUtilize seu E-mail: *${email}*\nSua Senha padrão: *${defaultPassword}*\n\nPor segurança, peço que após entrar, vá no Menu Configurações e altere sua senha. ⚠️`
            await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msgLogin)
          }
        } else {
          // E-mail e WhatsApp para veterano (Acesso reativado ou renovado)
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

      // ====================================================
      // BLOCO DE ENVIO 2: INSTRUÇÕES DE USO (Assinatura Ativa)
      // ====================================================
      if (eventType === 'subscription.activated') {
        // Pequeno delay para garantir que a mensagem de boas-vindas chegue ANTES das instruções
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (phone && evoUrl && evoInstance && evoKey) {
          const msgInstrucoes = `📋 *DICAS DE USO - roiLead*\n\nDiferente de buscas simples, aqui você tem filtros de precisão. Você pode solicitar empresas por:\n📍 Local: Estado, Cidade.\n🏢 Perfil: Capital Social, Data de Abertura.\n⚖️ Tipo: Incluir/Excluir MEI, Simples Nacional.\n📞 Contato: Apenas com Celular/WhatsApp.\n\n💡 *COMO PEDIR (Exemplo):*\n"Busque Transportadoras em Guarulhos, com capital acima de 100 mil, que não sejam MEI."\n\n⚠️ *IMPORTANTE:*\nPor aqui te envio o Resumo Essencial. Todos os dados completos ficam no seu Dashboard: https://roilead.com.br/dashboard\n\nVamos começar? Me diga: qual segmento e cidade você quer atacar hoje? 👇`
          await sendWhatsapp(evoUrl, evoKey, evoInstance, phone, msgInstrucoes)
        }
      }


    }

    // ====================================================
    // GRUPO 2: CANCELAMENTO / REEMBOLSO / EXPIRAÇÃO
    // ====================================================
    else if (
      eventType === 'invoice.refunded' ||
      eventType === 'subscription.canceled' ||
      eventType === 'CanceledSubscription' ||
      eventType === 'subscription.desactivated' ||
      eventType === 'subscription.deactivated'
    ) {

      const { email, firstName, phone, user: userData } = getCustomerData(eventData)

      console.log(`🚫 Gerenciando encerramento de acesso roiLead para: ${maskEmail(email)} (Motivo: ${eventType})`)

      if (email) {
        // Define o status do banco baseado no evento
        const isExpiration = eventType === 'subscription.deactivated' || eventType === 'subscription.desactivated';
        const subStatus = isExpiration ? 'expired' : 'canceled';
        const payStatus = eventType === 'invoice.refunded' ? 'refunded' : (isExpiration ? 'expired' : 'canceled');

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

        // Remove acesso no perfil
        await supabase.from('profiles').update({
          payment_status: 'NONE',
          access_status: 'NEW'
        }).eq('email', email)

        // --- TRAVA DE SEGURANÇA: Estorno de Tokens ---
        // Se o evento for de reembolso, zeramos o saldo de tokens por precaução
        if (eventType === 'invoice.refunded') {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle();

          if (userProfile?.id) {
            console.log(`💸 Reembolso detectado para ${email}. Zerando saldo de tokens.`);
            await supabase
              .from('ai_agents')
              .update({ tokens_balance: 0 })
              .eq('user_id', userProfile.id);
          }
        }
      }

      if (phone && evoUrl && evoInstance && evoKey) {
        let textMessage = "";

        if (eventType === 'subscription.deactivated' || eventType === 'subscription.desactivated') {
          // MENSAGEM DE EXPIRAÇÃO (Tempo acabou)
          textMessage = `Olá, ${firstName}! 👋\n\nNotei aqui que sua assinatura do *roiLead* chegou ao fim hoje.\n\nEspero que tenha gerado bons negócios nesse período! 🚀\n\nCaso queira continuar encontrando leads qualificados, basta realizar a renovação acessando seu painel: https://roilead.com.br/dashboard\n\nQualquer dúvida, estamos por aqui! 👇`
        } else {
          // MENSAGEM DE CANCELAMENTO OU REEMBOLSO
          textMessage = `Olá, ${firstName}. 👋\n\nNotei aqui que sua assinatura do *roiLead* foi cancelada/reembolsada e seu acesso foi pausado.\n\nPara voltar a aproveitar todos os benefícios, você pode assinar novamente acessando o painel.`
        }

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

    // Remove espaços do instance name e garante o nome correto (roiLead) como segurança final
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