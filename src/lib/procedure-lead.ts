export interface ProcedureLeadSummary {
  leadId: string;
  email: string;
  leadStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_REQUIRES_ACTION_STATUSES = new Set(["unpaid", "refunded"]);
const PAYMENT_PENDING_STATUSES = new Set([
  "pending",
  "mobile_money_pending",
  "bank_transfer_pending",
]);

export const doesProcedurePaymentRequireAction = (
  paymentStatus: string | null | undefined,
) => PAYMENT_REQUIRES_ACTION_STATUSES.has((paymentStatus ?? "").trim());

export const isProcedurePaymentPending = (
  paymentStatus: string | null | undefined,
) => PAYMENT_PENDING_STATUSES.has((paymentStatus ?? "").trim());

export const buildProcedureCheckoutPath = (
  lead: Pick<ProcedureLeadSummary, "leadId" | "email"> | null | undefined,
) => {
  if (!lead) {
    return null;
  }

  return `/checkout?leadId=${encodeURIComponent(lead.leadId)}&email=${encodeURIComponent(lead.email)}`;
};
