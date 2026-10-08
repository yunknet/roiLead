import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Webhook payload recebido:", payload)

    // Aceita tanto INSERT (novo lead) quanto UPDATE (rotação da fila)
    if (payload.type !== 'UPDATE' && payload.type !== 'INSERT') {
        return new Response(JSON.stringify({ message: "Ignorado (não é INSERT nem UPDATE)" }), { headers: corsHeaders, status: 200 })
    }

    const { record, old_record } = payload

    if (payload.type === 'UPDATE') {
        // No update, só notifica se a vez passou para outra pessoa
        if (!record.current_turn_user_id || record.current_turn_user_id === old_record?.current_turn_user_id) {
            return new Response(JSON.stringify({ message: "Ignorado (consultor não mudou)" }), { headers: corsHeaders, status: 200 })
        }
    }

    if (payload.type === 'INSERT') {
        // No insert, notifica o primeiro sortudo da fila
        if (!record.current_turn_user_id) {
            return new Response(JSON.stringify({ message: "Ignorado (insert sem dono da vez atribuído)" }), { headers: corsHeaders, status: 200 })
        }
    }

    const userId = record.current_turn_user_id
    const leadName = record.name || "Novo Lead"
    const leadNiche = record.niche || "Cúpula"

    // Inicializar o Supabase com Service Role para acessar push_tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Variáveis de ambiente do Supabase não configuradas")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar TODOS os tokens do usuário (ele pode ter múltiplos dispositivos: Android + iOS)
    const { data: tokensData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_token, platform')
      .eq('user_id', userId)

    if (tokenError || !tokensData || tokensData.length === 0) {
        console.log(`Usuário ${userId} não possui token de push registrado.`)
        return new Response(JSON.stringify({ message: "Usuário sem token push" }), { headers: corsHeaders, status: 200 })
    }

    console.log(`Encontrados ${tokensData.length} dispositivo(s) para o usuário ${userId}`)

    // Montar mensagens individuais para cada dispositivo (Android e iOS têm configs diferentes)
    const messages = tokensData.map((tokenEntry) => {
      const isAndroid = tokenEntry.platform === 'android'

      return {
        to: tokenEntry.expo_token,
        sound: 'default',
        title: '🚨 Sua Vez!',
        body: `Novo lead (${leadNiche}): ${leadName}. Você tem 3 minutos para capturar!`,
        data: { leadId: record.id, niche: leadNiche },
        priority: 'high',
        // Android: canal de notificação obrigatório (Android 8+)
        ...(isAndroid && { channelId: 'cupula' }),
        // iOS: badge no ícone do app
        ...(!isAndroid && { badge: 1 }),
      }
    })

    console.log(`Enviando push para ${messages.length} dispositivo(s):`, messages.map(m => m.to))

    // Enviar todas as notificações de uma vez (a API do Expo aceita array)
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const expoResult = await expoResponse.json()
    console.log("Resultado Expo:", expoResult)

    return new Response(
      JSON.stringify({ success: true, devices: tokensData.length, expoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Erro na edge function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
