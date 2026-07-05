import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createAnonClient,
  createServiceRoleClient,
  normalizeEmail,
} from "../_shared/auth-utils.ts";
import { canSendBrevoEmail, sendBrevoTransactionalEmail } from "../_shared/brevo.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";
import { enforceRequestRateLimit, getClientAddress } from "../_shared/request-throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("SEND-PASSWORD-RESET");

const RESET_EMAIL_SUBJECT = "Réinitialisez votre mot de passe — Power Prestation";

const RESET_EMAIL_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Réinitialisation de mot de passe</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1f36;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;font-weight:600;">Power Prestation</p>
                <h1 style="margin:16px 0 0 0;font-size:22px;line-height:1.35;color:#0f172a;">Réinitialisez votre mot de passe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;font-size:15px;line-height:1.6;color:#334155;">
                <p style="margin:0 0 16px 0;">Bonjour,</p>
                <p style="margin:0 0 16px 0;">
                  Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte Power Prestation. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pour une durée limitée.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px 32px;">
                <a href="__ACTION_LINK__" style="display:inline-block;padding:14px 28px;background:#355acc;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
                  Choisir un nouveau mot de passe
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
                  Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe restera inchangé.
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

const buildTextBody = (link: string) =>
  [
    "Bonjour,",
    "",
    "Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte Power Prestation.",
    "",
    "Cliquez sur ce lien pour choisir un nouveau mot de passe :",
    link,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    "",
    "Power Prestation — Conseil en mobilité académique.",
  ].join("\n");

const jsonOk = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const buildRedirectTo = (payloadRedirectTo?: string | null) => {
  if (typeof payloadRedirectTo === "string" && /^https?:\/\//.test(payloadRedirectTo)) {
    return payloadRedirectTo;
  }
  const siteUrl = Deno.env.get("SITE_URL")?.trim();
  if (!siteUrl) return undefined;
  return `${siteUrl.replace(/\/$/, "")}/reset-password`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const rawEmail = typeof payload?.email === "string" ? payload.email : "";
    const email = rawEmail ? normalizeEmail(rawEmail) : "";
    const redirectTo = buildRedirectTo(payload?.redirectTo);

    if (!email) {
      logger.info("Missing email in request; returning generic success");
      return jsonOk();
    }

    const supabase = createServiceRoleClient();
    const clientIp = getClientAddress(req);

    const ipLimit = await enforceRequestRateLimit(supabase, {
      scope: "password_reset_send:ip",
      bucketKey: clientIp,
      maxRequests: 20,
      windowSeconds: 30 * 60,
    });
    if (!ipLimit.allowed) {
      logger.warn("Password reset rate limit hit by IP", { clientIp });
      return jsonOk();
    }

    const emailLimit = await enforceRequestRateLimit(supabase, {
      scope: "password_reset_send:email",
      bucketKey: email,
      maxRequests: 1,
      windowSeconds: 60,
      metadata: { clientIp },
    });
    if (!emailLimit.allowed) {
      logger.warn("Password reset cooldown active for this email");
      return jsonOk();
    }

    if (canSendBrevoEmail()) {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) {
        logger.warn("admin.generateLink failed", { message: error.message });
        return jsonOk();
      }

      const actionLink = data?.properties?.action_link ?? "";
      if (!actionLink) {
        logger.warn("admin.generateLink returned no action_link");
        return jsonOk();
      }

      const htmlBody = RESET_EMAIL_HTML.replaceAll("__ACTION_LINK__", actionLink);

      await sendBrevoTransactionalEmail({
        to: [{ email }],
        subject: RESET_EMAIL_SUBJECT,
        htmlContent: htmlBody,
        textContent: buildTextBody(actionLink),
      });

      logger.info("Password reset email sent via Brevo");
      return jsonOk();
    }

    logger.info("Brevo not configured; falling back to supabase.auth.resetPasswordForEmail for local dev");
    const anon = createAnonClient();
    const { error: resetError } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (resetError) {
      logger.warn("resetPasswordForEmail fallback failed", { message: resetError.message });
    }

    return jsonOk();
  } catch (error) {
    logger.error("send-password-reset unexpected error", { message: getErrorMessage(error) });
    return jsonOk();
  }
});
