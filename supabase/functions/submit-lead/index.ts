import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { createAnonClient, normalizeEmail } from "../_shared/auth-utils.ts";
import { generateWelcomeEmail } from "../_shared/email-templates.ts";
import { escapeHtml } from "../_shared/html-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  password?: string;
}

type EmailDeliveryInput = {
  subject: string;
  to: string[];
  html: string;
  from?: string;
  replyTo?: string;
};

type AuthenticatedUser = {
  id: string;
  email: string;
};

type LeadRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
};

type AccountStatus = "authenticated" | "created" | "existing_requires_sign_in" | "none";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_EMAIL = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RESUMABLE_PAYMENT_STATUSES = new Set([
  "unpaid",
  "pending",
  "mobile_money_pending",
  "bank_transfer_pending",
  "refunded",
]);

const logger = createLogger("SUBMIT-LEAD");

const getAuthenticatedUserFromRequest = async (req: Request): Promise<AuthenticatedUser | null> => {
  const authorization = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authorization.replace("Bearer ", "").trim();
    if (!token) {
      return null;
    }

    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.getUser(token);
    if (error || !data.user?.email) {
      return null;
    }

    return {
      id: data.user.id,
      email: normalizeEmail(data.user.email),
    };
  } catch {
    return null;
  }
};

const sendEmailIfConfigured = async (
  input: EmailDeliveryInput,
  logContext: { emailType: "welcome" | "admin_notification"; leadId: string },
) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logger.warn("Skipping email because RESEND_API_KEY is missing", logContext);
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: input.from ?? "Power Prestation <noreply@powerprestation.ca>",
      replyTo: input.replyTo,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    logger.info("Email sent", logContext);
  } catch (error: unknown) {
    logger.error("Email delivery failed", {
      ...logContext,
      message: getErrorMessage(error),
    });
  }
};

const isExistingUserConflict = (message: string) => {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("user already registered")
  );
};

const resolveLeadForEmail = async (
  supabase: ReturnType<typeof createClient>,
  input: { name: string; email: string; phone?: string; message: string; canRefreshExistingLead: boolean },
) => {
  const { data: existingLeads, error: existingLeadsError } = await supabase
    .from("leads")
    .select("id, name, email, phone, message, status, payment_status, created_at, updated_at")
    .eq("email", input.email)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (existingLeadsError) {
    throw new Error(`Failed to load existing leads: ${existingLeadsError.message}`);
  }

  const typedExistingLeads = (existingLeads as LeadRecord[] | null) ?? [];
  const resumableLead =
    typedExistingLeads.find((lead) =>
      RESUMABLE_PAYMENT_STATUSES.has(lead.payment_status ?? "unpaid"),
    ) ?? null;

  if (resumableLead && input.canRefreshExistingLead) {
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        name: input.name,
        phone: input.phone ?? null,
        message: input.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumableLead.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to refresh the existing lead: ${updateError.message}`);
    }

    return {
      lead: updatedLead as LeadRecord,
      reused: true,
      alreadyActive: false,
    };
  }

  if (resumableLead) {
    return {
      lead: resumableLead,
      reused: true,
      alreadyActive: false,
    };
  }

  const latestLead = typedExistingLeads[0] ?? null;
  if (latestLead) {
    return {
      lead: latestLead,
      reused: true,
      alreadyActive: latestLead.payment_status === "paid",
    };
  }

  const nextFollowUp = new Date();
  nextFollowUp.setHours(nextFollowUp.getHours() + 24);

  const { data: insertedLead, error: insertError } = await supabase
    .from("leads")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      status: "pending",
      next_follow_up_at: nextFollowUp.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to save your information: ${insertError.message}`);
  }

  return {
    lead: insertedLead as LeadRecord,
    reused: false,
    alreadyActive: false,
  };
};

