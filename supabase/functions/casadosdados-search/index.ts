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
            correio_eletronico,
            rfb_empresas(razao_social, capital_social)
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

    // Busca textual no nome fantasia
    // TODO: Ajustar para buscar com pg_trgm de forma eficiente ou full-text search
    if (payload.query?.termo) {
        query = query.ilike('nome_fantasia', `%${payload.query.termo}%`);
    }

    // Limita para não explodir a resposta
    query = query.limit(50);

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    // Mapeia os dados para o formato exato que o CRM RoiLead espera no frontend
    const cnpjsFormatted = data.map((row: any) => ({
        cnpj: row.cnpj,
        razao_social: row.rfb_empresas?.razao_social || row.nome_fantasia || "",
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
