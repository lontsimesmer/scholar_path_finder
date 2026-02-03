import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Function started");

    // Parse request body for leadId and email
    let leadId: string | null = null;
    let guestEmail: string | null = null;
    try {
      const body = await req.json();
      leadId = body.leadId || null;
      guestEmail = body.email || null;
    } catch {
      // No body or invalid JSON
    }

    let customerEmail: string | null = null;
    let userId: string | null = null;

    // Try to get authenticated user first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        if (data.user?.email) {
          customerEmail = data.user.email;
          userId = data.user.id;
          logStep("User authenticated", { userId, email: customerEmail });
        }
      } catch {
        logStep("Auth check failed, trying guest checkout");
      }
    }

    // If no authenticated user, try to get email from lead
    if (!customerEmail && leadId) {
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("leads")
        .select("email, name")
        .eq("id", leadId)
        .single();
      
      if (!leadError && lead?.email) {
        customerEmail = lead.email;
        logStep("Using email from lead", { leadId, email: customerEmail });
      }
    }

    // If still no email, use the provided guest email
    if (!customerEmail && guestEmail) {
      customerEmail = guestEmail;
      logStep("Using provided guest email", { email: customerEmail });
    }

    if (!customerEmail) {
      throw new Error("No email available for checkout. Please ensure you have a valid lead or provide an email.");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    logStep("Stripe initialized");

    // Create checkout session for one-time payment
    logStep("Creating checkout session for", { email: customerEmail });
    
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Power Prestation - Initial Consultation",
              description: "One-on-one consultation session with our education experts",
            },
            unit_amount: 2500, // $25.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success${leadId ? `?leadId=${leadId}` : ''}`,
      cancel_url: `${req.headers.get("origin")}/checkout${leadId ? `?leadId=${leadId}` : ''}`,
      metadata: {
        leadId: leadId || "",
        userId: userId || "",
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Update lead payment status to pending
    if (leadId) {
      await supabaseAdmin
        .from("leads")
        .update({
          payment_status: "pending",
          payment_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      logStep("Lead updated with pending payment", { leadId });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
