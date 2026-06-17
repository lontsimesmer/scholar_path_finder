import { createLogger, getErrorMessage } from "./logger.ts";

const logger = createLogger("BREVO");

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BREVO_SMS_ENDPOINT = "https://api.brevo.com/v3/transactionalSMS/send";

type BrevoSender = {
  email: string;
  name?: string;
};

type SendTransactionalEmailInput = {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  sender?: BrevoSender;
};

type SendTransactionalSmsInput = {
  recipient: string;
  content: string;
  sender?: string;
  tag?: string;
};

const getBrevoApiKey = () => Deno.env.get("BREVO_API_KEY")?.trim() ?? "";

const getSandboxHeaders = () => {
  const sandboxEnabled = (Deno.env.get("BREVO_SANDBOX_MODE") ?? "").trim().toLowerCase() === "true";
  return sandboxEnabled ? { "X-Sib-Sandbox": "drop" } : {};
};

const assertBrevoConfigured = () => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  return apiKey;
};

export const sendBrevoTransactionalEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
  sender,
}: SendTransactionalEmailInput) => {
  const apiKey = assertBrevoConfigured();
  const senderEmail = sender?.email || Deno.env.get("BREVO_EMAIL_SENDER")?.trim() || "";

  if (!senderEmail) {
    throw new Error("BREVO_EMAIL_SENDER is not configured");
  }

  const senderName = sender?.name || Deno.env.get("BREVO_EMAIL_SENDER_NAME")?.trim() || undefined;

  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
      ...getSandboxHeaders(),
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to,
      subject,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    logger.error("Brevo transactional email failed", {
      status: response.status,
      payload,
    });
    throw new Error(`Brevo email request failed with status ${response.status}`);
  }

  logger.info("Brevo transactional email sent", {
    recipients: to.map((item) => item.email),
    subject,
  });
};

export const sendBrevoTransactionalSms = async ({
  recipient,
  content,
  sender,
  tag,
}: SendTransactionalSmsInput) => {
  const apiKey = assertBrevoConfigured();
  const smsSender = sender || Deno.env.get("BREVO_SMS_SENDER")?.trim() || "";

  if (!smsSender) {
    throw new Error("BREVO_SMS_SENDER is not configured");
  }

  const response = await fetch(BREVO_SMS_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: smsSender,
      recipient: recipient.replace(/^\+/, ""),
      content,
      type: "transactional",
      tag,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    logger.error("Brevo transactional SMS failed", {
      status: response.status,
      payload,
    });
    throw new Error(`Brevo SMS request failed with status ${response.status}`);
  }

  logger.info("Brevo transactional SMS sent", {
    recipient,
    tag,
  });
};

export const canSendBrevoEmail = () => {
  try {
    return Boolean(getBrevoApiKey() && Deno.env.get("BREVO_EMAIL_SENDER")?.trim());
  } catch (error: unknown) {
    logger.warn("Brevo email configuration check failed", {
      message: getErrorMessage(error),
    });
    return false;
  }
};

export const canSendBrevoSms = () => {
  try {
    return Boolean(getBrevoApiKey() && Deno.env.get("BREVO_SMS_SENDER")?.trim());
  } catch (error: unknown) {
    logger.warn("Brevo SMS configuration check failed", {
      message: getErrorMessage(error),
    });
    return false;
  }
};
