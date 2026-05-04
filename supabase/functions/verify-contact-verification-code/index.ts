import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, tryGetAuthenticatedUser } from "../_shared/auth-utils.ts";
import {
  getCompletedVerificationChannels,
  getContactVerificationSettings,
  getPendingVerificationChannels,
  hashVerificationCode,
  loadStudentContactVerification,
  type VerificationChannel,
  verifyVerificationAccessToken,
} from "../_shared/contact-verification.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";
import { enforceRequestRateLimit, getClientAddress } from "../_shared/request-throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("VERIFY-CONTACT-VERIFICATION-CODE");

type RequestPayload = {
  challengeId?: string;
  code?: string;
  token?: string;
};

type ChallengeRow = {
  id: string;
  user_id: string;
  channel: VerificationChannel;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempts_count: number;
  max_attempts: number;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as RequestPayload;
    const challengeId = payload.challengeId?.trim();
    const code = payload.code?.trim() ?? "";
    const token = payload.token?.trim() || "";

    if (!challengeId || !/^\d{6}$/.test(code)) {
      return jsonResponse({ error: "A valid challengeId and 6-digit code are required" }, 400);
    }

    const settings = getContactVerificationSettings();
    if (!settings.enabled) {
      return jsonResponse({ enabled: false, verificationRequired: false, skipped: true });
    }

    const supabase = createServiceRoleClient();
    const authenticatedUser = await tryGetAuthenticatedUser(req);
    if (!authenticatedUser && !token) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }
    const verifiedToken = authenticatedUser ? null : await verifyVerificationAccessToken(token);
    const requesterUserId = authenticatedUser?.id ?? verifiedToken?.userId ?? "";

    if (!requesterUserId) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }

    const clientIp = getClientAddress(req);
    const ipRateLimit = await enforceRequestRateLimit(supabase, {
      scope: "contact_verification_verify:ip",
      bucketKey: clientIp,
      maxRequests: 30,
      windowSeconds: 30 * 60,
      metadata: {
        challengeId,
      },
    });

    if (!ipRateLimit.allowed) {
      return jsonResponse({ error: "Too many verification attempts. Please try again later." }, 429);
    }

    const { data, error } = await supabase
      .from("student_contact_verification_challenges")
      .select("id, user_id, channel, code_hash, expires_at, consumed_at, attempts_count, max_attempts")
      .eq("id", challengeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load the verification challenge: ${error.message}`);
    }

    const challenge = (data as ChallengeRow | null) ?? null;
    if (!challenge) {
      return jsonResponse({ error: "Verification challenge not found" }, 404);
    }

    if (challenge.user_id !== requesterUserId) {
      return jsonResponse({ error: "You are not allowed to verify this challenge" }, 403);
    }

    if (challenge.consumed_at) {
      return jsonResponse({ error: "Verification challenge already used" }, 409);
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return jsonResponse({ error: "Verification code expired", code: "VERIFICATION_CODE_EXPIRED" }, 410);
    }

    if (challenge.attempts_count >= challenge.max_attempts) {
      return jsonResponse({ error: "Too many attempts", code: "VERIFICATION_MAX_ATTEMPTS_REACHED" }, 429);
    }

    const submittedHash = await hashVerificationCode({
      userId: challenge.user_id,
      channel: challenge.channel,
      code,
    });

    if (submittedHash !== challenge.code_hash) {
      const nextAttemptsCount = challenge.attempts_count + 1;
      const { error: updateAttemptsError } = await supabase
        .from("student_contact_verification_challenges")
        .update({ attempts_count: nextAttemptsCount })
        .eq("id", challenge.id);

      if (updateAttemptsError) {
        throw new Error(`Failed to update verification attempts: ${updateAttemptsError.message}`);
      }

      return jsonResponse(
        {
          error: "Invalid verification code",
          code: nextAttemptsCount >= challenge.max_attempts ? "VERIFICATION_MAX_ATTEMPTS_REACHED" : "INVALID_VERIFICATION_CODE",
          remainingAttempts: Math.max(challenge.max_attempts - nextAttemptsCount, 0),
        },
        nextAttemptsCount >= challenge.max_attempts ? 429 : 400,
      );
    }

    const nowIso = new Date().toISOString();
    const verificationColumn =
      challenge.channel === "email" ? { email_verified_at: nowIso } : { sms_verified_at: nowIso };

    const { error: consumeError } = await supabase
      .from("student_contact_verification_challenges")
      .update({ consumed_at: nowIso, attempts_count: challenge.attempts_count + 1 })
      .eq("id", challenge.id);

    if (consumeError) {
      throw new Error(`Failed to mark the verification challenge as consumed: ${consumeError.message}`);
    }

    const { error: verificationUpdateError } = await supabase
      .from("student_contact_verifications")
      .update(verificationColumn)
      .eq("user_id", challenge.user_id);

    if (verificationUpdateError) {
      throw new Error(`Failed to update the contact verification state: ${verificationUpdateError.message}`);
    }

    const verificationRow = await loadStudentContactVerification(supabase, challenge.user_id);
    if (!verificationRow) {
      throw new Error("The contact verification state is missing");
    }

    const completedChannels = getCompletedVerificationChannels(verificationRow);
    const pendingChannels = getPendingVerificationChannels(verificationRow);

    logger.info("Verification code accepted", {
      userId: challenge.user_id,
      channel: challenge.channel,
      pendingChannels,
    });

    return jsonResponse({
      enabled: true,
      success: true,
      channel: challenge.channel,
      completedChannels,
      pendingChannels,
      fullyVerified: pendingChannels.length === 0,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "Invalid verification access token") {
      return jsonResponse({ error: message }, 401);
    }

    if (message === "Expired verification access token") {
      return jsonResponse({ error: message }, 410);
    }

    logger.error("Failed to verify the contact verification code", { message });
    return jsonResponse({ error: message }, 500);
  }
});
