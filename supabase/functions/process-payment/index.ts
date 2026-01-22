import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  leadId: string;
  paypalOrderId: string;
  paymentDetails: {
    id: string;
    status: string;
    payer: {
      email_address: string;
      name: {
        given_name: string;
        surname: string;
      };
    };
    purchase_units: Array<{
      amount: {
        value: string;
        currency_code: string;
      };
    }>;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, paypalOrderId, paymentDetails }: PaymentRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update lead status
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_id: paypalOrderId,
        next_follow_up_at: null, // Stop follow-ups
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Error updating lead:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send receipt email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const amount = paymentDetails.purchase_units?.[0]?.amount?.value || "25.00";
    const currency = paymentDetails.purchase_units?.[0]?.amount?.currency_code || "USD";

    await resend.emails.send({
      from: "Power Prestation <onboarding@resend.dev>",
      to: [lead.email],
      subject: "Payment Confirmed - Welcome to Power Prestation Consultation!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22C55E, #16A34A); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-size: 24px; font-weight: bold; color: #22C55E; }
            .next-steps { background: #5B7FD3; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Confirmed!</h1>
              <p>Your consultation is now scheduled</p>
            </div>
            <div class="content">
              <p>Dear ${lead.name},</p>
              <p>Thank you for your payment! Your registration for Power Prestation consultation services is now complete.</p>
              
              <div class="receipt">
                <h2 style="margin-top: 0;">Payment Receipt</h2>
                <div class="receipt-row">
                  <span>Transaction ID:</span>
                  <span>${paypalOrderId}</span>
                </div>
                <div class="receipt-row">
                  <span>Date:</span>
                  <span>${new Date().toLocaleDateString()}</span>
                </div>
                <div class="receipt-row">
                  <span>Service:</span>
                  <span>Initial Consultation</span>
                </div>
                <div class="receipt-row" style="border-bottom: none;">
                  <span>Amount Paid:</span>
                  <span class="total">${currency} ${amount}</span>
                </div>
              </div>
              
              <div class="next-steps">
                <h2 style="margin-top: 0;">What's Next?</h2>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>A professional consultant will contact you within 24-48 hours</li>
                  <li>You'll receive a calendar invite for your virtual consultation</li>
                  <li>Prepare any questions about your academic/professional goals</li>
                  <li>Have your academic documents ready for review</li>
                </ol>
              </div>
              
              <p>If you have any immediate questions, don't hesitate to reach out:</p>
              <ul>
                <li>Email: contact@powerprestation.com</li>
                <li>Phone: +(237)674819411</li>
              </ul>
              
              <p>We're excited to help you achieve your dreams!</p>
              
              <p>Best regards,<br><strong>The Power Prestation Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 Power Prestation. All rights reserved.</p>
              <p>This receipt is for your records.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Send SMS receipt if phone exists
    if (lead.phone) {
      try {
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioAccountSid && twilioAuthToken && twilioPhone) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const smsBody = `Payment confirmed! Thank you ${lead.name}. Your Power Prestation consultation is booked. A consultant will contact you within 24-48hrs. Receipt sent to your email.`;

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            },
            body: new URLSearchParams({
              To: lead.phone,
              From: twilioPhone,
              Body: smsBody,
            }),
          });
        }
      } catch (smsError) {
        console.error("SMS sending failed:", smsError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment processed successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
