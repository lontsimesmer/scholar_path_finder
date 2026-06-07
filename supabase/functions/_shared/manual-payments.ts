import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { ensureConsultationApplication } from "./student-applications.ts";

export type ManualPaymentSubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type ManualPaymentInstructions = {
  accountName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  instructionsFr: string;
  instructionsEn: string;
};

export type CheckoutPaymentMode = "cinetpay" | "manual_orange_money";

const PAYMENT_MODE_KEY = "checkout.payment_mode";
const MANUAL_INSTRUCTIONS_KEY = "checkout.manual_orange_money";

const DEFAULT_MANUAL_INSTRUCTIONS: ManualPaymentInstructions = {
  accountName: "PETNJI",
  accountNumber: "+237 698 090 6123",
  amount: 15625,
  currency: "XAF",
  instructionsFr:
    "Composez #150# ou ouvrez l'application Orange Money, envoyez 15 625 XAF au +237 698 090 6123 (PETNJI), puis téléversez la capture du SMS de confirmation.",
  instructionsEn:
    "Dial #150# or open the Orange Money app, send 15,625 XAF to +237 698 090 6123 (PETNJI), then upload the confirmation SMS screenshot.",
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
};

const toTrimmedString = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

export const loadCheckoutPaymentMode = async (
  supabase: SupabaseClient,
): Promise<CheckoutPaymentMode> => {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", PAYMENT_MODE_KEY)
    .maybeSingle();

  const raw = (data?.value as { mode?: unknown } | null)?.mode;
  return raw === "cinetpay" ? "cinetpay" : "manual_orange_money";
};

export const loadManualPaymentInstructions = async (
  supabase: SupabaseClient,
): Promise<ManualPaymentInstructions> => {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", MANUAL_INSTRUCTIONS_KEY)
    .maybeSingle();

  const value = (data?.value ?? {}) as Record<string, unknown>;

  return {
    accountName: toTrimmedString(value.account_name, DEFAULT_MANUAL_INSTRUCTIONS.accountName),
    accountNumber: toTrimmedString(value.account_number, DEFAULT_MANUAL_INSTRUCTIONS.accountNumber),
    amount: toPositiveInteger(value.amount, DEFAULT_MANUAL_INSTRUCTIONS.amount),
    currency: toTrimmedString(value.currency, DEFAULT_MANUAL_INSTRUCTIONS.currency),
    instructionsFr: toTrimmedString(value.instructions_fr, DEFAULT_MANUAL_INSTRUCTIONS.instructionsFr),
    instructionsEn: toTrimmedString(value.instructions_en, DEFAULT_MANUAL_INSTRUCTIONS.instructionsEn),
  };
};

const buildManualTransactionId = (submissionId: string) => `mom-${submissionId}`;

type MarkLeadAsPaidInput = {
  leadId: string;
  studentId: string;
  submissionId: string;
  amount: number;
  currency: string;
  customerEmail?: string | null;
  customerPhoneNumber?: string | null;
};

export const markLeadAsPaidViaManualPayment = async (
  supabase: SupabaseClient,
  input: MarkLeadAsPaidInput,
) => {
  const now = new Date().toISOString();
  const transactionId = buildManualTransactionId(input.submissionId);

  const { data: existing, error: existingError } = await supabase
    .from("payment_transactions")
    .select("id, transaction_id")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to lookup payment transaction: ${existingError.message}`);
  }

  let paymentTransactionId: string;

  if (existing) {
    paymentTransactionId = existing.id as string;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("payment_transactions")
      .insert({
        lead_id: input.leadId,
        student_id: input.studentId,
        provider: "manual_orange_money",
        transaction_id: transactionId,
        channel: "MOBILE_MONEY",
        amount: input.amount,
        currency: input.currency,
        local_status: "accepted",
        provider_status: "APPROVED",
        payment_method: "ORANGE_MONEY_MANUAL",
        customer_email: input.customerEmail ?? null,
        customer_phone_number: input.customerPhoneNumber ?? null,
        provider_payment_date: now,
        last_checked_at: now,
        metadata: {
          manual_payment_submission_id: input.submissionId,
          source: "manual_orange_money",
        },
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to create manual payment transaction: ${insertError.message}`);
    }

    paymentTransactionId = inserted.id as string;
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      payment_status: "paid",
      status: "paid",
      payment_id: transactionId,
      updated_at: now,
    })
    .eq("id", input.leadId);

  if (leadError) {
    throw new Error(`Failed to mark lead as paid: ${leadError.message}`);
  }

  await ensureConsultationApplication(supabase, input.studentId);

  return { paymentTransactionId, transactionId };
};

type AdminNotificationInput = {
  type: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  payload?: Record<string, unknown>;
};

export const createAdminNotificationsForAll = async (
  supabase: SupabaseClient,
  input: AdminNotificationInput,
) => {
  const { data: admins, error } = await supabase.from("admins").select("email");

  if (error) {
    throw new Error(`Failed to load admin recipients: ${error.message}`);
  }

  const recipients = (admins ?? [])
    .map((row) => (row.email as string | null)?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email && email.length > 0));

  if (recipients.length === 0) {
    return { inserted: 0 };
  }

  const rows = recipients.map((email) => ({
    recipient_admin_email: email,
    recipient_user_id: null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link_path: input.linkPath ?? null,
    payload: input.payload ?? {},
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) {
    throw new Error(`Failed to create admin notifications: ${insertError.message}`);
  }

  return { inserted: rows.length };
};

type StudentNotificationInput = {
  recipientUserId: string;
  type: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  payload?: Record<string, unknown>;
};

export const createStudentNotification = async (
  supabase: SupabaseClient,
  input: StudentNotificationInput,
) => {
  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: input.recipientUserId,
    recipient_admin_email: null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link_path: input.linkPath ?? null,
    payload: input.payload ?? {},
  });

  if (error) {
    throw new Error(`Failed to create student notification: ${error.message}`);
  }
};
