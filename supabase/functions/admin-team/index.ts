import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  normalizeEmail,
  requireAdminUser,
} from "../_shared/auth-utils.ts";
import { canSendBrevoEmail, sendBrevoTransactionalEmail } from "../_shared/brevo.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";
import { enforceRequestRateLimit } from "../_shared/request-throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const logger = createLogger("ADMIN-TEAM");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVITE_EMAIL_SUBJECT = "Vous êtes invité à rejoindre l'administration Power Prestation";

const INVITE_EMAIL_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Invitation Power Prestation</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1f36;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;font-weight:600;">Power Prestation</p>
                <h1 style="margin:16px 0 0 0;font-size:22px;line-height:1.35;color:#0f172a;">Vous êtes invité à rejoindre l'administration</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;font-size:15px;line-height:1.6;color:#334155;">
                <p style="margin:0 0 16px 0;">Bonjour,</p>
                <p style="margin:0 0 16px 0;">
                  __INVITER__ vous invite à rejoindre l'équipe administrative de Power Prestation. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder au tableau de bord.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px 32px;">
                <a href="__ACTION_LINK__" style="display:inline-block;padding:14px 28px;background:#355acc;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
                  Activer mon accès
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;font-size:13px;line-height:1.6;color:#64748b;">
                <p style="margin:0 0 12px 0;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                </p>
                <p style="margin:0 0 16px 0;word-break:break-all;color:#355acc;">
                  __ACTION_LINK__
                </p>
                <p style="margin:0;">
                  Si vous n'attendiez pas cette invitation, ignorez ce message.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                <p style="margin:0;">
                  Power Prestation — Conseil en mobilité académique.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const buildInviteTextBody = (inviter: string, link: string) =>
  [
    "Bonjour,",
    "",
    `${inviter} vous invite à rejoindre l'équipe administrative de Power Prestation.`,
    "",
    "Cliquez sur ce lien pour définir votre mot de passe et accéder au tableau de bord :",
    link,
    "",
    "Si vous n'attendiez pas cette invitation, ignorez ce message.",
    "",
    "Power Prestation — Conseil en mobilité académique.",
  ].join("\n");

const buildInviteRedirectTo = () => {
  const siteUrl = Deno.env.get("SITE_URL")?.trim();
  if (!siteUrl) return undefined;
  return `${siteUrl.replace(/\/$/, "")}/reset-password`;
};

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
    message === "You cannot remove yourself" ||
    message === "Email is already an admin"
  ) {
    return 400;
  }
  if (message === "Rate limit exceeded") {
    return 429;
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
  const email = normalizeEmail(raw);
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email format");
  }
  return email;
};

// deno-lint-ignore no-explicit-any
const listAdmins = async (supabase: any) => {
  const { data, error } = await supabase
    .from("admins")
    .select("email, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Failed to load admins: ${error.message}`);
  }
  return (data ?? []) as Array<{ email: string; created_at: string }>;
};

// deno-lint-ignore no-explicit-any
const generateInviteLink = async (supabase: any, email: string) => {
  const redirectTo = buildInviteRedirectTo();
  const options = redirectTo ? { redirectTo } : undefined;

  const inviteAttempt = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options,
  });

  if (!inviteAttempt.error) {
    return inviteAttempt.data?.properties?.action_link ?? "";
  }

  const message = inviteAttempt.error.message ?? "";
  const alreadyRegistered = /already.*registered|already.*exists/i.test(message);
  if (!alreadyRegistered) {
    logger.warn("admin.generateLink invite failed", { message });
    throw new Error(`Failed to generate invite link: ${message}`);
  }

  const recoveryAttempt = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options,
  });

  if (recoveryAttempt.error) {
    logger.warn("admin.generateLink recovery failed", {
      message: recoveryAttempt.error.message,
    });
    throw new Error(`Failed to generate recovery link: ${recoveryAttempt.error.message}`);
  }

  return recoveryAttempt.data?.properties?.action_link ?? "";
};

// deno-lint-ignore no-explicit-any
const handleGet = async (supabase: any) => {
  const admins = await listAdmins(supabase);
  return jsonResponse({ admins });
};

// deno-lint-ignore no-explicit-any
const handlePost = async (supabase: any, req: Request, caller: { email: string }) => {
  const body = await req.json().catch(() => ({}));
  const email = parseEmail((body as { email?: unknown }).email);

  const { data: existing, error: existingError } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing admin: ${existingError.message}`);
  }
  if (existing) {
    throw new Error("Email is already an admin");
  }

  const rateLimit = await enforceRequestRateLimit(supabase, {
    scope: "admin_team_invite:caller",
    bucketKey: caller.email,
    maxRequests: 10,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) {
    throw new Error("Rate limit exceeded");
  }

  let actionLink = "";
  try {
    actionLink = await generateInviteLink(supabase, email);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  const { error: insertError } = await supabase.from("admins").insert({ email });
  if (insertError) {
    throw new Error(`Failed to add admin: ${insertError.message}`);
  }

  if (actionLink && canSendBrevoEmail()) {
    try {
      const htmlBody = INVITE_EMAIL_HTML.replaceAll("__ACTION_LINK__", actionLink).replaceAll(
        "__INVITER__",
        caller.email,
      );
      await sendBrevoTransactionalEmail({
        to: [{ email }],
        subject: INVITE_EMAIL_SUBJECT,
        htmlContent: htmlBody,
        textContent: buildInviteTextBody(caller.email, actionLink),
      });
      logger.info("Admin invitation email sent", { email });
    } catch (error) {
      logger.warn("Failed to send admin invitation email", {
        message: getErrorMessage(error),
      });
    }
  } else if (!canSendBrevoEmail()) {
    logger.warn("Brevo not configured; invitation email skipped", { email });
  }

  const admins = await listAdmins(supabase);
  return jsonResponse({ ok: true, admins });
};

// deno-lint-ignore no-explicit-any
const handleDelete = async (supabase: any, req: Request, caller: { email: string }) => {
  const body = await req.json().catch(() => ({}));
  const email = parseEmail((body as { email?: unknown }).email);

  if (email === caller.email) {
    throw new Error("You cannot remove yourself");
  }

  const { error } = await supabase.from("admins").delete().eq("email", email);
  if (error) {
    throw new Error(`Failed to remove admin: ${error.message}`);
  }

  const admins = await listAdmins(supabase);
  return jsonResponse({ ok: true, admins });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceRoleClient();
    const caller = await requireAdminUser(supabase, req);

    if (req.method === "GET") {
      return await handleGet(supabase);
    }
    if (req.method === "POST") {
      return await handlePost(supabase, req, caller);
    }
    if (req.method === "DELETE") {
      return await handleDelete(supabase, req, caller);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("admin-team request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
