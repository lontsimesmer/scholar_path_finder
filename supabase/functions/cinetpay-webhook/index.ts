import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  checkCinetPayPayment,
  getCinetPayConfig,
  toFormValueRecord,
  verifyCinetPayNotificationToken,
} from "../_shared/cinetpay.ts";
import {
  getPaymentTransactionByTransactionId,
  recordPaymentNotification,
  reconcilePaymentVerification,
} from "../_shared/cinetpay-transactions.ts";
import { createServiceRoleClient } from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-token",
};

const logger = createLogger("CINETPAY-WEBHOOK");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("method_not_allowed", { headers: corsHeaders, status: 405 });
  }

  try {
    const formData = await req.formData();
    const payload = toFormValueRecord(formData);
    const transactionId = payload.cpm_trans_id?.trim();
    const siteId = payload.cpm_site_id?.trim();

    logger.info("CinetPay notification received", {
      hasTransactionId: Boolean(transactionId),
      siteId,
    });

    if (!transactionId || !siteId) {
      logger.warn("Notification ignored because required payload fields are missing");
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const config = getCinetPayConfig();
    if (siteId !== config.siteId) {
      logger.warn("Notification rejected because site ID does not match", { siteId });
      return new Response(JSON.stringify({ error: "Invalid site identifier" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const receivedToken = req.headers.get("x-token");
    const isValidToken = await verifyCinetPayNotificationToken(payload, receivedToken);
    if (!isValidToken) {
      logger.warn("Notification rejected because HMAC token verification failed", {
        transactionId,
      });
      return new Response(JSON.stringify({ error: "Invalid notification token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createServiceRoleClient();
    const transaction = await getPaymentTransactionByTransactionId(supabase, transactionId);
    if (!transaction) {
      logger.warn("Notification received for an unknown payment transaction", {
        transactionId,
      });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    await recordPaymentNotification(supabase, transactionId, payload);
    const verification = await checkCinetPayPayment(transactionId);
    const result = await reconcilePaymentVerification(supabase, transaction, verification);

    logger.info("CinetPay notification reconciled", {
      transactionId,
      localStatus: result.localStatus,
      providerStatus: result.providerStatus,
    });

    return new Response(
      JSON.stringify({
        received: true,
        paymentStatus: result.localStatus,
        providerStatus: result.providerStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    logger.error("Failed to process CinetPay webhook", {
      message: getErrorMessage(error),
    });

    return new Response(JSON.stringify({ error: "Failed to process the notification" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
