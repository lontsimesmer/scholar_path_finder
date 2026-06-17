import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, tryGetAuthenticatedUser } from "../_shared/auth-utils.ts";
import {
  getCompletedVerificationChannels,
  getContactVerificationSettings,
  getMaskedDestination,
  getPendingVerificationChannels,
  loadStudentContactVerification,
  verifyVerificationAccessToken,
} from "../_shared/contact-verification.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("GET-CONTACT-VERIFICATION-STATUS");

type RequestPayload = {
  token?: string;
  userId?: string;
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
    const authenticatedUser = await tryGetAuthenticatedUser(req);
    const token = payload.token?.trim() || "";
    if (!authenticatedUser && !token) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }
    const verifiedToken = authenticatedUser ? null : await verifyVerificationAccessToken(token);
    const userId = authenticatedUser?.id ?? verifiedToken?.userId ?? "";

    if (!userId) {
      return jsonResponse({ error: "Authentication or a valid verification token is required" }, 401);
    }

    const settings = getContactVerificationSettings();
    const supabase = createServiceRoleClient();
    const verificationRow = await loadStudentContactVerification(supabase, userId);

    if (!verificationRow) {
      return jsonResponse({
        enabled: settings.enabled,
        verificationRequired: false,
        pendingChannels: [],
        completedChannels: [],
        channels: {
          email: { required: false, verified: false, maskedDestination: null },
          sms: { required: false, verified: false, maskedDestination: null },
        },
      });
    }

    const completedChannels = getCompletedVerificationChannels(verificationRow);
    const pendingChannels = getPendingVerificationChannels(verificationRow);

    logger.info("Resolved contact verification status", {
      userId,
      pendingChannels,
      completedChannels,
    });

    return jsonResponse({
      enabled: settings.enabled,
      verificationRequired: pendingChannels.length > 0 || completedChannels.length > 0,
      pendingChannels,
      completedChannels,
      channels: {
        email: {
          required: verificationRow.email_verification_required,
          verified: Boolean(verificationRow.email_verified_at),
          maskedDestination: getMaskedDestination("email", verificationRow),
        },
        sms: {
          required: verificationRow.sms_verification_required,
          verified: Boolean(verificationRow.sms_verified_at),
          maskedDestination: getMaskedDestination("sms", verificationRow),
        },
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "Invalid verification access token") {
      return jsonResponse({ error: message }, 401);
    }

    if (message === "Expired verification access token") {
      return jsonResponse({ error: message }, 410);
    }

    logger.error("Failed to load the contact verification status", { message });
    return jsonResponse({ error: message }, 500);
  }
});
