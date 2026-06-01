import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, requireAdminUser } from "../_shared/auth-utils.ts";
import {
  createStudentNotification,
  markLeadAsPaidViaManualPayment,
} from "../_shared/manual-payments.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("VALIDATE-MANUAL-PAYMENT");

type ValidateRequest = {
  submissionId?: string;
  action?: "approve" | "reject";
  comment?: string;
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") {
    return 403;
  }
  if (
    message === "submissionId is required" ||
    message === "Invalid action" ||
    message === "A rejection comment is required"
  ) {
    return 400;
  }
  if (message === "Submission not found" || message === "Submission already processed") {
    return 409;
  }
  return 500;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ValidateRequest;
    const submissionId = body.submissionId?.trim();
    const action = body.action;
    const comment = body.comment?.trim() ?? null;

    if (!submissionId) {
      throw new Error("submissionId is required");
    }
    if (action !== "approve" && action !== "reject") {
      throw new Error("Invalid action");
    }
    if (action === "reject" && (!comment || comment.length === 0)) {
      throw new Error("A rejection comment is required");
    }

    const supabase = createServiceRoleClient();
    const admin = await requireAdminUser(supabase, req);

    const { data: submission, error: loadError } = await supabase
      .from("manual_payment_submissions")
      .select(
        "id, lead_id, student_id, amount, currency, status, sender_phone, receipt_path",
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (loadError) {
      throw new Error(`Failed to load submission: ${loadError.message}`);
    }
    if (!submission) {
      throw new Error("Submission not found");
    }
    if (submission.status !== "pending_review") {
      throw new Error("Submission already processed");
    }

    const { data: leadRecord, error: leadError } = await supabase
      .from("leads")
      .select("id, email, payment_status")
      .eq("id", submission.lead_id)
      .single();

    if (leadError || !leadRecord) {
      throw new Error(`Failed to load lead: ${leadError?.message ?? "Lead not found"}`);
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      const { paymentTransactionId, transactionId } = await markLeadAsPaidViaManualPayment(
        supabase,
        {
          leadId: submission.lead_id,
          studentId: submission.student_id,
          submissionId: submission.id,
          amount: submission.amount,
          currency: submission.currency,
          customerEmail: leadRecord.email,
          customerPhoneNumber: submission.sender_phone,
        },
      );

      const { error: updateError } = await supabase
        .from("manual_payment_submissions")
        .update({
          status: "approved",
          reviewer_email: admin.email,
          reviewer_comment: comment,
          reviewed_at: now,
          payment_transaction_id: paymentTransactionId,
          updated_at: now,
        })
        .eq("id", submission.id)
        .eq("status", "pending_review");

      if (updateError) {
        throw new Error(`Failed to mark submission as approved: ${updateError.message}`);
      }

      await createStudentNotification(supabase, {
        recipientUserId: submission.student_id,
        type: "manual_payment.approved",
        title: "Paiement validé",
        body: "Votre paiement a été validé. Vous avez maintenant accès à votre espace.",
        linkPath: "/dashboard",
        payload: {
          submissionId: submission.id,
          transactionId,
          leadId: submission.lead_id,
        },
      });

      logger.info("Manual payment approved", {
        submissionId: submission.id,
        adminEmail: admin.email,
        leadId: submission.lead_id,
      });

      return new Response(
        JSON.stringify({
          submissionId: submission.id,
          status: "approved",
          paymentTransactionId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const { error: updateError } = await supabase
      .from("manual_payment_submissions")
      .update({
        status: "rejected",
        reviewer_email: admin.email,
        reviewer_comment: comment,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", submission.id)
      .eq("status", "pending_review");

    if (updateError) {
      throw new Error(`Failed to mark submission as rejected: ${updateError.message}`);
    }

    if (leadRecord.payment_status !== "paid") {
      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          payment_status: "unpaid",
          updated_at: now,
        })
        .eq("id", submission.lead_id);

      if (leadUpdateError) {
        logger.warn("Failed to reset lead payment_status after rejection", {
          leadId: submission.lead_id,
          error: leadUpdateError.message,
        });
      }
    }

    await createStudentNotification(supabase, {
      recipientUserId: submission.student_id,
      type: "manual_payment.rejected",
      title: "Preuve refusée",
      body: comment,
      linkPath: `/checkout?leadId=${encodeURIComponent(submission.lead_id)}&email=${encodeURIComponent(leadRecord.email)}`,
      payload: {
        submissionId: submission.id,
        leadId: submission.lead_id,
      },
    });

    logger.info("Manual payment rejected", {
      submissionId: submission.id,
      adminEmail: admin.email,
      leadId: submission.lead_id,
    });

    return new Response(
      JSON.stringify({
        submissionId: submission.id,
        status: "rejected",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to validate manual payment", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
