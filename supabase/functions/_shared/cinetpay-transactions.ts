import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { ensureConsultationApplication } from "./student-applications.ts";
import {
  type CinetPayChannel,
  type CinetPayInitializationResponse,
  type CinetPayVerificationResponse,
  parseProviderDate,
} from "./cinetpay.ts";

export type LocalPaymentStatus =
  | "initialized"
  | "pending"
  | "accepted"
  | "refused"
  | "failed";

export type PaymentTransactionRecord = {
  id: string;
  lead_id: string;
  student_id: string;
  provider: string;
  transaction_id: string;
  channel: CinetPayChannel;
  local_status: LocalPaymentStatus;
  payment_token: string | null;
  payment_url: string | null;
};

type CreatePaymentTransactionInput = {
  leadId: string;
  studentId: string;
  transactionId: string;
  channel: CinetPayChannel;
  amount: number;
  currency: string;
  customerEmail?: string | null;
  customerPhoneNumber?: string | null;
  customerName?: string | null;
  customerSurname?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerCountry?: string | null;
  customerState?: string | null;
  customerZipCode?: string | null;
  metadata?: Record<string, unknown>;
};

const FINAL_STATUSES: LocalPaymentStatus[] = ["accepted", "refused", "failed"];

const normalizeProviderStatus = (value: string | null | undefined) =>
  value?.trim().toUpperCase() ?? "";

export const isFinalLocalStatus = (status: string | null | undefined) =>
  FINAL_STATUSES.includes((status ?? "") as LocalPaymentStatus);

export const mapCinetPayVerificationStatus = (
  verification: CinetPayVerificationResponse,
): LocalPaymentStatus => {
  const providerStatus = normalizeProviderStatus(verification.data?.status);

  if (providerStatus === "ACCEPTED") {
    return "accepted";
  }

  if (providerStatus === "REFUSED") {
    return "refused";
  }

  if (providerStatus === "WAITING_FOR_CUSTOMER" || providerStatus.length > 0) {
    return "pending";
  }

  return "failed";
};

export const createPaymentTransaction = async (
  supabase: SupabaseClient,
  input: CreatePaymentTransactionInput,
) => {
  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      lead_id: input.leadId,
      student_id: input.studentId,
      provider: "cinetpay",
      transaction_id: input.transactionId,
      channel: input.channel,
      amount: input.amount,
      currency: input.currency,
      customer_email: input.customerEmail ?? null,
      customer_phone_number: input.customerPhoneNumber ?? null,
      customer_name: input.customerName ?? null,
      customer_surname: input.customerSurname ?? null,
      customer_address: input.customerAddress ?? null,
      customer_city: input.customerCity ?? null,
      customer_country: input.customerCountry ?? null,
      customer_state: input.customerState ?? null,
      customer_zip_code: input.customerZipCode ?? null,
      metadata: input.metadata ?? {},
      local_status: "initialized",
      updated_at: new Date().toISOString(),
    })
    .select("id, lead_id, student_id, provider, transaction_id, channel, local_status, payment_token, payment_url")
    .single();

  if (error) {
    throw new Error(`Failed to create payment transaction: ${error.message}`);
  }

  return data as PaymentTransactionRecord;
};

