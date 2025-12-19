
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { planId, price } = await req.json()

        // 1. Generate a reference ID for this session
        const referenceId = crypto.randomUUID()

        // 2. Create a pending record in Supabase
        const { error: dbError } = await supabaseClient
            .from('subscriptions')
            .insert({
                external_reference_id: referenceId,
                payment_status: 'pending',
                amount_paid: price,
                plan_name: planId, // e.g. 'yearly' or 'monthly'
            })

        if (dbError) throw dbError

        // 3. Call AbacatePay to create billing
        const ABACATE_API_KEY = Deno.env.get('ABACATE_API_KEY')
        if (!ABACATE_API_KEY) throw new Error('Missing AbacatePay API Key')

        // Construct the payload for AbacatePay
        // Note: Adjust the URL and payload to match actual AbacatePay docs
        const response = await fetch('https://api.abacatepay.com/v1/billing/site/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ABACATE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(price * 100), // cents
                description: `Assinatura roiLead - ${planId}`,
                // We pass our referenceId to track this payment later
                metadata: {
                    reference_id: referenceId
                },
                // Webhook URL will be configured in AbacatePay dashboard or passed here if supported
            })
        })

        const data = await response.json()

        // Assume data.url is the payment link
        if (!response.ok) {
            throw new Error(JSON.stringify(data))
        }

        return new Response(
            JSON.stringify({
                url: data.data.url, // Adjust based on actual response structure
                referenceId: referenceId
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
