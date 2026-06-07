import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateNurturingEmail, nurturingSubjects } from "../_shared/email-templates.ts";
import { createServiceRoleClient } from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const logger = createLogger("SEND-FOLLOW-UPS");

const isAuthorizedRequest = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");

  const isServiceRole = Boolean(serviceRoleKey) && authHeader === `Bearer ${serviceRoleKey}`;
  const isCronSecretValid = Boolean(cronSecret) && providedCronSecret === cronSecret;

  return isServiceRole || isCronSecretValid;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!isAuthorizedRequest(req)) {
      logger.warn("Unauthorized access attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .in("status", ["pending", "follow_up"])
      .eq("payment_status", "unpaid")
      .lt("next_follow_up_at", now)
      .lt("follow_up_count", 14)
      .order("next_follow_up_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      logger.error("Failed to fetch leads for follow-ups", {
        message: fetchError.message,
      });
      return new Response(JSON.stringify({ error: "Failed to fetch leads" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!leads || leads.length === 0) {
      logger.info("No leads require a follow-up");
      return new Response(JSON.stringify({ success: true, message: "No follow-ups needed", processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Processing follow-up batch", { leadCount: leads.length });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    let processed = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const dayNumber = (lead.follow_up_count ?? 0) + 1;
        logger.info("Processing follow-up for lead", { leadId: lead.id, dayNumber });
        const subjectIndex = (dayNumber - 1) % nurturingSubjects.length;
        const subject = nurturingSubjects[subjectIndex];
        const origin = "https://power-prestation.lovable.app";
        const checkoutUrl = `${origin}/checkout?leadId=${lead.id}&email=${encodeURIComponent(lead.email)}`;

        await resend.emails.send({
          from: "Power Prestation <noreply@powerprestation.ca>",
          replyTo: "powerprestationint@gmail.com",
          to: [lead.email],
          subject,
          html: generateNurturingEmail(lead.name, checkoutUrl, dayNumber),
        });

        if (lead.phone && twilioAccountSid && twilioAuthToken && twilioPhone) {
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const smsBody = `Hi ${lead.name}! Your academic dreams await. Book your 15 625 XAF consultation now: ${checkoutUrl} - Power Prestation`;

            await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              },
              body: new URLSearchParams({
                To: lead.phone,
                From: twilioPhone,
                Body: smsBody.substring(0, 160),
              }),
            });
          } catch (smsError) {
            logger.error("SMS follow-up failed", {
              leadId: lead.id,
              message: getErrorMessage(smsError),
            });
          }
        }

        const nextFollowUp = new Date();
        nextFollowUp.setHours(nextFollowUp.getHours() + 24);

        const newFollowUpCount = (lead.follow_up_count ?? 0) + 1;
        const newStatus = newFollowUpCount >= 14 ? "expired" : "follow_up";

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            follow_up_count: newFollowUpCount,
            last_follow_up_at: new Date().toISOString(),
            next_follow_up_at: newFollowUpCount >= 14 ? null : nextFollowUp.toISOString(),
            status: newStatus,
          })
          .eq("id", lead.id);

        if (updateError) {
          throw updateError;
        }

        logger.info("Follow-up processed successfully", {
          leadId: lead.id,
          followUpCount: newFollowUpCount,
          status: newStatus,
        });
        processed += 1;
      } catch (leadError) {
        logger.error("Failed to process follow-up for lead", {
          leadId: lead.id,
          message: getErrorMessage(leadError),
        });
        errors += 1;
      }
    }

    logger.info("Follow-up batch completed", {
      processed,
      errors,
      total: leads.length,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processed} follow-ups`,
      processed,
      errors,
      total: leads.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error("Unhandled send-follow-ups error", {
      message: getErrorMessage(error),
    });
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
