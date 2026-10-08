import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Conecta no Supabase da VPS (Self-Hosted)
    const CNPJ_DB_URL = Deno.env.get("CNPJ_DB_URL") || "https://geral-supabase.8ffod1.easypanel.host";
    const CNPJ_DB_KEY = Deno.env.get("CNPJ_DB_KEY"); // Anon Key of the VPS

    if (!CNPJ_DB_KEY) {
        throw new Error("Missing CNPJ_DB_KEY in Edge Function secrets");
    }

    const supabaseCnpj = createClient(CNPJ_DB_URL, CNPJ_DB_KEY);

    // Constrói a query no banco novo
    let query = supabaseCnpj
        .from('rfb_estabelecimentos')
        .select(`
            cnpj,
            cnpj_base,
            nome_fantasia,
            data_inicio_atividade,
            cnae_fisc_principal,
            bairro,
            cep,
            uf,
            municipio,
            ddd_1,
            telefone_1,
            ddd_2,
            telefone_2,
            correio_eletronico
        `);

    // Filtros de estado e ddd baseados no payload
    if (payload.uf && payload.uf.length > 0) {
        query = query.in('uf', payload.uf.map((u: string) => u.toUpperCase()));
    }
    
    if (payload.ddd && payload.ddd.length > 0) {
        query = query.in('ddd_1', payload.ddd);
    }
    
    if (payload.data_abertura?.inicio) {
        query = query.gte('data_inicio_atividade', payload.data_abertura.inicio);
    }

    // A busca textual vem dentro de payload.busca_textual[0].texto[0]
    const termo = payload.busca_textual?.[0]?.texto?.[0];
    if (termo) {
        query = query.ilike('nome_fantasia', `%${termo}%`);
    }

    // Filtros de contato
    if (payload.mais_filtros?.com_email) {
        query = query.not('correio_eletronico', 'is', null).neq('correio_eletronico', '');
    }
    if (payload.mais_filtros?.com_telefone) {
        query = query.not('telefone_1', 'is', null).neq('telefone_1', '');
    }

    // Limita pela requisição
    const limite = payload.limite || 50;
    query = query.limit(limite);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    
    // Busca as Razões Sociais separadamente já que não temos Foreign Key rígida no banco
    const bases = [...new Set(data.map((d: any) => d.cnpj_base))];
    const empresasMap: any = {};
    
    if (bases.length > 0) {
        const { data: empresas } = await supabaseCnpj
            .from('rfb_empresas')
            .select('cnpj_base, razao_social, capital_social')
            .in('cnpj_base', bases);
            
        if (empresas) {
            empresas.forEach((e: any) => { empresasMap[e.cnpj_base] = e; });
        }
    }

    // Mapeia os dados para o formato exato que o CRM RoiLead espera no frontend
    const cnpjsFormatted = data.map((row: any) => ({
        cnpj: row.cnpj,
        razao_social: empresasMap[row.cnpj_base]?.razao_social || row.nome_fantasia || "",
        nome_fantasia: row.nome_fantasia || "",
        data_abertura: row.data_inicio_atividade || "",
        cnae_principal: { codigo: row.cnae_fisc_principal, descricao: "" },
        municipio: row.municipio?.toString() || "",
        uf: row.uf || "",
        bairro: row.bairro || "",
        cep: row.cep || "",
        ddd1: row.ddd_1 || "",
        telefone1: row.telefone_1 || "",
        ddd2: row.ddd_2 || "",
        telefone2: row.telefone_2 || "",
        email: row.correio_eletronico || ""
    }));

    return new Response(JSON.stringify({
        success: true,
        cnpjs: cnpjsFormatted
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
