import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAdminUser,
} from "../_shared/auth-utils.ts";
import {
  isValidNotificationEmail,
  loadAdminNotificationRecipients,
  normalizeNotificationEmail,
  saveAdminNotificationRecipients,
} from "../_shared/admin-notifications.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const logger = createLogger("ADMIN-NOTIFICATION-RECIPIENTS");

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") {
    return 403;
  }
  if (
    message === "Email is required" ||
    message === "Invalid email format" ||
    message === "Email is already a recipient" ||
    message === "Cannot remove the last recipient"
  ) {
    return 400;
  }
  return 500;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseEmail = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Email is required");
  }
  const normalized = normalizeNotificationEmail(raw);
  if (!isValidNotificationEmail(normalized)) {
    throw new Error("Invalid email format");
  }
  return normalized;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceRoleClient();
    const caller = await requireAdminUser(supabase, req);

    if (req.method === "GET") {
      const emails = await loadAdminNotificationRecipients(supabase);
      return jsonResponse({ emails });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const email = parseEmail((body as { email?: unknown }).email);

      const current = await loadAdminNotificationRecipients(supabase);
      if (current.includes(email)) {
        throw new Error("Email is already a recipient");
      }

      const next = [...current, email];
      const saved = await saveAdminNotificationRecipients(supabase, next, caller.email);

      logger.info("Notification recipient added", { email, by: caller.email });
      return jsonResponse({ ok: true, emails: saved });
    }

    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const email = parseEmail((body as { email?: unknown }).email);

      const current = await loadAdminNotificationRecipients(supabase);
      if (current.length <= 1 && current.includes(email)) {
        throw new Error("Cannot remove the last recipient");
      }

      const next = current.filter((entry) => entry !== email);
      const saved = await saveAdminNotificationRecipients(supabase, next, caller.email);

      logger.info("Notification recipient removed", { email, by: caller.email });
      return jsonResponse({ ok: true, emails: saved });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("admin-notification-recipients request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
