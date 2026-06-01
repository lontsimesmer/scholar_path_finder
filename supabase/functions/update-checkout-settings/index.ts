import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, requireAdminUser } from "../_shared/auth-utils.ts";
import { getCinetPayCheckoutSettings } from "../_shared/cinetpay.ts";
import { saveCheckoutPricing } from "../_shared/checkout-settings.ts";
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

type UpdateCheckoutSettingsRequest = {
  amountXaf?: unknown;
};

const logger = createLogger("UPDATE-CHECKOUT-SETTINGS");

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }

  if (message === "Admin access is required") {
    return 403;
  }

  if (message.startsWith("Consultation amount")) {
    return 400;
  }

  return 500;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as UpdateCheckoutSettingsRequest;
    const supabase = createServiceRoleClient();
    const admin = await requireAdminUser(supabase, req);
    const fallback = getCinetPayCheckoutSettings();
    const pricing = await saveCheckoutPricing(supabase, body.amountXaf, fallback, admin.email);
    const [paymentMode, manualOrangeMoney] = await Promise.all([
      loadCheckoutPaymentMode(supabase),
      loadManualPaymentInstructions(supabase),
    ]);

    logger.info("Consultation price updated", {
      amountXaf: pricing.amountXaf,
      adminEmail: admin.email,
    });

    return new Response(
      JSON.stringify({ ...pricing, paymentMode, manualOrangeMoney }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to update checkout settings", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
