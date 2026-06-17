import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { normalizeEmail } from "./auth-utils.ts";
import { createLogger } from "./logger.ts";
import { normalizePhoneNumber } from "./phone-utils.ts";

const logger = createLogger("CONTACT-VERIFICATION");

export const CONTACT_VERIFICATION_CHANNELS = ["email", "sms"] as const;

export type VerificationChannel = (typeof CONTACT_VERIFICATION_CHANNELS)[number];

type StudentContactVerificationRow = {
  user_id: string;
  email: string | null;
  phone_number: string | null;
  email_verification_required: boolean;
  email_verified_at: string | null;
  sms_verification_required: boolean;
  sms_verified_at: string | null;
};

type ContactVerificationSettings = {
  enabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  codeSecret: string;
  codeTtlMinutes: number;
  sessionTtlMinutes: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
};

export type VerificationAccessTokenPayload = {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  channels: VerificationChannel[];
  issuedAt: string;
  expiresAt: string;
};

type UpsertStudentContactVerificationInput = {
  userId: string;
  email?: string | null;
  phoneNumber?: string | null;
  requiredChannels: VerificationChannel[];
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const readBooleanEnv = (name: string, fallback = false) => {
  const value = Deno.env.get(name)?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  return TRUE_VALUES.has(value);
};

const readNumberEnv = (name: string, fallback: number) => {
  const rawValue = Deno.env.get(name)?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

export const getContactVerificationSettings = (): ContactVerificationSettings => {
  const enabled = readBooleanEnv("CONTACT_VERIFICATION_ENABLED", false);
  const emailEnabled = enabled && readBooleanEnv("CONTACT_EMAIL_VERIFICATION_ENABLED", false);
  const smsEnabled = enabled && readBooleanEnv("CONTACT_SMS_VERIFICATION_ENABLED", false);

  return {
    enabled,
    emailEnabled,
    smsEnabled,
    codeSecret: Deno.env.get("CONTACT_VERIFICATION_CODE_SECRET")?.trim() ?? "",
    codeTtlMinutes: readNumberEnv("CONTACT_VERIFICATION_CODE_TTL_MINUTES", 10),
    sessionTtlMinutes: readNumberEnv("CONTACT_VERIFICATION_SESSION_TTL_MINUTES", 60),
    maxAttempts: readNumberEnv("CONTACT_VERIFICATION_MAX_ATTEMPTS", 5),
    resendCooldownSeconds: readNumberEnv("CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS", 60),
  };
};

export const resolveVerificationChannels = ({
  email,
  phoneNumber,
  requestedChannels,
}: {
  email?: string | null;
  phoneNumber?: string | null;
  requestedChannels?: VerificationChannel[] | null;
}) => {
  const settings = getContactVerificationSettings();
  if (!settings.enabled) {
    return [];
  }

  const requested = new Set<VerificationChannel>(
    requestedChannels?.length ? requestedChannels : CONTACT_VERIFICATION_CHANNELS,
  );
  const channels: VerificationChannel[] = [];

  if (settings.emailEnabled && requested.has("email") && email?.trim()) {
    channels.push("email");
  }

  if (settings.smsEnabled && requested.has("sms") && normalizePhoneNumber(phoneNumber)) {
    channels.push("sms");
  }

  return channels;
};

export const requiresContactVerification = (channels: VerificationChannel[]) => channels.length > 0;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4), "=");
  return atob(paddedValue);
};

export const hashVerificationCode = async ({
  userId,
  channel,
  code,
}: {
  userId: string;
  channel: VerificationChannel;
  code: string;
}) => {
  const settings = getContactVerificationSettings();
  if (!settings.codeSecret) {
    throw new Error("CONTACT_VERIFICATION_CODE_SECRET is not configured");
  }

  const value = `${settings.codeSecret}:${userId}:${channel}:${code}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
};

const signVerificationPayload = async (payload: string) => {
  const settings = getContactVerificationSettings();
  if (!settings.codeSecret) {
    throw new Error("CONTACT_VERIFICATION_CODE_SECRET is not configured");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(settings.codeSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(String.fromCharCode(...new Uint8Array(signature)));
};

export const buildVerificationAccessToken = async ({
  userId,
  email,
  phoneNumber,
  channels,
}: {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  channels: VerificationChannel[];
}) => {
  const settings = getContactVerificationSettings();
  const now = new Date();
  const payload: VerificationAccessTokenPayload = {
    userId,
    email: email ? normalizeEmail(email) : null,
    phoneNumber: normalizePhoneNumber(phoneNumber),
    channels,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + settings.sessionTtlMinutes * 60 * 1000).toISOString(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await signVerificationPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyVerificationAccessToken = async (token: string) => {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid verification access token");
  }

  const expectedSignature = await signVerificationPayload(encodedPayload);
  if (expectedSignature !== providedSignature) {
    throw new Error("Invalid verification access token");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as VerificationAccessTokenPayload;
  if (!payload.userId || !Array.isArray(payload.channels) || !payload.expiresAt) {
    throw new Error("Invalid verification access token");
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new Error("Expired verification access token");
  }

  const channels = payload.channels.filter((channel): channel is VerificationChannel =>
    CONTACT_VERIFICATION_CHANNELS.includes(channel),
  );

  return {
    ...payload,
    email: payload.email ? normalizeEmail(payload.email) : null,
    phoneNumber: normalizePhoneNumber(payload.phoneNumber),
    channels,
  };
};

export const generateVerificationCode = () => {
  const values = crypto.getRandomValues(new Uint32Array(1));
  const code = (values[0] % 1_000_000).toString().padStart(6, "0");
  return code;
};

export const buildVerificationExpiryIso = () => {
  const settings = getContactVerificationSettings();
  return new Date(Date.now() + settings.codeTtlMinutes * 60 * 1000).toISOString();
};

export const maskEmailAddress = (value: string | null | undefined) => {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue.includes("@")) {
    return null;
  }

  const [localPart, domainPart] = normalizedValue.split("@");
  const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - visibleLocal.length, 1))}@${domainPart}`;
};

