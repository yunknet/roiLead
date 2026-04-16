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

    // 1. Fetch active members sorted by registration (created_at)
    const { data: members, error: accessErr } = await supabaseClient
      .from('cupula_access')
      .select('user_id, created_at')
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true });

    if (accessErr) throw accessErr;

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ current_turn_member_id: null, current_turn_member_name: "Nenhum membro ativo", queue: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const activeUserIds = members.map(m => m.user_id);

    // 2. Fetch profiles to map names
    const { data: profilesData } = await supabaseClient
      .from('profiles')
      .select('id, first_name')
      .in('id', activeUserIds);
      
    const profileMap = new Map(profilesData?.map(p => [p.id, p.first_name || 'Membro']));

    // If only 1 member, it's always their turn
    if (activeUserIds.length === 1) {
      const uid = activeUserIds[0];
      return new Response(JSON.stringify({ 
        current_turn_member_id: uid, 
        current_turn_member_name: profileMap.get(uid),
        turn_expires_at: null,
        queue: [{ user_id: uid, name: profileMap.get(uid) }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Determine base turn from LAST claim
    const { data: lastClaimeds, error: leadErr } = await supabaseClient
      .from('cupula_leads')
      .select('owner_id')
      .not('owner_id', 'is', null)
      .order('claimed_at', { ascending: false })
      .limit(1);

    if (leadErr) throw leadErr;

    let baseTurnIndex = 0;
    if (lastClaimeds && lastClaimeds.length > 0) {
      const lastOwnerId = lastClaimeds[0].owner_id;
      const lastIndex = activeUserIds.indexOf(lastOwnerId);
      if (lastIndex !== -1) {
        baseTurnIndex = (lastIndex + 1) % activeUserIds.length;
      }
    }

    // Return the absolute queue definition
    const activeUsersList = activeUserIds.map(uid => ({
        user_id: uid,
        name: profileMap.get(uid)
    }));

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
