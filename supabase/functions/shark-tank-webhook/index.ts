import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🦈 Webhook Push N8N (Shark Tank):', JSON.stringify(payload));
    
    // É recomendado no n8n que seu sócio chame a function passando ?token=chave-secreta
    // E você pode configurar essa validação futuramente.
    
    // Instanciando cliente com privilégio root para inserir em tabela sem RLS logado
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mapeia flexivelmente chaves do JSON do N8N (nome/name/telefone/phone)
    const niche = payload.niche || payload.nicho || 'Consórcio';
    const name = payload.name || payload.nome || payload.lead_name;
    const phone = payload.phone || payload.telefone || payload.numero || payload.celular;
    const notes = payload.notes || payload.observacoes || payload.extra_info || null;

    if (!name || !phone) {
      return new Response(JSON.stringify({ error: 'Nome e telefone são campos obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Limpa números para ficar apenas os dígitos e o 55 Brasil (padrão)
    let cleanPhone = phone.toString().replace(/\D/g, "");
    if (cleanPhone.length <= 11) {
       cleanPhone = `55${cleanPhone}`;
    }

    // Logando a inserção real
    console.log(`Lançando novo Lead no Tanque de ${niche}. Nome: ${name}`);

    const { data: insertedLead, error: insertError } = await supabaseClient
      .from('shark_tank_leads')
      .insert({
        niche: niche,
        name: name,
        phone: cleanPhone,
        notes: notes,
        status: 'novos', // Padrão de fila inicial
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database Error ao inserir no Tank:', insertError);
      throw new Error(`Erro ao inserir lead no banco de dados do Shark Tank: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Lead recebido e jogado com sucesso no Shark Tank!',
      lead_id: insertedLead.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Shark Tank Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
