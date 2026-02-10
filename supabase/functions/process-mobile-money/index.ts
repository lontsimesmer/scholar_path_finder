import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, provider, phoneNumber, amount } = await req.json();

    // Validate inputs
    if (!leadId || !provider || !phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leadId)) {
      return new Response(
        JSON.stringify({ error: "Invalid lead ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate provider
    const validProviders = ["mtn", "orange"];
    if (!validProviders.includes(provider)) {
      return new Response(
        JSON.stringify({ error: "Invalid mobile money provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get account number based on provider
    const accountNumbers: Record<string, string> = {
      mtn: "651831709",
      orange: "690830651",
    };
    const targetAccount = accountNumbers[provider];

    // Validate amount
    if (amount !== 25.00) {
      return new Response(
        JSON.stringify({ error: "Invalid payment amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update lead with pending mobile money payment
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        payment_status: "mobile_money_pending",
        payment_id: `MM-${provider.toUpperCase()}-${Date.now()}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Error updating lead:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to process payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the payment details with the target account
    console.log(`Mobile Money payment initiated: ${provider} - Account: ${targetAccount} - Phone: ${phoneNumber} - $${amount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment confirmation received. We'll verify and contact you shortly.",
        transactionId: `MM-${provider.toUpperCase()}-${Date.now()}`,
        targetAccount: targetAccount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Mobile Money error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process mobile money payment. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
