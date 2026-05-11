import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Pega o nicho enviado pelo frontend (padrão Consórcio se não vier nada)
    const body = await req.json().catch(() => ({}));
    const niche = body.niche || 'Consórcio';

    // 0. Executar rotação de turnos expirados
    try {
      await supabaseClient.rpc('rotate_cupula_turns');
    } catch (rotateErr) {
      console.warn("⚠️ Erro na rotação:", rotateErr);
    }

    // 1. Buscar membros ativos QUE PERTENCEM AO NICHO selecionado
    const { data: members, error: accessErr } = await supabaseClient
      .from('cupula_access')
      .select('user_id, full_name, created_at')
      .eq('status', 'active')
      .contains('niches', [niche]) // Filtra pelo array de nichos
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true });

    if (accessErr) throw accessErr;

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({
        active_users: [],
        base_turn_index: 0,
        server_now: Date.now()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const activeUserIds = members.map(m => m.user_id);

    // 2. Montar lista de nomes
    const { data: profilesData } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', activeUserIds);

    const profileMap = new Map(profilesData?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Membro']));

    const activeUsersList = members.map(m => ({
      user_id: m.user_id,
      name: m.full_name || profileMap.get(m.user_id) || 'Membro',
      joined_at: m.created_at
    }));

    // 3. Determinar de quem é a vez baseado no ÚLTIMO lead desse nicho
    const { data: lastAssigned } = await supabaseClient
      .from('cupula_leads')
      .select('assigned_to')
      .eq('niche', niche) // Filtra pelo nicho do lead
      .not('assigned_to', 'is', null)
      .order('assigned_at', { ascending: false })
      .limit(1);

    let baseTurnIndex = 0;
    if (lastAssigned && lastAssigned.length > 0) {
      const lastUserId = lastAssigned[0].assigned_to;
      const lastIndex = activeUserIds.indexOf(lastUserId);
      if (lastIndex !== -1) {
        baseTurnIndex = (lastIndex + 1) % activeUserIds.length;
      }
    }

    return new Response(JSON.stringify({
      active_users: activeUsersList,
      base_turn_index: baseTurnIndex,
      server_now: Date.now()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Queue Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
// Force deploy update
