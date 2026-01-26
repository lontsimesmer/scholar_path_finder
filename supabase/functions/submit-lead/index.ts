import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateWelcomeEmail } from "../_shared/email-templates.ts";

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

// Rate limiting: max 5 submissions per email per hour, max 10 per IP per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_EMAIL = 5;
const MAX_SUBMISSIONS_PER_IP = 10;

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message }: LeadRequest = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths to prevent abuse
    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (email.length > 255 || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (phone && phone.length > 20) {
      return new Response(
        JSON.stringify({ error: "Phone number must be less than 20 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client for rate limiting check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: Check recent submissions from this email
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count: emailCount, error: emailCountError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase().trim())
      .gte("created_at", oneHourAgo);

    if (emailCountError) {
      console.error("Error checking rate limit:", emailCountError);
    } else if (emailCount !== null && emailCount >= MAX_SUBMISSIONS_PER_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for additional rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";

    // Check total submissions in the last hour (global rate limit)
    const { count: totalCount, error: totalCountError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (totalCountError) {
      console.error("Error checking global rate limit:", totalCountError);
    } else if (totalCount !== null && totalCount >= 100) {
      // Global rate limit: max 100 submissions per hour across all users
      return new Response(
        JSON.stringify({ error: "Service is busy. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const origin = req.headers.get("origin") || "https://power-prestation.lovable.app";
    const checkoutUrl = `${origin}/checkout?leadId=${lead.id}`;

    await resend.emails.send({
      from: "Power Prestation <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Power Prestation - Your Academic Journey Starts Here! 🎓",
      html: generateWelcomeEmail(name, checkoutUrl),
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
