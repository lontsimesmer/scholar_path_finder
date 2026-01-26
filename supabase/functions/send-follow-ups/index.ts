import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateNurturingEmail, nurturingSubjects } from "../submit-lead/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get leads that need follow-up
    const now = new Date().toISOString();
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "pending")
      .eq("payment_status", "unpaid")
      .lt("next_follow_up_at", now)
      .lt("follow_up_count", 14) // Max 14 follow-ups (2 weeks)
      .order("next_follow_up_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching leads:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch leads" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No follow-ups needed", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    let processed = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const dayNumber = lead.follow_up_count + 1;
        const subjectIndex = (dayNumber - 1) % nurturingSubjects.length;
        const subject = nurturingSubjects[subjectIndex];
        const origin = "https://power-prestation.lovable.app";
        const checkoutUrl = `${origin}/checkout?leadId=${lead.id}`;

        // Send styled nurturing email
        await resend.emails.send({
          from: "Power Prestation <onboarding@resend.dev>",
          to: [lead.email],
          subject: subject,
          html: generateNurturingEmail(lead.name, checkoutUrl, dayNumber),
        });

        // Send SMS if phone exists
        if (lead.phone && twilioAccountSid && twilioAuthToken && twilioPhone) {
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const smsBody = `Hi ${lead.name}! Your academic dreams await. Book your $25 consultation now: ${checkoutUrl} - Power Prestation`;

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
            console.error("SMS failed for lead:", lead.id, smsError);
          }
        }

        // Update lead follow-up count and next follow-up time
        const nextFollowUp = new Date();
        nextFollowUp.setHours(nextFollowUp.getHours() + 24);

        const newFollowUpCount = lead.follow_up_count + 1;
        const newStatus = newFollowUpCount >= 14 ? "expired" : "follow_up";

        await supabase
          .from("leads")
          .update({
            follow_up_count: newFollowUpCount,
            last_follow_up_at: new Date().toISOString(),
            next_follow_up_at: newFollowUpCount >= 14 ? null : nextFollowUp.toISOString(),
            status: newStatus,
          })
          .eq("id", lead.id);

        processed++;
      } catch (leadError) {
        console.error("Error processing lead:", lead.id, leadError);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processed} follow-ups`,
        processed,
        errors,
        total: leads.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-follow-ups:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
