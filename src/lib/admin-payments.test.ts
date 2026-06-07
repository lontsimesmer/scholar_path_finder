import { describe, expect, it } from "vitest";

import {
  buildPaymentStats,
  filterPaymentTransactions,
  getPaymentStudentLabel,
  type LeadRecord,
  type PaymentTransactionRecord,
  type StudentProfileLite,
} from "@/lib/admin-payments";

const createTransaction = (
  overrides: Partial<PaymentTransactionRecord>,
): PaymentTransactionRecord => ({
  id: "payment-1",
  lead_id: "lead-1",
  student_id: "student-1",
  transaction_id: "TX-1",
  payment_url: "https://pay.example/tx-1",
  channel: "MOBILE_MONEY",
  amount: 15625,
  currency: "XAF",
  local_status: "pending",
  provider_status: null,
  customer_email: "student@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const leadById = {
  "lead-1": {
    id: "lead-1",
    email: "lead@example.com",
    name: "Lead Name",
  } as LeadRecord,
};

const profileById: Record<string, StudentProfileLite> = {
  "student-1": {
    id: "student-1",
    email: "student@example.com",
    first_name: "Amina",
    last_name: "Talla",
  },
};

describe("admin payments helpers", () => {
  it("filters transactions by status, channel, and related student or lead data", () => {
    const matchingTransaction = createTransaction({
      local_status: "accepted",
      provider_status: "ACCEPTED",
    });
    const otherTransaction = createTransaction({
      id: "payment-2",
      lead_id: "lead-2",
      student_id: "student-2",
      transaction_id: "TX-2",
      channel: "CREDIT_CARD",
      local_status: "failed",
      customer_email: "other@example.com",
    });

    expect(
      filterPaymentTransactions({
        channelFilter: "MOBILE_MONEY",
        leadById,
        profileById,
        query: "amina",
        statusFilter: "accepted",
        transactions: [matchingTransaction, otherTransaction],
      }),
    ).toEqual([matchingTransaction]);
  });

  it("builds payment stats and accepted amount totals", () => {
    expect(
      buildPaymentStats([
        createTransaction({ amount: 1000, local_status: "accepted" }),
        createTransaction({ amount: 2000, id: "payment-2", local_status: "accepted" }),
        createTransaction({ id: "payment-3", local_status: "initialized" }),
        createTransaction({ id: "payment-4", local_status: "refused" }),
      ]),
    ).toEqual({
      accepted: 2,
      acceptedAmount: 3000,
      failed: 1,
      pending: 1,
      total: 4,
    });
  });

  it("uses profile name, fallback email, then empty-state label for student labels", () => {
    expect(getPaymentStudentLabel(profileById["student-1"], "fallback@example.com", "Aucun etudiant")).toBe(
      "Amina Talla",
    );
    expect(getPaymentStudentLabel(undefined, "fallback@example.com", "Aucun etudiant")).toBe("fallback@example.com");
    expect(getPaymentStudentLabel(undefined, null, "Aucun etudiant")).toBe("Aucun etudiant");
  });
});
