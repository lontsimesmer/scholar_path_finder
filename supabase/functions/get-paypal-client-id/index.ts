import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check PayPal mode: "sandbox" or "live"
    const paypalMode = Deno.env.get("PAYPAL_MODE") || "sandbox";
    const isSandbox = paypalMode.toLowerCase() === "sandbox";

    // Get the appropriate client ID based on mode
    const paypalClientId = isSandbox 
      ? Deno.env.get("PAYPAL_CLIENT_ID_SANDBOX") 
      : Deno.env.get("PAYPAL_CLIENT_ID");

    if (!paypalClientId) {
      console.error(`PayPal ${isSandbox ? "sandbox" : "live"} client ID not configured`);
      return new Response(
        JSON.stringify({ error: `PayPal ${isSandbox ? "sandbox" : "live"} not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`PayPal mode: ${paypalMode}, using ${isSandbox ? "sandbox" : "live"} credentials`);

    return new Response(
      JSON.stringify({ 
        clientId: paypalClientId,
        mode: paypalMode,
        isSandbox: isSandbox
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error getting PayPal client ID:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
