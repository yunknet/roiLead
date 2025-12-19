import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { planId, price } = await req.json();

        if (!planId || !price || price <= 0) {
            throw new Error("Plano ou valor inválido.");
        }

        // 1. Gerar referência
        const referenceId = crypto.randomUUID();

        // 2. Criar registro pendente
        const { error: dbError } = await supabase
            .from("subscriptions")
            .insert({
                external_reference_id: referenceId,
                payment_status: "pending",
                subscription_status: "inactive",
                plan_name: planId,
                amount_paid: null, // SOMENTE webhook preenche
            });

        if (dbError) throw dbError;

        // 3. Criar cobrança no AbacatePay
        const ABACATE_API_KEY = Deno.env.get("ABACATE_API_KEY");
        if (!ABACATE_API_KEY) {
            throw new Error("ABACATE_API_KEY não configurada");
        }

        const response = await fetch(
            "https://api.abacatepay.com/v1/billing/site/create",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ABACATE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: Math.round(price * 100), // centavos
                    description: `Assinatura roiLead - ${planId}`,
                    metadata: {
                        reference_id: referenceId,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data?.data?.url) {
            throw new Error("Erro ao criar cobrança no AbacatePay");
        }

        return new Response(
            JSON.stringify({
                url: data.data.url,
                referenceId,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
