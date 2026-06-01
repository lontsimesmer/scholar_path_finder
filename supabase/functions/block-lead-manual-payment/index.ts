import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, requireAdminUser } from "../_shared/auth-utils.ts";
import { createStudentNotification } from "../_shared/manual-payments.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("BLOCK-LEAD-MANUAL-PAYMENT");

type BlockRequest = {
  leadId?: string;
  reason?: string;
  unblock?: boolean;
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") {
    return 403;
  }
  if (message === "leadId is required") {
    return 400;
  }
  if (message === "Lead not found") {
    return 404;
  }
  return 500;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as BlockRequest;
    const leadId = body.leadId?.trim();
    const unblock = body.unblock === true;
    const reason = body.reason?.trim() ?? null;

    if (!leadId) {
      throw new Error("leadId is required");
    }

    const supabase = createServiceRoleClient();
    const admin = await requireAdminUser(supabase, req);

    const { data: leadRecord, error: loadError } = await supabase
      .from("leads")
      .select("id, email")
      .eq("id", leadId)
      .maybeSingle();

    if (loadError || !leadRecord) {
      throw new Error("Lead not found");
    }

    const now = new Date().toISOString();

    if (unblock) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          manual_payment_blocked_at: null,
          manual_payment_blocked_by: null,
          manual_payment_blocked_reason: null,
          updated_at: now,
        })
        .eq("id", leadId);

      if (updateError) {
        throw new Error(`Failed to unblock lead: ${updateError.message}`);
      }

      logger.info("Lead unblocked", { leadId, adminEmail: admin.email });

      return new Response(JSON.stringify({ leadId, blocked: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        manual_payment_blocked_at: now,
        manual_payment_blocked_by: admin.email,
        manual_payment_blocked_reason: reason,
        updated_at: now,
      })
      .eq("id", leadId);

    if (updateError) {
      throw new Error(`Failed to block lead: ${updateError.message}`);
    }

    const { data: latestSubmission } = await supabase
      .from("manual_payment_submissions")
      .select("student_id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSubmission?.student_id) {
      await createStudentNotification(supabase, {
        recipientUserId: latestSubmission.student_id as string,
        type: "manual_payment.lead_blocked",
        title: "Soumissions bloquées",
        body:
          reason ??
          "Vos soumissions de paiement manuel ont été bloquées. Veuillez contacter notre équipe.",
        linkPath: "/dashboard",
        payload: { leadId, reason },
      });
    }

    logger.info("Lead blocked", { leadId, adminEmail: admin.email });

    return new Response(JSON.stringify({ leadId, blocked: true, blockedAt: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to update lead block status", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
