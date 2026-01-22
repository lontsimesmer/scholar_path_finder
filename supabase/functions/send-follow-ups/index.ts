import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const followUpMessages = [
  {
    subject: "Don't miss your opportunity - Power Prestation",
    intro: "We noticed you haven't completed your consultation booking yet.",
    highlight: "Start your academic journey abroad today!",
  },
  {
    subject: "Your dreams await - Schedule your consultation",
    intro: "Thousands of students have achieved their goals with our help.",
    highlight: "Join 250+ successful students!",
  },
  {
    subject: "Limited spots available - Book now",
    intro: "Our consultants have limited availability this month.",
    highlight: "Secure your spot before it's too late!",
  },
  {
    subject: "Scholarship deadlines approaching",
    intro: "Many scholarship applications have upcoming deadlines.",
    highlight: "Don't miss out on funding opportunities!",
  },
  {
    subject: "We're here to help - Power Prestation",
    intro: "Questions about studying abroad? Our experts are ready to assist.",
    highlight: "Get personalized guidance for just $25!",
  },
  {
    subject: "Success stories from our students",
    intro: "See how we've helped students like you achieve their dreams.",
    highlight: "Your success story starts here!",
  },
  {
    subject: "Special reminder - Your consultation awaits",
    intro: "We haven't heard from you in a while.",
    highlight: "We're still here to help you succeed!",
  },
  {
    subject: "One step away from your future",
    intro: "Your academic and professional goals are within reach.",
    highlight: "Take the first step today!",
  },
  {
    subject: "Don't let this opportunity pass",
    intro: "The right guidance can change your life.",
    highlight: "Invest in your future for just $25!",
  },
  {
    subject: "We miss you - Power Prestation",
    intro: "It's been a while since you reached out.",
    highlight: "Your dreams are still achievable!",
  },
  {
    subject: "Your goals matter to us",
    intro: "We genuinely want to see you succeed.",
    highlight: "Let's make your dreams a reality!",
  },
  {
    subject: "Still thinking about studying abroad?",
    intro: "We understand it's a big decision.",
    highlight: "Our experts can help you decide!",
  },
  {
    subject: "Time is running out",
    intro: "Application deadlines wait for no one.",
    highlight: "Start your application journey now!",
  },
  {
    subject: "Final reminder - Power Prestation",
    intro: "This is our last follow-up message.",
    highlight: "We hope to hear from you soon!",
  },
];

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
        const messageIndex = Math.min(lead.follow_up_count, followUpMessages.length - 1);
        const message = followUpMessages[messageIndex];
        const checkoutUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/checkout?leadId=${lead.id}`;
        const origin = req.headers.get("origin") || "https://power-prestation.lovable.app";
        const actualCheckoutUrl = `${origin}/checkout?leadId=${lead.id}`;

        // Send email
        await resend.emails.send({
          from: "Power Prestation <onboarding@resend.dev>",
          to: [lead.email],
          subject: message.subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #5B7FD3, #4A6BC9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .highlight { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
                .cta-button { display: inline-block; background: #F59E0B; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Power Prestation</h1>
                  <p>Your Academic Mobility Partner</p>
                </div>
                <div class="content">
                  <p>Dear ${lead.name},</p>
                  <p>${message.intro}</p>
                  
                  <div class="highlight">
                    <strong>${message.highlight}</strong>
                  </div>
                  
                  <p>Our initial consultation is just <strong>$25</strong> - a small investment for your future success.</p>
                  
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${actualCheckoutUrl}" class="cta-button">Book Your Consultation</a>
                  </p>
                  
                  <p>What you'll get:</p>
                  <ul>
                    <li>Personalized university recommendations</li>
                    <li>Scholarship opportunities matching your profile</li>
                    <li>Application timeline and strategy</li>
                    <li>Expert guidance on visa processes</li>
                  </ul>
                  
                  <p>Have questions? Reply to this email or call +(237)674819411</p>
                  
                  <p>Best regards,<br><strong>The Power Prestation Team</strong></p>
                </div>
                <div class="footer">
                  <p>© 2024 Power Prestation. All rights reserved.</p>
                  <p>If you no longer wish to receive these emails, your follow-up period will end automatically after 2 weeks.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        // Send SMS if phone exists
        if (lead.phone && twilioAccountSid && twilioAuthToken && twilioPhone) {
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const smsBody = `${message.intro} ${message.highlight} Book now for just $25: ${actualCheckoutUrl}`;

            await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              },
              body: new URLSearchParams({
                To: lead.phone,
                From: twilioPhone,
                Body: smsBody.substring(0, 160), // SMS character limit
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
