import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, tryGetAuthenticatedUser } from "../_shared/auth-utils.ts";
import {
  canSendBrevoEmail,
  canSendBrevoSms,
  sendBrevoTransactionalEmail,
  sendBrevoTransactionalSms,
} from "../_shared/brevo.ts";
import {
  buildVerificationExpiryIso,
  generateVerificationCode,
  getContactVerificationSettings,
  getMaskedDestination,
  getPendingVerificationChannels,
  hashVerificationCode,
  loadStudentContactVerification,
  requiresContactVerification,
  resolveVerificationChannels,
  selectNextPendingChannel,
  type VerificationChannel,
  upsertStudentContactVerification,
  verifyVerificationAccessToken,
} from "../_shared/contact-verification.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";
import { enforceRequestRateLimit, getClientAddress } from "../_shared/request-throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("SEND-CONTACT-VERIFICATION-CODE");

type RequestPayload = {
  token?: string;
  channel?: VerificationChannel;
  requestedChannels?: VerificationChannel[] | null;
  locale?: string | null;
  purpose?: string | null;
};

type ChallengeRow = {
  id: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isVerificationChannel = (value: unknown): value is VerificationChannel =>
  value === "email" || value === "sms";

const getRequestedChannels = (value: unknown): VerificationChannel[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const channels = value.filter(isVerificationChannel);
  return channels.length ? channels : null;
};

const buildEmailCopy = (locale: string | null | undefined, code: string, minutes: number) => {
  if ((locale ?? "").toLowerCase().startsWith("fr")) {
    return {
      subject: "Votre code de verification Power Prestation",
      text: `Bonjour,\n\nVotre code de verification Power Prestation est ${code}.\nIl expire dans ${minutes} minute(s).\n\nSi vous n'etes pas a l'origine de cette demande, ignorez ce message.`,
      html: `<p>Bonjour,</p><p>Votre code de verification Power Prestation est <strong>${code}</strong>.</p><p>Il expire dans ${minutes} minute(s).</p><p>Si vous n'etes pas a l'origine de cette demande, ignorez ce message.</p>`,
    };
  }

  return {
    subject: "Your Power Prestation verification code",
    text: `Hello,\n\nYour Power Prestation verification code is ${code}.\nIt expires in ${minutes} minute(s).\n\nIf you did not request this code, please ignore this message.`,
    html: `<p>Hello,</p><p>Your Power Prestation verification code is <strong>${code}</strong>.</p><p>It expires in ${minutes} minute(s).</p><p>If you did not request this code, please ignore this message.</p>`,
  };
};

const buildSmsCopy = (locale: string | null | undefined, code: string, minutes: number) => {
  if ((locale ?? "").toLowerCase().startsWith("fr")) {
    return `Power Prestation: votre code de verification est ${code}. Il expire dans ${minutes} min.`;
  }

  return `Power Prestation: your verification code is ${code}. It expires in ${minutes} min.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as RequestPayload;
    const token = payload.token?.trim() || "";
    const requestedChannels = getRequestedChannels(payload.requestedChannels);
    const requestedChannel = isVerificationChannel(payload.channel) ? payload.channel : null;

    if (!requestedChannel) {
      return jsonResponse({ error: "channel is required" }, 400);
    }

    const settings = getContactVerificationSettings();
    if (!settings.enabled) {
      return jsonResponse({
        enabled: false,
        skipped: true,
        verificationRequired: false,
        channel: requestedChannel,
      });
    }

    const supabase = createServiceRoleClient();
    const authenticatedUser = await tryGetAuthenticatedUser(req);
    if (!authenticatedUser && !token) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }
    const verifiedToken = authenticatedUser ? null : await verifyVerificationAccessToken(token);
    const userId = authenticatedUser?.id ?? verifiedToken?.userId ?? "";

    if (!userId) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }

    const clientIp = getClientAddress(req);
    const ipRateLimit = await enforceRequestRateLimit(supabase, {
      scope: "contact_verification_send:ip",
      bucketKey: clientIp,
      maxRequests: 12,
      windowSeconds: 30 * 60,
      metadata: {
        userId,
        channel: requestedChannel,
      },
    });

    if (!ipRateLimit.allowed) {
      return jsonResponse({ error: "Too many verification requests. Please try again later." }, 429);
    }

    const userRateLimit = await enforceRequestRateLimit(supabase, {
      scope: `contact_verification_send:user:${requestedChannel}`,
      bucketKey: userId,
      maxRequests: 6,
      windowSeconds: 30 * 60,
      metadata: {
        clientIp,
      },
    });

    if (!userRateLimit.allowed) {
      return jsonResponse({ error: "Too many verification requests. Please try again later." }, 429);
    }

    let verificationRow = await loadStudentContactVerification(supabase, userId);

    if (!verificationRow) {
      const requiredChannels = resolveVerificationChannels({
        email: verifiedToken?.email,
        phoneNumber: verifiedToken?.phoneNumber,
        requestedChannels,
      });

      if (!requiresContactVerification(requiredChannels)) {
        return jsonResponse({
          enabled: true,
          skipped: true,
          verificationRequired: false,
          channel: requestedChannel,
        });
      }

      verificationRow = await upsertStudentContactVerification(supabase, {
        userId,
        email: verifiedToken?.email,
        phoneNumber: verifiedToken?.phoneNumber,
        requiredChannels,
      });
    } else if (verifiedToken?.channels.length || requestedChannels?.length) {
      if (
        verifiedToken &&
        ((verifiedToken.email && verificationRow.email && verifiedToken.email !== verificationRow.email) ||
          (verifiedToken.phoneNumber &&
            verificationRow.phone_number &&
            verifiedToken.phoneNumber !== verificationRow.phone_number))
      ) {
        return jsonResponse({ error: "Verification session no longer matches the stored contact details" }, 409);
      }

      const existingRequiredChannels: VerificationChannel[] = [];
      if (verificationRow.email_verification_required) {
        existingRequiredChannels.push("email");
      }
      if (verificationRow.sms_verification_required) {
        existingRequiredChannels.push("sms");
      }

      const mergedRequiredChannels = Array.from(
        new Set([
          ...existingRequiredChannels,
          ...resolveVerificationChannels({
            email: verificationRow.email,
            phoneNumber: verificationRow.phone_number,
            requestedChannels: verifiedToken?.channels.length ? verifiedToken.channels : requestedChannels,
          }),
        ]),
      );

      if (verifiedToken) {
        verificationRow = await upsertStudentContactVerification(supabase, {
          userId,
          email: verificationRow.email,
          phoneNumber: verificationRow.phone_number,
          requiredChannels: mergedRequiredChannels,
        });
      }
    }

    const pendingChannels = getPendingVerificationChannels(verificationRow);
    const currentChannel =
      pendingChannels.includes(requestedChannel)
        ? requestedChannel
        : selectNextPendingChannel(pendingChannels, requestedChannels);

    if (!currentChannel) {
      return jsonResponse({
        enabled: true,
        verificationRequired: true,
        alreadyVerified: true,
        channel: requestedChannel,
        pendingChannels,
      });
    }

    const maskedDestination = getMaskedDestination(currentChannel, verificationRow);
    if (!maskedDestination) {
      return jsonResponse({ error: "No destination is available for this verification channel" }, 400);
    }

    const { data: recentChallengeData, error: recentChallengeError } = await supabase
      .from("student_contact_verification_challenges")
      .select("id, created_at, expires_at, consumed_at")
      .eq("user_id", userId)
      .eq("channel", currentChannel)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentChallengeError) {
      throw new Error(`Failed to inspect the latest verification challenge: ${recentChallengeError.message}`);
    }

    const recentChallenge = (recentChallengeData as ChallengeRow | null) ?? null;
    if (recentChallenge) {
      const cooldownUntil =
        new Date(recentChallenge.created_at).getTime() + settings.resendCooldownSeconds * 1000;
      const cooldownRemainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);

      if (cooldownRemainingSeconds > 0) {
        return jsonResponse({
          enabled: true,
          verificationRequired: true,
          channel: currentChannel,
          challengeId: recentChallenge.id,
          expiresAt: recentChallenge.expires_at,
          maskedDestination,
          resent: false,
          cooldownSeconds: cooldownRemainingSeconds,
        });
      }
    }

    if (currentChannel === "email" && !canSendBrevoEmail()) {
      return jsonResponse({ error: "Brevo email is not configured", code: "EMAIL_DELIVERY_DISABLED" }, 503);
    }

    if (currentChannel === "sms" && !canSendBrevoSms()) {
      return jsonResponse({ error: "Brevo SMS is not configured", code: "SMS_DELIVERY_DISABLED" }, 503);
    }

    const code = generateVerificationCode();
    const codeHash = await hashVerificationCode({
      userId,
      channel: currentChannel,
      code,
    });
    const expiresAt = buildVerificationExpiryIso();

    const { data: challengeData, error: challengeError } = await supabase
      .from("student_contact_verification_challenges")
      .insert({
        user_id: userId,
        channel: currentChannel,
        code_hash: codeHash,
        email: verificationRow.email,
        phone_number: verificationRow.phone_number,
        expires_at: expiresAt,
        max_attempts: settings.maxAttempts,
        metadata: {
          purpose: payload.purpose?.trim() || "account_verification",
        },
      })
      .select("id")
      .single();

    if (challengeError || !challengeData?.id) {
      throw new Error(`Failed to create the verification challenge: ${challengeError?.message ?? "Unknown error"}`);
    }

    if (currentChannel === "email") {
      const emailCopy = buildEmailCopy(payload.locale, code, settings.codeTtlMinutes);
      await sendBrevoTransactionalEmail({
        to: [{ email: verificationRow.email ?? "" }],
        subject: emailCopy.subject,
        htmlContent: emailCopy.html,
        textContent: emailCopy.text,
      });
    } else {
      await sendBrevoTransactionalSms({
        recipient: verificationRow.phone_number ?? "",
        content: buildSmsCopy(payload.locale, code, settings.codeTtlMinutes),
        tag: "contact_verification",
      });
    }

    logger.info("Verification code sent", {
      userId,
      channel: currentChannel,
    });

    return jsonResponse({
      enabled: true,
      verificationRequired: true,
      channel: currentChannel,
      challengeId: challengeData.id,
      expiresAt,
      maskedDestination,
      resent: true,
      cooldownSeconds: settings.resendCooldownSeconds,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "Invalid verification access token") {
      return jsonResponse({ error: message }, 401);
    }

    if (message === "Expired verification access token") {
      return jsonResponse({ error: message }, 410);
    }

    logger.error("Failed to send the contact verification code", { message });
    return jsonResponse({ error: message }, 500);
  }
});
