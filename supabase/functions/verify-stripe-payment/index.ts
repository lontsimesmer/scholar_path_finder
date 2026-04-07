import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  createServiceRoleClient,
  normalizeEmail,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import { ensureConsultationApplication } from "../_shared/student-applications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, leadId } = await req.json();

    if (!sessionId || !leadId) {
      return new Response(JSON.stringify({ error: "sessionId and leadId are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();
    const lead = await requireOwnedLead(supabase, leadId, user.email);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionLeadId = session.metadata?.leadId;
    const customerEmail = session.customer_email ? normalizeEmail(session.customer_email) : null;

    if (sessionLeadId !== lead.id) {
      throw new Error("Stripe session does not match the requested lead");
    }

    if (customerEmail && customerEmail !== user.email) {
      throw new Error("Stripe session does not belong to the authenticated user");
    }

    if (session.payment_status === "paid") {
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          payment_status: "paid",
          payment_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) {
        throw new Error("Failed to update payment status");
      }

      await ensureConsultationApplication(supabase, user.id);
    }

    return new Response(
      JSON.stringify({
        paymentStatus: session.payment_status,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to verify Stripe payment",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