const syncStudentProfileContact = async (
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string | null;
    email: string;
    fullName: string;
    phone?: string;
  },
) => {
  if (!input.userId) {
    return;
  }

  const { error } = await supabase.from("student_profiles").upsert(
    {
      id: input.userId,
      email: input.email,
      full_name: input.fullName,
      phone_number: input.phone ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(`Failed to synchronize the student profile contact details: ${error.message}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message, password }: LeadRequest = await req.json();
    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone?.trim() || undefined;
    const normalizedMessage = message.trim();
    const normalizedPassword = password?.trim() || "";
    const authenticatedUser = await getAuthenticatedUserFromRequest(req);

    logger.info("Lead submission received", {
      hasPhone: Boolean(normalizedPhone),
      hasPassword: normalizedPassword.length > 0,
      hasAuthenticatedUser: Boolean(authenticatedUser),
      origin: req.headers.get("origin") || null,
    });

    if (!normalizedName || !normalizedEmail || !normalizedMessage) {
      logger.warn("Lead submission rejected because required fields are missing", {
        hasName: Boolean(normalizedName),
        hasEmail: Boolean(normalizedEmail),
        hasMessage: Boolean(normalizedMessage),
      });
      return new Response(JSON.stringify({ error: "Name, email, and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedName.length > 100) {
      logger.warn("Lead submission rejected because name is too long", { length: normalizedName.length });
      return new Response(JSON.stringify({ error: "Name must be less than 100 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedEmail.length > 255 || !EMAIL_REGEX.test(normalizedEmail)) {
      logger.warn("Lead submission rejected because email is invalid");
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedPhone && normalizedPhone.length > 20) {
      logger.warn("Lead submission rejected because phone is too long", { length: normalizedPhone.length });
      return new Response(JSON.stringify({ error: "Phone number must be less than 20 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedMessage.length > 2000) {
      logger.warn("Lead submission rejected because message is too long", { length: normalizedMessage.length });
      return new Response(JSON.stringify({ error: "Message must be less than 2000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authenticatedUser && normalizedPassword.length > 0 && normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      logger.warn("Lead submission rejected because password is too short");
      return new Response(
        JSON.stringify({ error: `Password must contain at least ${MIN_PASSWORD_LENGTH} characters` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count: emailCount, error: emailCountError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", oneHourAgo);

    if (emailCountError) {
      logger.error("Failed to check per-email rate limit", {
        message: emailCountError.message,
      });
    } else if (emailCount !== null && emailCount >= MAX_SUBMISSIONS_PER_EMAIL) {
      logger.warn("Lead submission blocked by per-email rate limit", { emailCount });
      return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: totalCount, error: totalCountError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (totalCountError) {
      logger.error("Failed to check global rate limit", {
        message: totalCountError.message,
      });
    } else if (totalCount !== null && totalCount >= 100) {
      logger.warn("Lead submission blocked by global rate limit", { totalCount });
      return new Response(JSON.stringify({ error: "Service is busy. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (authenticatedUser && authenticatedUser.email !== normalizedEmail) {
      logger.warn("Lead submission rejected because the authenticated email does not match", {
        authenticatedEmail: authenticatedUser.email,
        submittedEmail: normalizedEmail,
      });
      return new Response(
        JSON.stringify({
          error: "You are signed in with another account. Use the same email or sign out first.",
          code: "AUTH_EMAIL_MISMATCH",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let accountStatus: AccountStatus = authenticatedUser ? "authenticated" : "none";
    let profileOwnerId: string | null = authenticatedUser?.id ?? null;

    if (!authenticatedUser && normalizedPassword) {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedName,
          onboarding_source: "procedure_submit",
        },
      });

      if (createUserError) {
        if (isExistingUserConflict(createUserError.message)) {
          accountStatus = "existing_requires_sign_in";
          logger.info("Procedure submission detected an existing account", { email: normalizedEmail });
        } else {
          throw new Error(`Failed to create the account: ${createUserError.message}`);
        }
      } else if (createdUser.user) {
        accountStatus = "created";
        profileOwnerId = createdUser.user.id;
        logger.info("Procedure submission created a new account", {
          email: normalizedEmail,
          userId: createdUser.user.id,
        });
      }
    }

    await syncStudentProfileContact(supabase, {
      userId: profileOwnerId,
      email: normalizedEmail,
      fullName: normalizedName,
      phone: normalizedPhone,
    });

    const leadResolution = await resolveLeadForEmail(supabase, {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      message: normalizedMessage,
      canRefreshExistingLead:
        accountStatus === "authenticated" || accountStatus === "created" || accountStatus === "none",
    });
    const lead = leadResolution.lead;

    logger.info(leadResolution.reused ? "Lead reused" : "Lead created", {
      leadId: lead.id,
      accountStatus,
      alreadyActive: leadResolution.alreadyActive,
    });

    const origin = req.headers.get("origin") || "https://power-prestation.lovable.app";
    const checkoutUrl = `${origin}/checkout?leadId=${lead.id}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmailIfConfigured(
      {
        to: [normalizedEmail],
        replyTo: "powerprestationint@gmail.com",
        subject: "Welcome to Power Prestation - Your Academic Journey Starts Here!",
        html: generateWelcomeEmail(normalizedName, checkoutUrl),
      },
      { emailType: "welcome", leadId: lead.id },
    );

    const adminNotificationRecipient =
      Deno.env.get("ADMIN_NOTIFICATION_EMAIL")?.trim() || "powerprestationint@gmail.com";

    await sendEmailIfConfigured(
      {
        to: [adminNotificationRecipient],
        subject: `New Lead: ${escapeHtml(normalizedName)}`,
        html: `
          <h2>New Lead Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(normalizedName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(normalizedEmail)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(normalizedPhone || "Not provided")}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(normalizedMessage)}</p>
          <hr>
          <p><a href="${checkoutUrl}">View Checkout Link</a></p>
        `,
      },
      { emailType: "admin_notification", leadId: lead.id },
    );

    if (normalizedPhone) {
      try {
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioAccountSid && twilioAuthToken && twilioPhone) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const smsBody = `Hi ${normalizedName}! Welcome to Power Prestation. Check your email for our services & pricing. Book your 15 625 XAF consultation: ${checkoutUrl}. Questions? Call +(237)674819411`;

          const smsResponse = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            },
            body: new URLSearchParams({
              To: normalizedPhone,
              From: twilioPhone,
              Body: smsBody,
            }),
          });

          if (smsResponse.ok) {
            logger.info("Welcome SMS sent", { leadId: lead.id });
          } else {
            logger.warn("Welcome SMS request returned a non-success response", {
              leadId: lead.id,
              status: smsResponse.status,
            });
          }
        }
      } catch (smsError: unknown) {
        logger.error("Welcome SMS sending failed", {
          leadId: lead.id,
          message: getErrorMessage(smsError),
        });
      }
    }

    logger.info("Lead submission completed", { leadId: lead.id });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        accountStatus,
        leadReused: leadResolution.reused,
        alreadyActive: leadResolution.alreadyActive,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    logger.error("Unhandled submit-lead error", {
      message: getErrorMessage(error),
    });

    return new Response(JSON.stringify({ error: "Failed to process your request. Please try again later." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
