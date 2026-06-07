import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { escapeHtml } from "../_shared/html-utils.ts";
import {
  createServiceRoleClient,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONSULTATION_AMOUNT_USD = 25;
const logger = createLogger("PROCESS-BANK-TRANSFER");

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, reference, amount } = await req.json();
    logger.info("Request received", { leadId, amount });

    if (!leadId || !reference || !amount) {
      logger.warn("Bank transfer request rejected because fields are missing", {
        hasLeadId: Boolean(leadId),
        hasReference: Boolean(reference),
        hasAmount: Boolean(amount),
      });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leadId)) {
      logger.warn("Bank transfer request rejected because leadId is invalid", { leadId });
      return new Response(JSON.stringify({ error: "Invalid lead ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount !== CONSULTATION_AMOUNT_USD) {
      logger.warn("Bank transfer request rejected because amount is invalid", { leadId, amount });
      return new Response(JSON.stringify({ error: "Invalid payment amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();
    const lead = await requireOwnedLead(supabase, leadId, user.email);
    logger.info("Bank transfer request authenticated", { leadId, userId: user.id });

    const { data: fullLead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead.id)
      .single();

    if (leadError || !fullLead) {
      logger.warn("Bank transfer request failed because lead was not found", { leadId });
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        payment_status: "bank_transfer_pending",
        payment_id: reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      logger.error("Failed to update lead for bank transfer", {
        leadId,
        message: updateError.message,
      });
      return new Response(JSON.stringify({ error: "Failed to record transfer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    await resend.emails.send({
      from: "Power Prestation <noreply@powerprestation.ca>",
      to: ["onboarding@resend.dev"],
      subject: `Bank Transfer Pending: ${escapeHtml(reference)}`,
      html: `
        <h2>Bank Transfer Payment Pending</h2>
        <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
        <p><strong>Amount:</strong> $${escapeHtml(String(amount))} USD</p>
        <hr>
        <p><strong>Lead Details:</strong></p>
        <p><strong>Name:</strong> ${escapeHtml(fullLead.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(fullLead.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(fullLead.phone || "Not provided")}</p>
        <hr>
        <p>Please verify the bank transfer and update the lead status accordingly.</p>
      `,
    });
    logger.info("Bank transfer notification email sent", { leadId, reference });

    logger.info("Bank transfer recorded", { leadId, reference, amount });

    return new Response(JSON.stringify({
      success: true,
      message: "Transfer notification recorded. We will verify within 24 hours.",
      reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Unhandled bank transfer processing error", {
      message: getErrorMessage(error),
    });
    return new Response(JSON.stringify({ error: "Failed to process bank transfer. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
