import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${suffix}`);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
};

const getSiteUrl = (req: Request) => {
  const configuredUrl = Deno.env.get("SITE_URL");
  const origin = req.headers.get("origin");
  const siteUrl = configuredUrl || origin || "http://localhost:8080";
  return siteUrl.replace(/\/$/, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !stripeKey) {
      throw new Error("Server configuration is incomplete");
    }

    const token = getBearerToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    const leadId = typeof body?.leadId === "string" ? body.leadId.trim() : "";
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user?.email) {
      return new Response(JSON.stringify({ error: "Invalid authentication session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userEmail = normalizeEmail(authData.user.email);
    logStep("User authenticated", { userId: authData.user.id, email: userEmail });

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, email, payment_status")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (normalizeEmail(lead.email) !== userEmail) {
      return new Response(JSON.stringify({ error: "You are not allowed to pay for this lead" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (lead.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "This consultation has already been paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const siteUrl = getSiteUrl(req);

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Power Prestation - Initial Consultation",
              description: "One-on-one consultation session with our education experts",
            },
            unit_amount: 2500,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&leadId=${leadId}`,
      cancel_url: `${siteUrl}/checkout?leadId=${leadId}&email=${encodeURIComponent(userEmail)}`,
      metadata: {
        leadId,
        userId: authData.user.id,
        userEmail,
      },
    });

    await supabaseAdmin
      .from("leads")
      .update({
        payment_status: "pending",
        payment_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    logStep("Checkout session created", { sessionId: session.id, leadId });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
