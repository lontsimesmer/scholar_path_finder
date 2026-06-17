import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import { loadManualPaymentInstructions } from "../_shared/manual-payments.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("GET-MANUAL-PAYMENT-STATUS");

type StatusRequest = {
  leadId?: string;
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "leadId is required") {
    return 400;
  }
  if (message === "You are not allowed to access this lead" || message === "Lead not found") {
    return 403;
  }
  return 500;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as StatusRequest;
    const leadId = body.leadId?.trim();
    if (!leadId) {
      throw new Error("leadId is required");
    }

    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();
    await requireOwnedLead(supabase, leadId, user.email);

    const { data: leadRecord, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, email, payment_status, manual_payment_blocked_at, manual_payment_blocked_reason",
      )
      .eq("id", leadId)
      .single();

    if (leadError || !leadRecord) {
      throw new Error("Lead not found");
    }

    const { data: latestSubmission, error: submissionError } = await supabase
      .from("manual_payment_submissions")
      .select(
        "id, status, amount, currency, receipt_path, reviewer_comment, reviewed_at, created_at",
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      throw new Error(`Failed to load submission: ${submissionError.message}`);
    }

    const instructions = await loadManualPaymentInstructions(supabase);

    return new Response(
      JSON.stringify({
        leadId,
        leadPaymentStatus: leadRecord.payment_status,
        blocked: Boolean(leadRecord.manual_payment_blocked_at),
        blockedReason: leadRecord.manual_payment_blocked_reason,
        latestSubmission: latestSubmission ?? null,
        instructions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to load manual payment status", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
