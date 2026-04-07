import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import { checkCinetPayPayment } from "../_shared/cinetpay.ts";
import {
  getLatestOwnedPaymentTransaction,
  getPaymentTransactionByTransactionId,
  isFinalLocalStatus,
  reconcilePaymentVerification,
} from "../_shared/cinetpay-transactions.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("GET-CINETPAY-PAYMENT-STATUS");

type StatusRequest = {
  leadId?: string;
  transactionId?: string;
};

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as StatusRequest;
    const leadId = normalizeText(body.leadId);
    const requestedTransactionId = normalizeText(body.transactionId);

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();
    await requireOwnedLead(supabase, leadId, user.email);

    const transaction = requestedTransactionId
      ? await getPaymentTransactionByTransactionId(supabase, requestedTransactionId)
      : await getLatestOwnedPaymentTransaction(supabase, leadId, user.id);

    if (!transaction || transaction.lead_id !== leadId || transaction.student_id !== user.id) {
      return new Response(JSON.stringify({ error: "Payment transaction not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (isFinalLocalStatus(transaction.local_status)) {
      return new Response(
        JSON.stringify({
          transactionId: transaction.transaction_id,
          paymentStatus: transaction.local_status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const verification = await checkCinetPayPayment(transaction.transaction_id);
    const result = await reconcilePaymentVerification(supabase, transaction, verification);

    logger.info("CinetPay payment status reconciled on demand", {
      transactionId: transaction.transaction_id,
      paymentStatus: result.localStatus,
      providerStatus: result.providerStatus,
    });

    return new Response(
      JSON.stringify({
        transactionId: transaction.transaction_id,
        paymentStatus: result.localStatus,
        providerStatus: result.providerStatus,
        paymentMethod: result.paymentMethod,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to get CinetPay payment status", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
