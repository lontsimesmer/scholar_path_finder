import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import {
  createAdminNotificationsForAll,
  loadManualPaymentInstructions,
} from "../_shared/manual-payments.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("SUBMIT-MANUAL-PAYMENT");

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (
    message === "leadId is required" ||
    message === "Receipt file is required" ||
    message === "senderName is required" ||
    message === "senderPhone is required" ||
    message.startsWith("Receipt file size") ||
    message.startsWith("Unsupported receipt format")
  ) {
    return 400;
  }
  if (
    message === "You are not allowed to access this lead" ||
    message === "Lead not found" ||
    message === "Lead is blocked for manual payments" ||
    message === "Consultation already paid"
  ) {
    return 409;
  }
  if (message === "A submission is already pending review for this lead") {
    return 409;
  }
  return 500;
};

const sanitizeOptionalString = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const leadIdRaw = formData.get("leadId");
    const leadId = typeof leadIdRaw === "string" ? leadIdRaw.trim() : "";
    if (!leadId) {
      throw new Error("leadId is required");
    }

    const receiptValue = formData.get("receipt");
    if (!(receiptValue instanceof File) || receiptValue.size === 0) {
      throw new Error("Receipt file is required");
    }
    if (receiptValue.size > MAX_RECEIPT_BYTES) {
      throw new Error("Receipt file size exceeds the 5 MB limit");
    }
    const mimeType = receiptValue.type?.toLowerCase() ?? "";
    if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
      throw new Error("Unsupported receipt format (only PNG, JPG, WEBP or PDF)");
    }

    const senderName = sanitizeOptionalString(formData.get("senderName"));
    const senderPhone = sanitizeOptionalString(formData.get("senderPhone"));
    const providerReference = sanitizeOptionalString(formData.get("providerReference"));
    const notes = sanitizeOptionalString(formData.get("notes"));

    if (!senderName) {
      throw new Error("senderName is required");
    }
    if (!senderPhone) {
      throw new Error("senderPhone is required");
    }

    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();
    await requireOwnedLead(supabase, leadId, user.email);

    const { data: leadRecord, error: leadError } = await supabase
      .from("leads")
      .select("id, email, payment_status, manual_payment_blocked_at")
      .eq("id", leadId)
      .single();

    if (leadError || !leadRecord) {
      throw new Error("Lead not found");
    }

    if (leadRecord.payment_status === "paid") {
      throw new Error("Consultation already paid");
    }

    if (leadRecord.manual_payment_blocked_at) {
      throw new Error("Lead is blocked for manual payments");
    }

    const { data: existingPending, error: pendingError } = await supabase
      .from("manual_payment_submissions")
      .select("id")
      .eq("lead_id", leadId)
      .eq("status", "pending_review")
      .maybeSingle();

    if (pendingError) {
      throw new Error(`Failed to check pending submissions: ${pendingError.message}`);
    }

    if (existingPending) {
      throw new Error("A submission is already pending review for this lead");
    }

    const instructions = await loadManualPaymentInstructions(supabase);

    const extension = MIME_EXTENSION[mimeType] ?? "bin";
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const receiptPath = `${user.id}/${fileName}`;

    const arrayBuffer = await receiptValue.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(receiptPath, new Uint8Array(arrayBuffer), {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload receipt: ${uploadError.message}`);
    }

    const { data: submission, error: insertError } = await supabase
      .from("manual_payment_submissions")
      .insert({
        lead_id: leadId,
        student_id: user.id,
        amount: instructions.amount,
        currency: instructions.currency,
        receipt_path: receiptPath,
        receipt_mime_type: mimeType,
        sender_name: senderName,
        sender_phone: senderPhone,
        provider_reference: providerReference,
        notes,
        status: "pending_review",
      })
      .select("id, status, created_at")
      .single();

    if (insertError || !submission) {
      await supabase.storage.from("payment-receipts").remove([receiptPath]).catch(() => undefined);
      const message = insertError?.message ?? "Failed to create manual payment submission";
      if (message.toLowerCase().includes("duplicate")) {
        throw new Error("A submission is already pending review for this lead");
      }
      throw new Error(message);
    }

    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        payment_status: "bank_transfer_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateLeadError) {
      logger.warn("Failed to update lead payment_status after submission", {
        leadId,
        error: updateLeadError.message,
      });
    }

    await createAdminNotificationsForAll(supabase, {
      type: "manual_payment.submitted",
      title: "Nouvelle preuve de paiement",
      body: leadRecord.email,
      linkPath: `/admin/manual-payments?submissionId=${submission.id}`,
      payload: {
        submissionId: submission.id,
        leadId,
        studentId: user.id,
        amount: instructions.amount,
        currency: instructions.currency,
      },
    });

    logger.info("Manual payment submission created", {
      submissionId: submission.id,
      leadId,
      studentId: user.id,
    });

    return new Response(
      JSON.stringify({
        submissionId: submission.id,
        status: submission.status,
        createdAt: submission.created_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to submit manual payment", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
