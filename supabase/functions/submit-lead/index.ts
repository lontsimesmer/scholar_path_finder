import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { normalizeEmail, tryGetAuthenticatedUser } from "../_shared/auth-utils.ts";
import {
  buildVerificationAccessToken,
  type VerificationChannel,
  requiresContactVerification,
  resolveVerificationChannels,
  upsertStudentContactVerification,
} from "../_shared/contact-verification.ts";
import { generateWelcomeEmail } from "../_shared/email-templates.ts";
import { escapeHtml } from "../_shared/html-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";
import {
  getPhoneNumberComparisonKey,
  normalizePhoneNumber,
} from "../_shared/phone-utils.ts";
import { enforceRequestRateLimit, getClientAddress } from "../_shared/request-throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
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

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUniqueViolationError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

const isStudentPhoneUniqueViolation = (error: unknown) => {
  if (!isUniqueViolationError(error)) {
    return false;
  }

  if (!("message" in error) || typeof error.message !== "string") {
    return false;
  }

  return error.message.includes("student_profiles_phone_number_unique_idx");
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

const trimValue = (value: string | null | undefined) => value?.trim() ?? "";

const buildFullName = (firstName: string, lastName: string) =>
  [trimValue(firstName), trimValue(lastName)].filter(Boolean).join(" ").trim();

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
    firstName?: string;
    lastName?: string;
    phone?: string;
  },
) => {
  if (!input.userId) {
    return;
  }

  const profilePayload: Record<string, string | null> = {
    id: input.userId,
    email: input.email,
    phone_number: normalizePhoneNumber(input.phone),
    updated_at: new Date().toISOString(),
  };

  if (typeof input.firstName === "string") {
    profilePayload.first_name = trimValue(input.firstName) || null;
  }

  if (typeof input.lastName === "string") {
    profilePayload.last_name = trimValue(input.lastName) || null;
  }

  const { error } = await supabase.from("student_profiles").upsert(
    profilePayload,
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }
};

