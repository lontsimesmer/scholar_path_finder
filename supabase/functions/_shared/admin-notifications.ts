import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { canSendBrevoEmail, sendBrevoTransactionalEmail } from "./brevo.ts";
import { createLogger, getErrorMessage } from "./logger.ts";

const logger = createLogger("ADMIN-NOTIFICATIONS");

export const NOTIFICATION_RECIPIENTS_KEY = "notifications.email_recipients";
export const DEFAULT_ADMIN_NOTIFICATION_EMAIL = "powerprestationint@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeNotificationEmail = (email: string) =>
  email.trim().toLowerCase();

export const isValidNotificationEmail = (email: string) =>
  EMAIL_REGEX.test(normalizeNotificationEmail(email));

const getFallbackRecipients = (): string[] => {
  const fromEnv = (Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ?? "").trim();
  const fromEnvNormalized = fromEnv ? normalizeNotificationEmail(fromEnv) : "";
  const defaults = new Set<string>([DEFAULT_ADMIN_NOTIFICATION_EMAIL]);
  if (fromEnvNormalized) {
    defaults.add(fromEnvNormalized);
  }
  return Array.from(defaults);
};

const parseStoredRecipients = (value: unknown): string[] | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const emails = (value as { emails?: unknown }).emails;
  if (!Array.isArray(emails)) {
    return null;
  }
  const sanitized: string[] = [];
  for (const entry of emails) {
    if (typeof entry !== "string") continue;
    const normalized = normalizeNotificationEmail(entry);
    if (normalized && isValidNotificationEmail(normalized) && !sanitized.includes(normalized)) {
      sanitized.push(normalized);
    }
  }
  return sanitized;
};

export const loadAdminNotificationRecipients = async (
  supabase: SupabaseClient,
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", NOTIFICATION_RECIPIENTS_KEY)
      .maybeSingle();

    if (error) {
      logger.warn("Failed to read notification recipients from app_settings", {
        message: error.message,
      });
      return getFallbackRecipients();
    }

    const parsed = parseStoredRecipients(data?.value);
    if (parsed && parsed.length > 0) {
      return parsed;
    }
    return getFallbackRecipients();
  } catch (error: unknown) {
    logger.warn("Unexpected error while loading notification recipients", {
      message: getErrorMessage(error),
    });
    return getFallbackRecipients();
  }
};

export const saveAdminNotificationRecipients = async (
  supabase: SupabaseClient,
  emails: string[],
  updatedBy?: string | null,
) => {
  const deduped: string[] = [];
  for (const email of emails) {
    const normalized = normalizeNotificationEmail(email);
    if (normalized && isValidNotificationEmail(normalized) && !deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: NOTIFICATION_RECIPIENTS_KEY,
      value: { emails: deduped },
      description: "Admin email addresses that receive operational notifications.",
      updated_by: updatedBy ?? null,
    });

  if (error) {
    throw new Error(`Failed to save notification recipients: ${error.message}`);
  }

  return deduped;
};

type RenderEmailInput = {
  eventLabel: string;
  headline: string;
  lines: string[];
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderAdminNotificationEmail = ({
  eventLabel,
  headline,
  lines,
  ctaLabel,
  ctaHref,
  footerNote,
}: RenderEmailInput) => {
  const safeEventLabel = escapeHtml(eventLabel);
  const safeHeadline = escapeHtml(headline);
  const safeLines = lines
    .map((line) => `<p style="margin:0 0 12px 0;">${escapeHtml(line)}</p>`)
    .join("");
  const cta = ctaLabel && ctaHref
    ? `<tr><td align="center" style="padding:8px 32px 24px 32px;">
        <a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:12px 24px;background:#355acc;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:13px;letter-spacing:0.02em;">
          ${escapeHtml(ctaLabel)}
        </a>
      </td></tr>`
    : "";
  const footer = footerNote
    ? `<p style="margin:0 0 12px 0;color:#94a3b8;">${escapeHtml(footerNote)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><title>${safeEventLabel}</title></head>
  <body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1f36;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr><td style="padding:32px 32px 8px 32px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;font-weight:600;">Power Prestation · ${safeEventLabel}</p>
            <h1 style="margin:14px 0 0 0;font-size:20px;line-height:1.35;color:#0f172a;">${safeHeadline}</h1>
          </td></tr>
          <tr><td style="padding:16px 32px 8px 32px;font-size:14px;line-height:1.6;color:#334155;">
            ${safeLines}
          </td></tr>
          ${cta}
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
            ${footer}
            <p style="margin:0;">Power Prestation — Notification opérationnelle.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `[Power Prestation · ${eventLabel}]`,
    "",
    headline,
    "",
    ...lines,
    ...(ctaLabel && ctaHref ? ["", `${ctaLabel} : ${ctaHref}`] : []),
    ...(footerNote ? ["", footerNote] : []),
    "",
    "Power Prestation — Notification opérationnelle.",
  ].join("\n");

  return { html, text };
};

type NotifyAdminsInput = {
  subject: string;
  eventLabel: string;
  headline: string;
  lines: string[];
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
  tag?: string;
};

export const notifyAdmins = async (
  supabase: SupabaseClient,
  input: NotifyAdminsInput,
): Promise<void> => {
  try {
    if (!canSendBrevoEmail()) {
      logger.warn("Brevo email not configured; skipping admin notification", {
        subject: input.subject,
        tag: input.tag,
      });
      return;
    }

    const recipients = await loadAdminNotificationRecipients(supabase);
    if (recipients.length === 0) {
      logger.warn("No admin notification recipients configured; skipping", {
        subject: input.subject,
      });
      return;
    }

    const { html, text } = renderAdminNotificationEmail({
      eventLabel: input.eventLabel,
      headline: input.headline,
      lines: input.lines,
      ctaLabel: input.ctaLabel,
      ctaHref: input.ctaHref,
      footerNote: input.footerNote,
    });

    await sendBrevoTransactionalEmail({
      to: recipients.map((email) => ({ email })),
      subject: input.subject,
      htmlContent: html,
      textContent: text,
    });

    logger.info("Admin notification email sent", {
      subject: input.subject,
      recipientCount: recipients.length,
      tag: input.tag,
    });
  } catch (error: unknown) {
    logger.warn("Failed to send admin notification email (non-blocking)", {
      subject: input.subject,
      message: getErrorMessage(error),
    });
  }
};
