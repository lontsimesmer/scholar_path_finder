import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message }: LeadRequest = await req.json();

    // Validate input
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate first follow-up time (24 hours from now)
    const nextFollowUp = new Date();
    nextFollowUp.setHours(nextFollowUp.getHours() + 24);

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name,
        email,
        phone,
        message,
        status: "pending",
        next_follow_up_at: nextFollowUp.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save your information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const checkoutUrl = `${req.headers.get("origin")}/checkout?leadId=${lead.id}`;

    await resend.emails.send({
      from: "Power Prestation <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Power Prestation - Your Academic Journey Starts Here!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #5B7FD3, #4A6BC9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .service-card { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #5B7FD3; }
            .pricing { background: #5B7FD3; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .cta-button { display: inline-block; background: #F59E0B; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Power Prestation!</h1>
              <p>Your Academic & Professional Mobility Partner</p>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for reaching out to us! We're excited to help you achieve your academic and professional goals abroad.</p>
              
              <h2>Our Services</h2>
              <div class="service-card">
                <h3>🎓 University & Study Abroad Advice</h3>
                <p>Personalized guidance for selecting the right universities based on your profile and aspirations.</p>
              </div>
              <div class="service-card">
                <h3>💰 Scholarship & Internship Guidance</h3>
                <p>Expert advice on finding and applying for scholarships and internships tailored to your profile.</p>
              </div>
              <div class="service-card">
                <h3>📋 Application Assistance</h3>
                <p>Complete support throughout your application process from start to finish.</p>
              </div>
              <div class="service-card">
                <h3>✈️ Visa & Travel Support</h3>
                <p>Guidance on visa applications and travel preparations for your journey abroad.</p>
              </div>
              
              <div class="pricing">
                <h2>Initial Consultation</h2>
                <h1 style="font-size: 48px; margin: 10px 0;">$25</h1>
                <p>One-time consultation fee to start your journey</p>
              </div>
              
              <p style="text-align: center;">
                <a href="${checkoutUrl}" class="cta-button">Book Your Consultation Now</a>
              </p>
              
              <p>After payment, you'll be connected with a professional consultant for a virtual session to discuss your goals and create your personalized roadmap.</p>
              
              <p>Have questions? Reply to this email or call us at +(237)674819411</p>
              
              <p>Best regards,<br><strong>The Power Prestation Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 Power Prestation. All rights reserved.</p>
              <p>123 Education Street, City</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Send SMS if phone provided
    if (phone) {
      try {
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioAccountSid && twilioAuthToken && twilioPhone) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const smsBody = `Hi ${name}! Welcome to Power Prestation. Check your email for our services & pricing. Book your $25 consultation: ${checkoutUrl}. Questions? Call +(237)674819411`;

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            },
            body: new URLSearchParams({
              To: phone,
              From: twilioPhone,
              Body: smsBody,
            }),
          });
        }
      } catch (smsError) {
        console.error("SMS sending failed:", smsError);
        // Don't fail the whole request if SMS fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in submit-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
