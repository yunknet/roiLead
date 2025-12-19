import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    if (
      event?.event !== "billing.paid" &&
      event?.status !== "paid"
    ) {
      return new Response(
        JSON.stringify({ received: true, ignored: true }),
        { status: 200 }
      );
    }

    const data = event.data ?? event;
    const referenceId = data?.metadata?.reference_id;

    if (!referenceId) {
      console.error("Webhook sem reference_id");
      return new Response(
        JSON.stringify({ received: true, error: "missing_reference" }),
        { status: 200 }
      );
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({
        payment_status: "paid",
        subscription_status: "inactive",
        abacate_billing_id: data.id ?? null,
        amount_paid: data.amount ? data.amount / 100 : null,
        updated_at: new Date().toISOString()
      })
      .eq("external_reference_id", referenceId);

    if (error) {
      console.error("Erro ao atualizar pagamento:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200 }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "invalid_webhook" }),
      { status: 400 }
    );
  }
});
