import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, requireAdminUser } from "../_shared/auth-utils.ts";
import { canSendBrevoSms, sendBrevoTransactionalSms } from "../_shared/brevo.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CreateDocumentRequestPayload = {
  studentId?: string;
  applicationId?: string | null;
  title?: string;
  description?: string | null;
  locale?: string | null;
};

type StudentProfileNotificationTarget = {
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
};

const logger = createLogger("CREATE-DOCUMENT-REQUEST");

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

const isSmsEnabled = () =>
  normalizeText(Deno.env.get("DOCUMENT_REQUEST_SMS_ENABLED")).toLowerCase() === "true";

const buildDashboardUrl = () => {
  const siteUrl = normalizeText(Deno.env.get("SITE_URL")) || "http://localhost:8080";
  return `${siteUrl.replace(/\/$/, "")}/dashboard`;
};

const buildSmsContent = (locale: string | null | undefined) => {
  const dashboardUrl = buildDashboardUrl();
  if (normalizeText(locale).toLowerCase().startsWith("en")) {
    return `Power Prestation: a document is required for your file. Sign in to upload it: ${dashboardUrl}`;
  }

  return `Power Prestation : un document est requis pour votre dossier. Connectez-vous pour le deposer : ${dashboardUrl}`;
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }

  if (message === "Admin access is required") {
    return 403;
  }

  if (
    message === "studentId is required" ||
    message === "Document title is required" ||
    message === "Student profile not found"
  ) {
    return 400;
  }

  return 500;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as CreateDocumentRequestPayload;
    const studentId = normalizeText(payload.studentId);
    const title = normalizeText(payload.title);
    const description = normalizeText(payload.description);

    if (!studentId) {
      return jsonResponse({ error: "studentId is required" }, 400);
    }

    if (!title) {
      return jsonResponse({ error: "Document title is required" }, 400);
    }

    const supabase = createServiceRoleClient();
    const admin = await requireAdminUser(supabase, req);

    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("email, phone_number, first_name, last_name")
      .eq("id", studentId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to load student profile: ${profileError.message}`);
    }

    if (!profile) {
      return jsonResponse({ error: "Student profile not found" }, 400);
    }

    const { data: request, error: requestError } = await supabase
      .from("student_document_requests")
      .insert({
        student_id: studentId,
        application_id: payload.applicationId ?? null,
        title,
        description: description || null,
        status: "pending",
        requested_by: admin.email,
      })
      .select("*")
      .single();

    if (requestError || !request) {
      throw new Error(`Failed to create document request: ${requestError?.message ?? "Unknown error"}`);
    }

    let sms = {
      enabled: isSmsEnabled(),
      attempted: false,
      sent: false,
      skippedReason: null as string | null,
    };
    const notificationTarget = profile as StudentProfileNotificationTarget;

    if (!sms.enabled) {
      sms = { ...sms, skippedReason: "disabled" };
    } else if (!normalizeText(notificationTarget.phone_number)) {
      sms = { ...sms, skippedReason: "missing_phone_number" };
    } else if (!canSendBrevoSms()) {
      sms = { ...sms, skippedReason: "brevo_sms_not_configured" };
    } else {
      sms = { ...sms, attempted: true };
      await sendBrevoTransactionalSms({
        recipient: normalizeText(notificationTarget.phone_number),
        content: buildSmsContent(payload.locale),
        tag: "document_request",
      });
      sms = { ...sms, sent: true };
    }

    logger.info("Document request created", {
      requestId: request.id,
      studentId,
      adminEmail: admin.email,
      sms,
    });

    return jsonResponse({ request, sms }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to create document request", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
