import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Limites de segurança (o formulário do front permite até 1000)
const MAX_LIMITE = 1000;
const MAX_PAGINA = 1000;
const LOTE = 1000;               // linhas brutas buscadas por vez na VPS
const IN_CHUNK = 200;            // valores por consulta .in() (limite de tamanho de URL)
const MAX_LINHAS_VARRIDAS = 20000; // teto de varredura quando há filtros em memória

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const toArray = (v: any): any[] => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]);

// Remove acentos e padroniza em maiúsculas (a base da RFB não tem acentos)
const normalizeText = (s: any) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

// Remove caracteres que alteram a sintaxe dos filtros do PostgREST (, ( ) " \) e curingas (% * _)
const sanitizeFilterValue = (s: any) =>
  normalizeText(s).replace(/[,()"\\%*_]/g, ' ').replace(/\s+/g, ' ').trim();

const toInt = (v: any, def: number, min: number, max: number) => {
  const n = parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
};

// Códigos da RFB podem estar gravados com ou sem zeros à esquerda (ex: "107" x "0107")
const codeKey = (c: any) => String(c ?? '').trim().replace(/^0+(?=\d)/, '');
const codeVariants = (c: any, width: number) => {
  const raw = String(c ?? '').trim();
  const key = codeKey(raw);
  return [...new Set([raw, key, key.padStart(width, '0')])].filter(Boolean);
};
const codeVariantsList = (codes: any[], width: number) => [...new Set(codes.flatMap((c) => codeVariants(c, width)))];

// Classifica o telefone: CELULAR, FIXO, TELEFONE (formato desconhecido) ou INVALIDO (lixo, ex: 99999999)
const phoneType = (numero: any) => {
  let d = String(numero ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = d.slice(2); // veio com DDD junto
  if (d.length < 8 || /^(\d)\1+$/.test(d)) return 'INVALIDO';
  if (d.length === 9) return d[0] === '9' ? 'CELULAR' : 'TELEFONE';
  if (d.length === 8) {
    if ('6789'.includes(d[0])) return 'CELULAR';
    if ('2345'.includes(d[0])) return 'FIXO';
  }
  return 'TELEFONE';
};

const SITUACAO_CODIGOS: Record<string, string> = {
  NULA: '1', ATIVA: '2', SUSPENSA: '3', INAPTA: '4', BAIXADA: '8',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Método não permitido');
    }

    // ===== AUTENTICAÇÃO: apenas usuários logados (a anon key sozinha não basta) =====
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new HttpError(401, 'Não autenticado');
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      throw new HttpError(401, 'Sessão inválida ou expirada. Faça login novamente.');
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      throw new HttpError(400, 'JSON inválido no corpo da requisição');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new HttpError(400, 'Corpo da requisição deve ser um objeto JSON');
    }

    // Conecta no Supabase da VPS (Self-Hosted)
    const CNPJ_DB_URL = Deno.env.get("CNPJ_DB_URL") || "https://geral-supabase.8ffod1.easypanel.host";
    const CNPJ_DB_KEY = Deno.env.get("CNPJ_DB_KEY"); // Anon Key of the VPS

    if (!CNPJ_DB_KEY) {
        throw new Error("Missing CNPJ_DB_KEY in Edge Function secrets");
    }

    const supabaseCnpj = createClient(CNPJ_DB_URL, CNPJ_DB_KEY);

    // .in() com centenas de valores estoura o tamanho da URL na VPS: consulta em grupos menores
    const selectIn = async (table: string, columns: string, column: string, values: any[]) => {
        if (values.length === 0) return [];
        const grupos: any[][] = [];
        for (let i = 0; i < values.length; i += IN_CHUNK) grupos.push(values.slice(i, i + IN_CHUNK));
        const resultados = await Promise.all(grupos.map(async (grupo) => {
            const { data, error } = await supabaseCnpj.from(table).select(columns).in(column, grupo);
            if (error) throw error;
            return data || [];
        }));
        return resultados.flat();
    };

    // LIMIT E PAGINAÇÃO (validados e com teto)
    const limite = toInt(payload.limite, 30, 1, MAX_LIMITE);
    const pagina = toInt(payload.pagina, 1, 1, MAX_PAGINA);

    // Resolvendo Municipio (nomes -> codigos): primeiro nome exato, depois parcial só para o que não achou
    let municipioCodes: string[] = [];
    const municipios = toArray(payload.municipio).map(sanitizeFilterValue).filter(Boolean);
    if (toArray(payload.municipio).length > 0) {
        const { data: exatos, error: exatosError } = await supabaseCnpj
            .from('rfb_municipios')
            .select('codigo, descricao')
            .in('descricao', municipios.length > 0 ? municipios : ['__nenhum__']);
        if (exatosError) throw exatosError;

        const achados = new Set((exatos || []).map((m: any) => normalizeText(m.descricao)));
        const codigos = (exatos || []).map((m: any) => m.codigo);

        const faltantes = municipios.filter((m) => !achados.has(m));
        if (faltantes.length > 0) {
            const { data: parciais, error: parciaisError } = await supabaseCnpj
                .from('rfb_municipios')
                .select('codigo')
                .or(faltantes.map((m) => `descricao.ilike.%${m}%`).join(','));
            if (parciaisError) throw parciaisError;
            (parciais || []).forEach((m: any) => codigos.push(m.codigo));
        }

        // Se buscou municipio e não achou o codigo, forçar a não trazer nada
        municipioCodes = codigos.length > 0 ? codeVariantsList(codigos, 4) : ['00000'];
    }

    // Constrói a query principal (somente filtros que o banco consegue aplicar)
    const buildQuery = () => {
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
        const ufs = toArray(payload.uf).map(sanitizeFilterValue).filter(Boolean);
        if (ufs.length > 0) {
            query = query.in('uf', ufs);
        }

        // DDD
        const ddds = toArray(payload.ddd).map((d) => String(d).replace(/\D/g, '')).filter(Boolean);
        if (ddds.length > 0) {
            query = query.in('ddd_1', ddds);
        }

        // Municipio
        if (municipioCodes.length > 0) {
            query = query.in('municipio', municipioCodes);
        }

        // Bairro
        const bairros = toArray(payload.bairro).map(sanitizeFilterValue).filter(Boolean);
        if (bairros.length > 0) {
            query = query.or(bairros.map((b) => `bairro.ilike.%${b}%`).join(','));
        }

        // CNAE Principal
        const cnaes = toArray(payload.codigo_atividade_principal).map((c) => String(c).replace(/\D/g, '')).filter(Boolean);
        if (cnaes.length > 0) {
            query = query.in('cnae_fisc_principal', codeVariantsList(cnaes, 7));
        }

        // Situação Cadastral ("ATIVA" -> "2", etc)
        const situacoes = toArray(payload.situacao_cadastral);
        if (situacoes.length > 0) {
            const codigosSituacao = situacoes.map((s: any) => SITUACAO_CODIGOS[normalizeText(s)] ?? String(s).replace(/\D/g, '')).filter(Boolean);
            query = query.in('situacao_cadastral', codeVariantsList(codigosSituacao.length > 0 ? codigosSituacao : ['__nenhum__'], 2));
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
        const termo = sanitizeFilterValue(payload.busca_textual?.[0]?.texto?.[0]);
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

        return query;
    };

    // Filtros que dependem de outras tabelas / pós-processamento
    const naturezas = toArray(payload.codigo_natureza_juridica).map(codeKey).filter(Boolean);
    const somenteCelular = !!payload.mais_filtros?.somente_celular;
    const somenteFixo = !!payload.mais_filtros?.somente_fixo;
    const comTelefone = !!payload.mais_filtros?.com_telefone || somenteCelular || somenteFixo;
    const filtroEmMemoria = !!(
        payload.capital_social?.minimo > 0 || payload.capital_social?.maximo > 0 ||
        naturezas.length > 0 ||
        payload.simples?.optante === true || payload.simples?.excluir_optante === true ||
        payload.mei?.optante === true || payload.mei?.excluir_optante === true ||
        comTelefone
    );

    const tiposPermitidos = somenteCelular && somenteFixo ? ['CELULAR', 'FIXO']
        : somenteCelular ? ['CELULAR']
        : somenteFixo ? ['FIXO']
        : null;

    const montaTelefones = (row: any) => {
        const tels = [
            { ddd: row.ddd_1, numero: row.telefone_1 },
            { ddd: row.ddd_2, numero: row.telefone_2 },
        ]
            .filter((t) => t.numero)
            .map((t) => ({ ...t, tipo: phoneType(t.numero) }))
            .filter((t) => t.tipo !== 'INVALIDO');
        return tiposPermitidos ? tels.filter((t) => tiposPermitidos.includes(t.tipo)) : tels;
    };

    // Busca Razões Sociais / Simples / MEI de um lote
    const empresasMap: any = {};
    const simplesMap: any = {};
    const carregaEmpresas = async (rows: any[]) => {
        const bases = [...new Set(rows.map((d: any) => d.cnpj_base))].filter((b) => b && !(b in empresasMap));
        if (bases.length === 0) return;
        const [empresas, simples] = await Promise.all([
            selectIn('rfb_empresas', 'cnpj_base, razao_social, capital_social, porte_empresa, natureza_juridica, qualificacao_responsavel', 'cnpj_base', bases),
            selectIn('rfb_simples', '*', 'cnpj_base', bases)
        ]);
        bases.forEach((b) => { empresasMap[b] = null; });
        empresas.forEach((e: any) => { empresasMap[e.cnpj_base] = e; });
        simples.forEach((s: any) => { simplesMap[s.cnpj_base] = s; });
    };

    const passaFiltros = (row: any) => {
        const emp = empresasMap[row.cnpj_base];
        const simp = simplesMap[row.cnpj_base];

        // Capital Social
        if (payload.capital_social) {
            const cap = Number(emp?.capital_social) || 0;
            if (payload.capital_social.minimo > 0 && cap < payload.capital_social.minimo) return false;
            if (payload.capital_social.maximo > 0 && cap > payload.capital_social.maximo) return false;
        }

        // Natureza Juridica
        if (naturezas.length > 0) {
            if (!naturezas.includes(codeKey(emp?.natureza_juridica))) return false;
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

        // Telefone válido / somente celular / somente fixo
        if (comTelefone && montaTelefones(row).length === 0) return false;

        return true;
    };

    let data: any[] = [];
    let temMais = false;
    let varreduraIncompleta = false;

    if (!filtroEmMemoria) {
        // Caminho direto: o banco aplica todos os filtros, paginação normal
        const offset = (pagina - 1) * limite;
        // O Supabase range é inclusivo; busca 1 a mais para saber se há próxima página
        const { data: rows, error } = await buildQuery().range(offset, offset + limite);
        if (error) throw error;
        temMais = (rows || []).length > limite;
        data = (rows || []).slice(0, limite);
        await carregaEmpresas(data);
    } else {
        // Filtros em memória: varre em lotes até preencher a página pedida,
        // assim o usuário recebe a quantidade solicitada (e não menos)
        const pular = (pagina - 1) * limite;
        const precisa = pular + limite + 1;
        const aprovados: any[] = [];
        let offset = 0;
        let acabou = false;
        // Primeiro lote proporcional ao pedido (evita deixar buscas simples mais lentas)
        let tamanho = Math.min(LOTE, Math.max(100, Math.ceil(precisa * 1.5)));
        while (aprovados.length < precisa && offset < MAX_LINHAS_VARRIDAS) {
            const { data: rows, error } = await buildQuery().range(offset, offset + tamanho - 1);
            if (error) throw error;
            const lote = rows || [];
            offset += tamanho;
            if (lote.length === 0) { acabou = true; break; }
            await carregaEmpresas(lote);
            lote.forEach((row: any) => { if (passaFiltros(row)) aprovados.push(row); });
            if (lote.length < tamanho) { acabou = true; break; }
            tamanho = LOTE;
        }
        temMais = aprovados.length > pular + limite || (!acabou && aprovados.length >= precisa);
        varreduraIncompleta = !acabou && aprovados.length < precisa;
        data = aprovados.slice(pular, pular + limite);
    }

    // 2. Busca Dicionários para os códigos restantes
    const empresasUsadas = data.map((d: any) => empresasMap[d.cnpj_base]).filter(Boolean);
    const municipiosCodesFin = codeVariantsList(data.map((d: any) => d.municipio).filter((c: any) => c !== null && c !== undefined && c !== ''), 4);
    const cnaesCodes = codeVariantsList(data.map((d: any) => d.cnae_fisc_principal).filter((c: any) => c !== null && c !== undefined && c !== ''), 7);
    const naturezasCodes = codeVariantsList(empresasUsadas.map((e: any) => e.natureza_juridica).filter((c: any) => c !== null && c !== undefined && c !== ''), 4);

    // Dicionários são só descrições: se falharem, a resposta sai sem a descrição em vez de quebrar
    const [resMun, resCnaes, resNat] = await Promise.all([
        selectIn('rfb_municipios', 'codigo, descricao', 'codigo', municipiosCodesFin).catch(() => []),
        selectIn('rfb_cnaes', 'codigo, descricao', 'codigo', cnaesCodes).catch(() => []),
        selectIn('rfb_naturezas', 'codigo, descricao', 'codigo', naturezasCodes).catch(() => [])
    ]);

    const dicMun = Object.fromEntries(resMun.map((m: any) => [codeKey(m.codigo), m.descricao]));
    const dicCnae = Object.fromEntries(resCnaes.map((c: any) => [codeKey(c.codigo), c.descricao]));
    const dicNat = Object.fromEntries(resNat.map((n: any) => [codeKey(n.codigo), n.descricao]));

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
                situacao_atual: { "1": "NULA", "2": "ATIVA", "3": "SUSPENSA", "4": "INAPTA", "8": "BAIXADA" }[codeKey(row.situacao_cadastral)] || "DESCONHECIDA",
                data: row.data_situacao_cadastral || ""
            },
            atividade_principal: {
                codigo: row.cnae_fisc_principal,
                descricao: dicCnae[codeKey(row.cnae_fisc_principal)] || ""
            },
            capital_social: emp.capital_social || 0,
            porte_empresa: {
                codigo: emp.porte_empresa?.toString() || "",
                descricao: { "1": "Micro Empresa", "3": "Empresa de Pequeno Porte", "5": "Demais" }[codeKey(emp.porte_empresa)] || ""
            },
            codigo_natureza_juridica: emp.natureza_juridica?.toString() || "",
            descricao_natureza_juridica: dicNat[codeKey(emp.natureza_juridica)] || "",
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
                municipio: dicMun[codeKey(row.municipio)] || row.municipio?.toString() || "",
                uf: row.uf || "",
                cep: row.cep || ""
            },
            contato_telefonico: montaTelefones(row).map((t) => ({
                ddd: t.ddd || "",
                numero: t.numero,
                completo: t.ddd ? `(${t.ddd}) ${t.numero}` : t.numero,
                tipo: t.tipo
            })),
            contato_email: row.correio_eletronico ? [{
                email: row.correio_eletronico,
                dominio: ""
            }] : []
        };
    });

    return jsonResponse({
        success: true,
        cnpjs: cnpjsFormatted,
        total: cnpjsFormatted.length,
        pagina: pagina,
        limite: limite,
        tem_mais: temMais,
        ...(varreduraIncompleta ? { aviso: "Filtros muito restritivos: a busca foi interrompida antes de completar a quantidade pedida." } : {})
    });

  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error('casadosdados-search error:', error);
    return jsonResponse({ error: 'Erro interno ao consultar a base de dados. Tente novamente.' }, 500);
  }
});