export const updateTransactionAfterInitialization = async (
  supabase: SupabaseClient,
  transactionId: string,
  response: CinetPayInitializationResponse,
) => {
  const { error } = await supabase
    .from("payment_transactions")
    .update({
      local_status: "pending",
      provider_status: String(response.message ?? "CREATED"),
      provider_response_id: response.api_response_id ?? null,
      payment_token: response.data?.payment_token ?? null,
      payment_url: response.data?.payment_url ?? null,
      raw_initialization_response: response,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_id", transactionId);

  if (error) {
    throw new Error(`Failed to update initialized payment transaction: ${error.message}`);
  }
};

export const markTransactionInitializationFailed = async (
  supabase: SupabaseClient,
  transactionId: string,
  errorMessage: string,
) => {
  const { error } = await supabase
    .from("payment_transactions")
    .update({
      local_status: "failed",
      provider_status: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_id", transactionId);

  if (error) {
    throw new Error(`Failed to mark payment transaction as failed: ${error.message}`);
  }
};

export const getPaymentTransactionByTransactionId = async (
  supabase: SupabaseClient,
  transactionId: string,
) => {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id, lead_id, student_id, provider, transaction_id, channel, local_status, payment_token, payment_url")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load payment transaction: ${error.message}`);
  }

  return (data as PaymentTransactionRecord | null) ?? null;
};

export const getLatestOwnedPaymentTransaction = async (
  supabase: SupabaseClient,
  leadId: string,
  studentId: string,
) => {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id, lead_id, student_id, provider, transaction_id, channel, local_status, payment_token, payment_url")
    .eq("lead_id", leadId)
    .eq("student_id", studentId)
    .eq("provider", "cinetpay")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load latest payment transaction: ${error.message}`);
  }

  return (data?.[0] as PaymentTransactionRecord | undefined) ?? null;
};

export const recordPaymentNotification = async (
  supabase: SupabaseClient,
  transactionId: string,
  notificationPayload: Record<string, string>,
) => {
  const { error } = await supabase
    .from("payment_transactions")
    .update({
      raw_last_notification: notificationPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_id", transactionId);

  if (error) {
    throw new Error(`Failed to record payment notification: ${error.message}`);
  }
};

export const reconcilePaymentVerification = async (
  supabase: SupabaseClient,
  transaction: PaymentTransactionRecord,
  verification: CinetPayVerificationResponse,
) => {
  const providerStatus = normalizeProviderStatus(verification.data?.status || verification.message);
  const mappedStatus = mapCinetPayVerificationStatus(verification);
  const nextStatus =
    mappedStatus === "accepted"
      ? "accepted"
      : transaction.local_status === "accepted"
      ? "accepted"
      : mappedStatus;
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      local_status: nextStatus,
      provider_status: providerStatus || verification.message || null,
      payment_method: verification.data?.payment_method ?? null,
      provider_operator_id: verification.data?.operator_id ?? null,
      provider_response_id: verification.api_response_id ?? null,
      provider_payment_date: parseProviderDate(verification.data?.payment_date),
      provider_fund_availability_date: parseProviderDate(
        verification.data?.fund_availability_date,
      ),
      last_checked_at: now,
      raw_last_status_response: verification,
      updated_at: now,
    })
    .eq("transaction_id", transaction.transaction_id);

  if (updateError) {
    throw new Error(`Failed to update payment verification result: ${updateError.message}`);
  }

  if (nextStatus === "accepted") {
    const { error: leadError } = await supabase
      .from("leads")
      .update({
        payment_status: "paid",
        payment_id: transaction.transaction_id,
        status: "paid",
        updated_at: now,
      })
      .eq("id", transaction.lead_id);

    if (leadError) {
      throw new Error(`Failed to update paid lead: ${leadError.message}`);
    }

    await ensureConsultationApplication(supabase, transaction.student_id);
  } else if (nextStatus === "refused" || nextStatus === "failed") {
    const { data: lead, error: leadSelectError } = await supabase
      .from("leads")
      .select("payment_status")
      .eq("id", transaction.lead_id)
      .maybeSingle();

    if (leadSelectError) {
      throw new Error(`Failed to load lead payment status: ${leadSelectError.message}`);
    }

    if (lead?.payment_status !== "paid") {
      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          payment_status: "unpaid",
          updated_at: now,
        })
        .eq("id", transaction.lead_id);

      if (leadUpdateError) {
        throw new Error(`Failed to reset lead payment status: ${leadUpdateError.message}`);
      }
    }
  }

  return {
    localStatus: nextStatus,
    providerStatus: providerStatus || null,
    paymentMethod: verification.data?.payment_method ?? null,
  };
};