export const maskPhoneNumber = (value: string | null | undefined) => {
  const normalizedValue = normalizePhoneNumber(value);
  if (!normalizedValue) {
    return null;
  }

  const visibleStart = normalizedValue.slice(0, Math.min(4, normalizedValue.length));
  const visibleEnd = normalizedValue.slice(-2);
  const hiddenCount = Math.max(normalizedValue.length - visibleStart.length - visibleEnd.length, 2);
  return `${visibleStart}${"*".repeat(hiddenCount)}${visibleEnd}`;
};

export const getMaskedDestination = (channel: VerificationChannel, row: Pick<StudentContactVerificationRow, "email" | "phone_number">) =>
  channel === "email" ? maskEmailAddress(row.email) : maskPhoneNumber(row.phone_number);

export const getCompletedVerificationChannels = (row: StudentContactVerificationRow) => {
  const completedChannels: VerificationChannel[] = [];

  if (row.email_verification_required && row.email_verified_at) {
    completedChannels.push("email");
  }

  if (row.sms_verification_required && row.sms_verified_at) {
    completedChannels.push("sms");
  }

  return completedChannels;
};

export const getPendingVerificationChannels = (row: StudentContactVerificationRow) => {
  const pendingChannels: VerificationChannel[] = [];

  if (row.email_verification_required && !row.email_verified_at) {
    pendingChannels.push("email");
  }

  if (row.sms_verification_required && !row.sms_verified_at) {
    pendingChannels.push("sms");
  }

  return pendingChannels;
};

export const selectNextPendingChannel = (
  pendingChannels: VerificationChannel[],
  preferredChannels?: VerificationChannel[] | null,
) => {
  if (preferredChannels?.length) {
    const matchingChannel = preferredChannels.find((channel) => pendingChannels.includes(channel));
    if (matchingChannel) {
      return matchingChannel;
    }
  }

  return pendingChannels[0] ?? null;
};

export const loadStudentContactVerification = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentContactVerificationRow | null> => {
  const { data, error } = await supabase
    .from("student_contact_verifications")
    .select(
      "user_id, email, phone_number, email_verification_required, email_verified_at, sms_verification_required, sms_verified_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load the contact verification state: ${error.message}`);
  }

  return (data as StudentContactVerificationRow | null) ?? null;
};

export const upsertStudentContactVerification = async (
  supabase: SupabaseClient,
  { userId, email, phoneNumber, requiredChannels }: UpsertStudentContactVerificationInput,
) => {
  const existingRow = await loadStudentContactVerification(supabase, userId);
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const emailChanged =
    requiredChannels.includes("email") &&
    normalizedEmail !== null &&
    normalizedEmail !== (existingRow?.email ?? null);
  const phoneChanged =
    requiredChannels.includes("sms") &&
    normalizedPhone !== null &&
    normalizedPhone !== (existingRow?.phone_number ?? null);

  const payload = {
    user_id: userId,
    email: normalizedEmail ?? existingRow?.email ?? null,
    phone_number: normalizedPhone ?? existingRow?.phone_number ?? null,
    email_verification_required: requiredChannels.includes("email"),
    email_verified_at:
      requiredChannels.includes("email") && !emailChanged ? existingRow?.email_verified_at ?? null : null,
    sms_verification_required: requiredChannels.includes("sms"),
    sms_verified_at:
      requiredChannels.includes("sms") && !phoneChanged ? existingRow?.sms_verified_at ?? null : null,
  };

  const { error } = await supabase.from("student_contact_verifications").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(`Failed to save the contact verification state: ${error.message}`);
  }

  logger.info("Upserted student contact verification state", {
    userId,
    requiredChannels,
  });

  return {
    ...payload,
  };
};
