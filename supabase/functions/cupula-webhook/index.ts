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

    // Insere o Lead diretamente na tabela exclusiva da Cúpula de Leads!
    const { error } = await supabase
      .from('cupula_leads')
      .insert({
        niche: nicheFromFB,
        name: name,
        phone: cleanPhone,
        notes: finalNotes,
        status: 'novos'
      })

    if (error) {
      console.error("❌ Erro ao salvar lead na Cúpula:", error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    console.log(`✅ Lead ${name} salvo! Os membros já podem capturá-lo na plataforma.`)
    return new Response(JSON.stringify({ success: true, message: "Lead depositado na Cúpula!" }), { status: 200 })

  } catch (err: any) {
    console.error("❌ Erro Crítico no Webhook:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
