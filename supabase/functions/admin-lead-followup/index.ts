import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAdminUser,
} from "../_shared/auth-utils.ts";
import { canSendBrevoEmail, sendBrevoTransactionalEmail } from "../_shared/brevo.ts";
import { generateNurturingEmail, nurturingSubjects } from "../_shared/email-templates.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logger = createLogger("ADMIN-LEAD-FOLLOWUP");

const COOLDOWN_MINUTES = 30;
const MAX_FOLLOW_UPS = 14;

const getSiteUrl = () => {
  const siteUrl = Deno.env.get("SITE_URL")?.trim();
  if (siteUrl) return siteUrl.replace(/\/+$/, "");
  return "https://powerprestation.ca";
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") {
    return 403;
  }
  if (message === "Lead not found") {
    return 404;
  }
  if (
    message === "leadId is required" ||
    message === "Lead already paid" ||
    message === "Follow-up limit reached" ||
    message === "Follow-ups are paused for this lead" ||
    message.startsWith("Cooldown active") ||
    message === "Email delivery is not configured"
  ) {
    return 400;
  }
  return 500;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createServiceRoleClient();
    const caller = await requireAdminUser(supabase, req);

    const body = await req.json().catch(() => ({}));
    const leadId = typeof (body as { leadId?: unknown }).leadId === "string"
      ? ((body as { leadId: string }).leadId).trim()
      : "";

    if (!leadId) {
      throw new Error("leadId is required");
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, name, email, phone, payment_status, status, follow_up_count, last_follow_up_at, follow_up_paused_at",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to load lead: ${leadError.message}`);
    }
    if (!lead) {
      throw new Error("Lead not found");
    }
    if (lead.payment_status === "paid") {
      throw new Error("Lead already paid");
    }
    if (lead.follow_up_paused_at) {
      throw new Error("Follow-ups are paused for this lead");
    }
    const currentCount = lead.follow_up_count ?? 0;
    if (currentCount >= MAX_FOLLOW_UPS) {
      throw new Error("Follow-up limit reached");
    }

    if (lead.last_follow_up_at) {
      const lastAt = new Date(lead.last_follow_up_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - lastAt) / (60 * 1000);
      if (elapsedMinutes < COOLDOWN_MINUTES) {
        const remaining = Math.max(1, Math.ceil(COOLDOWN_MINUTES - elapsedMinutes));
        throw new Error(`Cooldown active: try again in ${remaining} minute(s)`);
      }
    }

    if (!canSendBrevoEmail()) {
      throw new Error("Email delivery is not configured");
    }

    const dayNumber = currentCount + 1;
    const subjectIndex = (dayNumber - 1) % nurturingSubjects.length;
    const subject = nurturingSubjects[subjectIndex];
    const siteUrl = getSiteUrl();
    const checkoutUrl = `${siteUrl}/checkout?leadId=${lead.id}&email=${encodeURIComponent(lead.email)}`;
    const htmlContent = generateNurturingEmail(lead.name, checkoutUrl, dayNumber);
    const textContent = [
      `Bonjour ${lead.name},`,
      "",
      "Ceci est un rappel personnel de l'équipe Power Prestation.",
      "",
      "Pour finaliser votre consultation, cliquez sur ce lien :",
      checkoutUrl,
      "",
      "Power Prestation — Conseil en mobilité académique.",
    ].join("\n");

    await sendBrevoTransactionalEmail({
      to: [{ email: lead.email, name: lead.name }],
      subject,
      htmlContent,
      textContent,
    });

    // TODO: SMS follow-up disabled until Brevo SMS is enabled.
    // When ready, call sendBrevoTransactionalSms({ recipient: lead.phone, content: "..." }).
    const smsAttempted = false;

    const nextFollowUp = new Date();
    nextFollowUp.setHours(nextFollowUp.getHours() + 24);
    const newCount = currentCount + 1;
    const newStatus = newCount >= MAX_FOLLOW_UPS ? "expired" : "follow_up";

    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        follow_up_count: newCount,
        last_follow_up_at: new Date().toISOString(),
        next_follow_up_at: newCount >= MAX_FOLLOW_UPS ? null : nextFollowUp.toISOString(),
        status: newStatus,
      })
      .eq("id", lead.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    logger.info("Manual follow-up sent by admin", {
      leadId: lead.id,
      admin: caller.email,
      followUpCount: newCount,
      smsAttempted,
    });

    return jsonResponse({
      ok: true,
      lead: updatedLead,
      cooldownMinutes: COOLDOWN_MINUTES,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.warn("admin-lead-followup request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
