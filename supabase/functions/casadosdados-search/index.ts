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
            nome_fantasia, situacao_cadastral, data_situacao_cadastral, data_inicio_atividade,
            cnae_fisc_principal,
            tipo_logradouro, logradouro, numero, complemento, bairro, cep,
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

    
    // 1. Busca as Razões Sociais separadamente
    const bases = [...new Set(data.map((d: any) => d.cnpj_base))];
    const empresasMap: any = {};
    
    if (bases.length > 0) {
        const { data: empresas } = await supabaseCnpj
            .from('rfb_empresas')
            .select('cnpj_base, razao_social, capital_social, porte_empresa, natureza_juridica, qualificacao_do_responsavel')
            .in('cnpj_base', bases);
            
        if (empresas) {
            empresas.forEach((e: any) => { empresasMap[e.cnpj_base] = e; });
        }
    }

    // 2. Busca Dicionários e Simples Nacional
    const municipiosCodes = [...new Set(data.map((d: any) => d.municipio?.toString()))].filter(Boolean);
    const cnaesCodes = [...new Set(data.map((d: any) => d.cnae_fisc_principal?.toString()))].filter(Boolean);
    const naturezasCodes = [...new Set(Object.values(empresasMap).map((e: any) => e.natureza_juridica?.toString()))].filter(Boolean);

    const [resMun, resCnaes, resNat, resSimples] = await Promise.all([
        municipiosCodes.length > 0 ? supabaseCnpj.from('rfb_municipios').select('codigo, descricao').in('codigo', municipiosCodes) : Promise.resolve({ data: [] }),
        cnaesCodes.length > 0 ? supabaseCnpj.from('rfb_cnaes').select('codigo, descricao').in('codigo', cnaesCodes) : Promise.resolve({ data: [] }),
        naturezasCodes.length > 0 ? supabaseCnpj.from('rfb_naturezas').select('codigo, descricao').in('codigo', naturezasCodes) : Promise.resolve({ data: [] }),
        bases.length > 0 ? supabaseCnpj.from('rfb_simples').select('*').in('cnpj_base', bases) : Promise.resolve({ data: [] })
    ]);

    const dicMun = Object.fromEntries((resMun.data || []).map((m: any) => [m.codigo, m.descricao]));
    const dicCnae = Object.fromEntries((resCnaes.data || []).map((c: any) => [c.codigo, c.descricao]));
    const dicNat = Object.fromEntries((resNat.data || []).map((n: any) => [n.codigo, n.descricao]));
    const simplesMap = Object.fromEntries((resSimples.data || []).map((s: any) => [s.cnpj_base, s]));

    // Mapeia os dados para o formato exato que o CRM RoiLead espera no frontend
    const cnpjsFormatted = data.map((row: any) => {
        const emp = empresasMap[row.cnpj_base] || {};
        const simp = simplesMap[row.cnpj_base] || {};
        
        return {
            cnpj: row.cnpj,
            razao_social: emp.razao_social || row.nome_fantasia || "",
            nome_fantasia: row.nome_fantasia || "",
            data_abertura: row.data_inicio_atividade || "",
            situacao_cadastral: { 
                situacao_atual: { "01": "NULA", "02": "ATIVA", "03": "SUSPENSA", "04": "INAPTA", "08": "BAIXADA" }[row.situacao_cadastral] || "DESCONHECIDA", 
                data: row.data_situacao_cadastral || "" 
            },
            atividade_principal: { 
                codigo: row.cnae_fisc_principal, 
                descricao: dicCnae[row.cnae_fisc_principal] || "" 
            },
            capital_social: emp.capital_social || 0,
            porte_empresa: { 
                codigo: emp.porte_empresa || "", 
                descricao: { "01": "Micro Empresa", "03": "Empresa de Pequeno Porte", "05": "Demais" }[emp.porte_empresa] || "" 
            },
            codigo_natureza_juridica: emp.natureza_juridica || "",
            descricao_natureza_juridica: dicNat[emp.natureza_juridica] || "",
            qualificacao_responsavel: {
                codigo: emp.qualificacao_do_responsavel || "",
                descricao: emp.qualificacao_do_responsavel == "50" ? "Empresário" : emp.qualificacao_do_responsavel == "49" ? "Sócio-Administrador" : "Responsável"
            },
            simples: {
                optante: simp.opcao_simples === 'S',
                data_opcao_simples: simp.data_opcao_simples || null,
                data_exclusao_simples: simp.data_exclusao_simples || null
            },
            mei: {
                optante: simp.opcao_mei === 'S',
                data_opcao_mei: simp.data_opcao_mei || null,
                data_exclusao_mei: simp.data_exclusao_mei || null
            },
            endereco: {
                tipo_logradouro: row.tipo_logradouro || "",
                logradouro: row.logradouro || "",
                numero: row.numero || "",
                complemento: row.complemento || "",
                bairro: row.bairro || "",
                municipio: dicMun[row.municipio?.toString()] || row.municipio?.toString() || "",
                uf: row.uf || "",
                cep: row.cep || ""
            },
            contato_telefonico: row.telefone_1 ? [{
                ddd: row.ddd_1 || "",
                numero: row.telefone_1,
                tipo: "TELEFONE"
            }] : [],
            contato_email: row.correio_eletronico ? [{
                email: row.correio_eletronico,
                dominio: ""
            }] : []
        };
    });

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
