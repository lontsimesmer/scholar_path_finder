import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONSULTATION_AMOUNT_USD = 25;
const logger = createLogger("PROCESS-MOBILE-MONEY");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, provider, phoneNumber } = await req.json();
    logger.info("Request received", { leadId, provider });

    if (!leadId || !provider || !phoneNumber) {
      logger.warn("Request rejected because required fields are missing", {
        hasLeadId: Boolean(leadId),
        hasProvider: Boolean(provider),
        hasPhoneNumber: Boolean(phoneNumber),
      });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = getBearerToken(req);
    if (!token) {
      logger.warn("Request rejected because authentication is missing", { leadId, provider });
      return new Response(JSON.stringify({ error: "Authentication is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leadId)) {
      logger.warn("Request rejected because leadId is invalid", { leadId });
      return new Response(JSON.stringify({ error: "Invalid lead ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validProviders = ["mtn", "orange"];
    if (!validProviders.includes(provider)) {
      logger.warn("Request rejected because provider is invalid", { provider });
      return new Response(JSON.stringify({ error: "Invalid mobile money provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountNumbers: Record<string, string> = {
      mtn: "651831709",
      orange: "690830651",
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      logger.error("Server configuration is incomplete");
      throw new Error("Server configuration is incomplete");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user?.email) {
      logger.warn("Request rejected because authentication session is invalid", { leadId });
      return new Response(JSON.stringify({ error: "Invalid authentication session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, email")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      logger.warn("Request rejected because lead was not found", { leadId });
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizeEmail(lead.email) !== normalizeEmail(authData.user.email)) {
      logger.warn("Request rejected because lead ownership check failed", { leadId });
      return new Response(JSON.stringify({ error: "You are not allowed to pay for this lead" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionId = `MM-${provider.toUpperCase()}-${Date.now()}`;
    const targetAccount = accountNumbers[provider];

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        payment_status: "mobile_money_pending",
        payment_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      logger.error("Failed to update lead for mobile money", {
        leadId,
        message: updateError.message,
      });
      return new Response(JSON.stringify({ error: "Failed to process payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Mobile money payment initiated", {
      leadId,
      provider,
      transactionId,
      targetAccount,
      amountUsd: CONSULTATION_AMOUNT_USD,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Please send the payment to ${provider === "orange" ? "Orange Money" : "MTN Mobile Money"} ${targetAccount}. We will verify and contact you shortly.`,
      transactionId,
      targetAccount,
      amount: CONSULTATION_AMOUNT_USD,
      currency: "USD",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Unhandled mobile money processing error", {
      message: getErrorMessage(error),
    });
    return new Response(JSON.stringify({ error: "Failed to process mobile money payment. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