const ensureUniqueStudentPhoneNumber = async (
  supabase: ReturnType<typeof createClient>,
  input: {
    phone: string | null | undefined;
    userId: string | null;
  },
) => {
  const submittedPhoneKey = getPhoneNumberComparisonKey(input.phone);
  if (!submittedPhoneKey) {
    return;
  }

  const { data: profiles, error } = await supabase
    .from("student_profiles")
    .select("id, phone_number")
    .not("phone_number", "is", null);

  if (error) {
    throw new Error(`Failed to validate phone number uniqueness: ${error.message}`);
  }

  const conflictingProfile = (profiles ?? []).find((profile) => {
    if (!profile?.id || profile.id === input.userId) {
      return false;
    }

    return getPhoneNumberComparisonKey(profile.phone_number) === submittedPhoneKey;
  });

  if (conflictingProfile) {
    throw new Error("PHONE_ALREADY_USED");
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, firstName, lastName, email, phone, message, password }: LeadRequest = await req.json();
    const normalizedFirstName = trimValue(firstName);
    const normalizedLastName = trimValue(lastName);
    const normalizedName = buildFullName(normalizedFirstName, normalizedLastName) || trimValue(name);
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedMessage = message.trim();
    const normalizedPassword = password?.trim() || "";
    const authenticatedUser = await tryGetAuthenticatedUser(req);

    logger.info("Lead submission received", {
      hasFirstName: Boolean(normalizedFirstName),
      hasLastName: Boolean(normalizedLastName),
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
      return jsonResponse({ error: "Name, email, and message are required" }, 400);
    }

    if ((normalizedFirstName && !normalizedLastName) || (!normalizedFirstName && normalizedLastName)) {
      logger.warn("Lead submission rejected because first name or last name is missing", {
        hasFirstName: Boolean(normalizedFirstName),
        hasLastName: Boolean(normalizedLastName),
      });
      return jsonResponse({ error: "First name and last name are required together" }, 400);
    }

    if (normalizedName.length > 100) {
      logger.warn("Lead submission rejected because name is too long", { length: normalizedName.length });
      return jsonResponse({ error: "Name must be less than 100 characters" }, 400);
    }

    if (normalizedEmail.length > 255 || !EMAIL_REGEX.test(normalizedEmail)) {
      logger.warn("Lead submission rejected because email is invalid");
      return jsonResponse({ error: "Invalid email address" }, 400);
    }

    if (phone && !normalizedPhone) {
      logger.warn("Lead submission rejected because phone is invalid");
      return jsonResponse({ error: "Invalid phone number", code: "INVALID_PHONE_NUMBER" }, 400);
    }

    if (normalizedPhone && normalizedPhone.length > 20) {
      logger.warn("Lead submission rejected because phone is too long", { length: normalizedPhone.length });
      return jsonResponse({ error: "Phone number must be less than 20 characters" }, 400);
    }

    if (normalizedMessage.length > 2000) {
      logger.warn("Lead submission rejected because message is too long", { length: normalizedMessage.length });
      return jsonResponse({ error: "Message must be less than 2000 characters" }, 400);
    }

    if (!authenticatedUser && normalizedPassword.length > 0 && normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      logger.warn("Lead submission rejected because password is too short");
      return jsonResponse(
        { error: `Password must contain at least ${MIN_PASSWORD_LENGTH} characters` },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const clientIp = getClientAddress(req);

    const ipRateLimit = await enforceRequestRateLimit(supabase, {
      scope: "submit_lead:ip",
      bucketKey: clientIp,
      maxRequests: 20,
      windowSeconds: 60 * 60,
      metadata: {
        email: normalizedEmail,
      },
    });

    if (!ipRateLimit.allowed) {
      logger.warn("Lead submission blocked by IP rate limit", { clientIp });
      return jsonResponse({ error: "Too many submissions. Please try again later." }, 429);
    }

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
      return jsonResponse({ error: "Too many submissions. Please try again later." }, 429);
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
      return jsonResponse({ error: "Service is busy. Please try again later." }, 429);
    }
    if (authenticatedUser && authenticatedUser.email !== normalizedEmail) {
      logger.warn("Lead submission rejected because the authenticated email does not match", {
        authenticatedEmail: authenticatedUser.email,
        submittedEmail: normalizedEmail,
      });
      return jsonResponse(
        {
          error: "You are signed in with another account. Use the same email or sign out first.",
          code: "AUTH_EMAIL_MISMATCH",
        },
        409,
      );
    }

    let accountStatus: AccountStatus = authenticatedUser ? "authenticated" : "none";
    let profileOwnerId: string | null = authenticatedUser?.id ?? null;
    let verificationChannels: VerificationChannel[] = [];
    let verificationAccessToken: string | null = null;

    if (!authenticatedUser && normalizedPassword) {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedPassword,
        email_confirm: true,
        user_metadata: {
          first_name: normalizedFirstName || undefined,
          last_name: normalizedLastName || undefined,
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

    try {
      await ensureUniqueStudentPhoneNumber(supabase, {
        phone: normalizedPhone,
        userId: profileOwnerId,
      });

      await syncStudentProfileContact(supabase, {
        userId: profileOwnerId,
        email: normalizedEmail,
        firstName: normalizedFirstName || undefined,
        lastName: normalizedLastName || undefined,
        phone: normalizedPhone,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "PHONE_ALREADY_USED") {
        return jsonResponse(
          {
            error: "This phone number is already linked to another account.",
            code: "PHONE_ALREADY_USED",
          },
          409,
        );
      }

      if (isStudentPhoneUniqueViolation(error)) {
        return jsonResponse(
          {
            error: "This phone number is already linked to another account.",
            code: "PHONE_ALREADY_USED",
          },
          409,
        );
      }

      throw error;
    }

    if (accountStatus === "created" && profileOwnerId) {
      verificationChannels = resolveVerificationChannels({
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
      });

      if (requiresContactVerification(verificationChannels)) {
        await upsertStudentContactVerification(supabase, {
          userId: profileOwnerId,
          email: normalizedEmail,
          phoneNumber: normalizedPhone,
          requiredChannels: verificationChannels,
        });

        verificationAccessToken = await buildVerificationAccessToken({
          userId: profileOwnerId,
          email: normalizedEmail,
          phoneNumber: normalizedPhone,
          channels: verificationChannels,
        });
      }
    }

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

    const siteUrl = Deno.env.get("SITE_URL")?.trim() || "http://127.0.0.1:8080";
    const checkoutUrl = `${siteUrl.replace(/\/+$/g, "")}/checkout?leadId=${lead.id}&email=${encodeURIComponent(normalizedEmail)}`;

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

    return jsonResponse(
      {
        success: true,
        leadId: lead.id,
        accountStatus,
        leadReused: leadResolution.reused,
        alreadyActive: leadResolution.alreadyActive,
        verificationRequired: requiresContactVerification(verificationChannels),
        verificationChannels,
        verificationEmail: requiresContactVerification(verificationChannels) ? normalizedEmail : null,
        verificationAccessToken,
      },
      200,
    );
  } catch (error: unknown) {
    logger.error("Unhandled submit-lead error", {
      message: getErrorMessage(error),
    });

    return jsonResponse({ error: "Failed to process your request. Please try again later." }, 500);
  }
};

serve(handler);
