import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient } from "../_shared/auth-utils.ts";
import { getCinetPayCheckoutSettings } from "../_shared/cinetpay.ts";
import { getCheckoutPricing } from "../_shared/checkout-settings.ts";
import {
  loadCheckoutPaymentMode,
  loadManualPaymentInstructions,
} from "../_shared/manual-payments.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("GET-CHECKOUT-SETTINGS");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceRoleClient();
    const fallback = getCinetPayCheckoutSettings();
    const [pricing, paymentMode, manualOrangeMoney] = await Promise.all([
      getCheckoutPricing(supabase, fallback),
      loadCheckoutPaymentMode(supabase),
      loadManualPaymentInstructions(supabase),
    ]);

    return new Response(
      JSON.stringify({
        ...pricing,
        paymentMode,
        manualOrangeMoney,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to load checkout settings", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
