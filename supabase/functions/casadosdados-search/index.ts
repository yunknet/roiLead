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

    // Resolvendo Municipio (nomes -> codigos)
    let municipioCodes: string[] = [];
    if (payload.municipio && payload.municipio.length > 0) {
        const { data: munData } = await supabaseCnpj
            .from('rfb_municipios')
            .select('codigo')
            .or(payload.municipio.map((m: string) => `descricao.ilike.%${m}%`).join(','));
        
        if (munData && munData.length > 0) {
            municipioCodes = munData.map(m => m.codigo);
        } else {
            // Se buscou municipio e não achou o codigo, forçar a não trazer nada
            municipioCodes = ['00000']; 
        }
    }

    // Constrói a query principal
    let query = supabaseCnpj
        .from('rfb_estabelecimentos')
        .select(`
            cnpj,
            cnpj_base,
            identificador_matriz_filial,
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

    // UF
    if (payload.uf && payload.uf.length > 0) {
        query = query.in('uf', payload.uf.map((u: string) => u.toUpperCase()));
    }
    
    // DDD
    if (payload.ddd && payload.ddd.length > 0) {
        query = query.in('ddd_1', payload.ddd);
    }

    // Municipio
    if (municipioCodes.length > 0) {
        query = query.in('municipio', municipioCodes);
    }

    // Bairro
    if (payload.bairro && payload.bairro.length > 0) {
        query = query.or(payload.bairro.map((b: string) => `bairro.ilike.%${b}%`).join(','));
    }

    // CNAE Principal
    if (payload.codigo_atividade_principal && payload.codigo_atividade_principal.length > 0) {
        query = query.in('cnae_fisc_principal', payload.codigo_atividade_principal);
    }

    // Situação Cadastral ("ATIVA" -> "2", etc)
    if (payload.situacao_cadastral && payload.situacao_cadastral.length > 0) {
        const codigosSituacao = payload.situacao_cadastral.map((s: string) => {
            if (s === "ATIVA") return "2";
            if (s === "BAIXADA") return "8";
            if (s === "SUSPENSA") return "3";
            if (s === "INAPTA") return "4";
            if (s === "NULA") return "1";
            return s;
        });
        query = query.in('situacao_cadastral', codigosSituacao);
    }

    // Matriz ou Filial ("MATRIZ" -> 1, "FILIAL" -> 2)
    if (payload.matriz_filial) {
        if (payload.matriz_filial === "MATRIZ") query = query.eq('identificador_matriz_filial', 1);
        if (payload.matriz_filial === "FILIAL") query = query.eq('identificador_matriz_filial', 2);
    }
    
    // Data de Abertura
    if (payload.data_abertura?.inicio) {
        query = query.gte('data_inicio_atividade', payload.data_abertura.inicio);
    }
    if (payload.data_abertura?.fim) {
        query = query.lte('data_inicio_atividade', payload.data_abertura.fim);
    }

    // Busca textual (Nome Fantasia)
    const termo = payload.busca_textual?.[0]?.texto?.[0];
    if (termo) {
        query = query.ilike('nome_fantasia', `%${termo}%`);
    }

    // Contatos
    if (payload.mais_filtros?.com_email) {
        query = query.not('correio_eletronico', 'is', null).neq('correio_eletronico', '');
    }
    if (payload.mais_filtros?.com_telefone || payload.mais_filtros?.somente_celular || payload.mais_filtros?.somente_fixo) {
        query = query.not('telefone_1', 'is', null).neq('telefone_1', '');
    }

    // LIMIT E PAGINAÇÃO (PONTO 3 DO CLAUDE)
    const limite = payload.limite || 30;
    const pagina = payload.pagina || 1;
    const offset = (pagina - 1) * limite;
    
    // O Supabase range é inclusivo (0 a 29 = 30 itens)
    query = query.range(offset, offset + limite - 1);

    let { data, error } = await query;

    if (error) {
        throw error;
    }

    // 1. Busca as Razões Sociais e filtra capital social / MEI
    const bases = [...new Set(data.map((d: any) => d.cnpj_base))];
    const empresasMap: any = {};
    const simplesMap: any = {};
    
    if (bases.length > 0) {
        const [resEmp, resSimp] = await Promise.all([
            supabaseCnpj.from('rfb_empresas')
                .select('cnpj_base, razao_social, capital_social, porte_empresa, natureza_juridica, qualificacao_responsavel')
                .in('cnpj_base', bases),
            supabaseCnpj.from('rfb_simples')
                .select('*')
                .in('cnpj_base', bases)
        ]);

        if (resEmp.data) {
            resEmp.data.forEach((e: any) => { empresasMap[e.cnpj_base] = e; });
        }
        if (resSimp.data) {
            resSimp.data.forEach((s: any) => { simplesMap[s.cnpj_base] = s; });
        }

        // Aplicando os filtros in-memory (para Capital Social, Simples, MEI)
        data = data.filter((row: any) => {
            const emp = empresasMap[row.cnpj_base];
            const simp = simplesMap[row.cnpj_base];

            // Capital Social
            if (payload.capital_social) {
                const cap = emp?.capital_social || 0;
                if (payload.capital_social.minimo > 0 && cap < payload.capital_social.minimo) return false;
                if (payload.capital_social.maximo > 0 && cap > payload.capital_social.maximo) return false;
            }

            // Natureza Juridica
            if (payload.codigo_natureza_juridica && payload.codigo_natureza_juridica.length > 0) {
                if (!payload.codigo_natureza_juridica.includes(emp?.natureza_juridica?.toString())) return false;
            }

            // Simples / MEI
            if (payload.simples) {
                if (payload.simples.optante === true && simp?.opcao_simples !== 'S') return false;
                if (payload.simples.excluir_optante === true && simp?.opcao_simples === 'S') return false;
            }
            if (payload.mei) {
                if (payload.mei.optante === true && simp?.opcao_mei !== 'S') return false;
                if (payload.mei.excluir_optante === true && simp?.opcao_mei === 'S') return false;
            }

            return true;
        });
    }

    // 2. Busca Dicionários para os códigos restantes
    const municipiosCodesFin = [...new Set(data.map((d: any) => d.municipio?.toString()))].filter(Boolean);
    const cnaesCodes = [...new Set(data.map((d: any) => d.cnae_fisc_principal?.toString()))].filter(Boolean);
    const naturezasCodes = [...new Set(Object.values(empresasMap).map((e: any) => e.natureza_juridica?.toString()))].filter(Boolean);

    const [resMun, resCnaes, resNat] = await Promise.all([
        municipiosCodesFin.length > 0 ? supabaseCnpj.from('rfb_municipios').select('codigo, descricao').in('codigo', municipiosCodesFin) : Promise.resolve({ data: [] }),
        cnaesCodes.length > 0 ? supabaseCnpj.from('rfb_cnaes').select('codigo, descricao').in('codigo', cnaesCodes) : Promise.resolve({ data: [] }),
        naturezasCodes.length > 0 ? supabaseCnpj.from('rfb_naturezas').select('codigo, descricao').in('codigo', naturezasCodes) : Promise.resolve({ data: [] })
    ]);

    const dicMun = Object.fromEntries((resMun.data || []).map((m: any) => [m.codigo, m.descricao]));
    const dicCnae = Object.fromEntries((resCnaes.data || []).map((c: any) => [c.codigo, c.descricao]));
    const dicNat = Object.fromEntries((resNat.data || []).map((n: any) => [n.codigo, n.descricao]));

    // Mapeia os dados para o formato exato
    const cnpjsFormatted = data.map((row: any) => {
        const emp = empresasMap[row.cnpj_base] || {};
        const simp = simplesMap[row.cnpj_base] || {};
        
        return {
            cnpj: row.cnpj,
            matriz_filial: row.identificador_matriz_filial == 1 ? "MATRIZ" : "FILIAL",
            razao_social: emp.razao_social || row.nome_fantasia || "",
            nome_fantasia: row.nome_fantasia || "",
            data_abertura: row.data_inicio_atividade || "",
            situacao_cadastral: { 
                situacao_atual: { "1": "NULA", "2": "ATIVA", "3": "SUSPENSA", "4": "INAPTA", "8": "BAIXADA", "01": "NULA", "02": "ATIVA", "03": "SUSPENSA", "04": "INAPTA", "08": "BAIXADA" }[row.situacao_cadastral?.toString()] || "DESCONHECIDA", 
                data: row.data_situacao_cadastral || "" 
            },
            atividade_principal: { 
                codigo: row.cnae_fisc_principal, 
                descricao: dicCnae[row.cnae_fisc_principal] || "" 
            },
            capital_social: emp.capital_social || 0,
            porte_empresa: { 
                codigo: emp.porte_empresa?.toString() || "", 
                descricao: { "1": "Micro Empresa", "3": "Empresa de Pequeno Porte", "5": "Demais", "01": "Micro Empresa", "03": "Empresa de Pequeno Porte", "05": "Demais" }[emp.porte_empresa?.toString()] || "" 
            },
            codigo_natureza_juridica: emp.natureza_juridica?.toString() || "",
            descricao_natureza_juridica: dicNat[emp.natureza_juridica?.toString()] || "",
            qualificacao_responsavel: {
                codigo: emp.qualificacao_responsavel?.toString() || "",
                descricao: emp.qualificacao_responsavel == 50 ? "Empresário" : emp.qualificacao_responsavel == 49 ? "Sócio-Administrador" : "Responsável"
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
            contato_telefonico: [
                ...(row.telefone_1 ? [{
                    ddd: row.ddd_1 || "",
                    numero: row.telefone_1,
                    completo: row.ddd_1 ? `(${row.ddd_1}) ${row.telefone_1}` : row.telefone_1,
                    tipo: "TELEFONE"
                }] : []),
                ...(row.telefone_2 ? [{
                    ddd: row.ddd_2 || "",
                    numero: row.telefone_2,
                    completo: row.ddd_2 ? `(${row.ddd_2}) ${row.telefone_2}` : row.telefone_2,
                    tipo: "TELEFONE"
                }] : [])
            ],
            contato_email: row.correio_eletronico ? [{
                email: row.correio_eletronico,
                dominio: ""
            }] : []
        };
    });

    return new Response(JSON.stringify({
        success: true,
        cnpjs: cnpjsFormatted,
        total: cnpjsFormatted.length,
        pagina: pagina
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
