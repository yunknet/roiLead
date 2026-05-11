import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    // --- TRAVA DE SEGURANÇA (TOKEN) ---
    // Você precisará colar a URL no Zapier assim: /cupula-webhook?token=SEU_TOKEN_SECRET_AQUI
    const url = new URL(req.url)
    const incomeToken = url.searchParams.get("token")
    
    // Você definirá essa variável de ambiente rodando no terminal: 
    // npx supabase secrets set WEBHOOK_META_SECRET=minhasenha123
    const expectedToken = Deno.env.get("WEBHOOK_META_SECRET")
    
    // Se a pessoa não mandar o token exato ou se você não tiver guardado no ambiente, bloqueia!
    if (!expectedToken || incomeToken !== expectedToken) {
        console.warn("⛔ Acesso não autorizado: Token de Webhook Inválido ou Ausente.")
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: "Configuração do Supabase ausente." }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Pega os dados enviados pelo Zapier / LeadsBridge
    const contentType = req.headers.get("content-type") || "";
    let payload: any = {};
    
    try {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          payload[key] = value;
        }
      } else {
        payload = await req.json();
      }
    } catch(e) {
      // Fallback em caso de falha no JSON (tenta ler como texto form-urlencoded)
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
    }
    console.log("⚡ Novo Lead recebido da Meta/Zapier:", payload)

    // Extração super flexível (Aceita nomes do Zapier, LeadsBridge e Campos Fixos)
    const name = payload["Full name"] || payload.full_name || payload.name || payload["First name"] || "Lead Sem Nome"
    const phone = payload["First name"] || payload.phone_number || payload.phone || payload.whatsapp || ""
    const email = payload.Email || payload.email || ""
    const nicheFromFB = payload["Last name"] || payload.niche || "Consórcio" 

    // Limpa o telefone para deixar apenas os números
    let cleanPhone = phone.toString().replace(/\D/g, "")

    // Se a pessoa estiver usando a ferramenta de teste do Meta, o telefone vem como "<test lead: dummy data...>"
    // que, por não ter número nenhum, acaba vazio. Vamos adicionar um número de teste caso seja o dummy do Facebook!
    if (phone.toString().includes("<test lead:") || payload.is_test) {
        cleanPhone = "5511999999999";
        console.log("ℹ️ Detectado lead de teste da Meta. Inserindo telefone fictício.");
    }

    if (!cleanPhone) {
        console.error("⛔ Lead recebido sem telefone válido.")
        return new Response(JSON.stringify({ error: "Telefone não informado." }), { status: 400 })
    }

    // --- CAPTURA INTELIGENTE DE CAMPOS PERSONALIZADOS ---
    // Filtramos os campos conhecidos para pegar apenas as perguntas extras do formulário
    const standardKeys = [
      "Full name", "full_name", "name", "First name", "first_name", "first name",
      "Last name", "last_name", "last name", "Email", "email", "phone_number", 
      "phone", "whatsapp", "niche", "is_test", "token", "ad_id", "form_id", "id"
    ];

    const extraSpecs: string[] = [];
    if (email) extraSpecs.push(`📧 ${email}`);

    for (const [key, value] of Object.entries(payload)) {
      // Se não for uma chave padrão e tiver valor
      if (!standardKeys.includes(key) && value && typeof value === 'string' && value.length < 500) {
        // Formata a chave para ficar mais legível
        let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Limpa prefixos comuns para deixar o CRM mais direto
        if (label && value) {
          const cleanLabel = label
            .replace(/^Escolha [Oo] /i, '')
            .replace(/^Selecione [Oo] /i, '')
            .replace(/^Qual [Oo] /i, '');
          
          extraSpecs.push(`🔸 ${cleanLabel}: ${value}`);
        }
      }
    }

    const finalNotes = extraSpecs.length > 0 
      ? `Email: ${email} | ${extraSpecs.join(" | ")}` 
      : `Email: ${email}`;

    // =============================================
    // ROUND-ROBIN: Determinar a quem atribuir o lead
    // =============================================
    
    // 1. Buscar todos os membros ativos da cúpula
    const { data: members, error: membersErr } = await supabase
      .from('cupula_access')
      .select('user_id, full_name, created_at')
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true });

    if (membersErr) {
      console.error("❌ Erro ao buscar membros:", membersErr);
      throw membersErr;
    }

    let assignedTo: string | null = null;

    if (members && members.length > 0) {
      // 2. Buscar o ÚLTIMO lead atribuído (assigned_to) para saber quem foi o último
      const { data: lastAssigned } = await supabase
        .from('cupula_leads')
        .select('assigned_to')
        .not('assigned_to', 'is', null)
        .order('assigned_at', { ascending: false })
        .limit(1);

      let nextIndex = 0;

      if (lastAssigned && lastAssigned.length > 0) {
        const lastUserId = lastAssigned[0].assigned_to;
        const lastIndex = members.findIndex(m => m.user_id === lastUserId);
        
        if (lastIndex !== -1) {
          // Próximo na fila é o seguinte ao último que recebeu
          nextIndex = (lastIndex + 1) % members.length;
        }
      }

      assignedTo = members[nextIndex].user_id;
      console.log(`🎯 Round-robin: Lead atribuído a ${members[nextIndex].full_name || 'membro'} (user_id: ${assignedTo}, posição: ${nextIndex + 1}/${members.length})`);
    }

    // 3. Inserir o Lead com assigned_to e turn tracking definidos
    const now = new Date();
    const turnExpires = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutos

    const { error } = await supabase
      .from('cupula_leads')
      .insert({
        niche: nicheFromFB,
        name: name,
        phone: cleanPhone,
        notes: finalNotes,
        status: 'novos',
        assigned_to: assignedTo,
        assigned_at: now.toISOString(),
        current_turn_user_id: assignedTo,
        turn_expires_at: turnExpires.toISOString()
      })

    if (error) {
      console.error("❌ Erro ao salvar lead na Cúpula:", error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    console.log(`✅ Lead ${name} salvo e atribuído! Os membros já podem capturá-lo na plataforma.`)
    return new Response(JSON.stringify({ success: true, message: "Lead depositado na Cúpula!", assigned_to: assignedTo }), { status: 200 })

  } catch (err: any) {
    console.error("❌ Erro Crítico no Webhook:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
// Force deploy update
