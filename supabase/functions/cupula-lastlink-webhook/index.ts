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
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');
    const tokenHeader = req.headers.get("authorization");
    const secret = Deno.env.get('CUPULA_LASTLINK');

    if (tokenQuery !== secret && tokenHeader !== secret && tokenHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const payload = await req.json();
    console.log('💰 Webhook Hubla (Cúpula) Recebido:', JSON.stringify(payload));
    
    // Instancia cliente admin do Supabase (bypass RLS)
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mapeia flexivelmente campos comuns de Gateways (Hubla, Lastlink, Kiwify, Eduzz, etc)
    const eventData = payload.data || payload.event || payload || {};
    const user = eventData.user || eventData.customer || eventData.payer || eventData.buyer || eventData.subscriber || payload.buyer || payload.customer || payload.user || payload;
    
    const email = user.email || payload.email || eventData.email;
    const paymentStatus = String(payload.status || payload.event || payload.event_type || payload.type || payload.payment_status || eventData.status || "").toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'E-mail não localizado no payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Regras padrões de gateways
    const isApproved = paymentStatus && (
        paymentStatus.toLowerCase().includes('approved') || 
        paymentStatus.toLowerCase().includes('paid') ||
        paymentStatus.toLowerCase().includes('pago') ||
        paymentStatus.toLowerCase().includes('success') ||
        paymentStatus.toLowerCase().includes('aprovada') ||
        paymentStatus.toLowerCase().includes('aprovado') ||
        paymentStatus.toLowerCase().includes('activated')
    );

    // Status final que vamos salvar
    const subscriptionStatus = isApproved ? 'active' : 'inactive';
    console.log(`Processando cliente ${email} / Status final: ${subscriptionStatus} (Baseado no valor: ${paymentStatus})`);

    // Busca a ID do usuário usando o profile (se ele já tiver criado conta na plataforma)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    const userId = profile ? profile.id : null;

    // Atualiza ou insere na tabela cupula_access
    const { error: upsertError } = await supabaseClient
      .from('cupula_access')
      .upsert({
        email: email.toLowerCase(), // salva limpo
        user_id: userId,
        status: subscriptionStatus,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' }); // Será necessário que a tabela tenha um UNIQUE constraint em email!

    if (upsertError) {
      console.error('Database Error ao atualizar o Acesso Shark:', upsertError);
      throw new Error(`Erro de Banco de Dados: ${upsertError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Acesso à Cúpula definido como '${subscriptionStatus}' para o email ${email}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Hubla Webhook Processing Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
