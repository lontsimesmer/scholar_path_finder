import { describe, expect, it } from "vitest";

import {
  buildManualPaymentStats,
  filterManualPaymentSubmissions,
  getManualPaymentStudentLabel,
  type ManualPaymentLeadRecord,
  type ManualPaymentStudentLite,
  type ManualPaymentSubmissionRecord,
} from "@/lib/admin-manual-payments";

const baseSubmission: ManualPaymentSubmissionRecord = {
  id: "sub-1",
  lead_id: "lead-1",
  student_id: "student-1",
  amount: 15625,
  currency: "XAF",
  receipt_path: "student-1/proof.png",
  receipt_mime_type: "image/png",
  sender_name: "Amina T",
  sender_phone: "+237600000001",
  provider_reference: "MP240601",
  notes: null,
  status: "pending_review",
  reviewer_email: null,
  reviewer_comment: null,
  reviewed_at: null,
  payment_transaction_id: null,
  metadata: {},
  created_at: "2026-06-01T08:00:00.000Z",
  updated_at: "2026-06-01T08:00:00.000Z",
};

const createSubmission = (
  overrides: Partial<ManualPaymentSubmissionRecord>,
): ManualPaymentSubmissionRecord => ({ ...baseSubmission, ...overrides });

const baseLead: ManualPaymentLeadRecord = {
  id: "lead-1",
  email: "lead@example.com",
  name: "Lead Name",
  message: "msg",
  status: "pending",
  payment_id: null,
  payment_status: "bank_transfer_pending",
  phone: null,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  follow_up_count: 0,
  last_follow_up_at: null,
  next_follow_up_at: null,
  manual_payment_blocked_at: null,
  manual_payment_blocked_by: null,
  manual_payment_blocked_reason: null,
};

const leadById: Record<string, ManualPaymentLeadRecord> = {
  "lead-1": baseLead,
  "lead-2": {
    ...baseLead,
    id: "lead-2",
    email: "second@example.com",
    name: "Second Lead",
    manual_payment_blocked_at: "2026-06-01T09:00:00.000Z",
  },
};

const profileById: Record<string, ManualPaymentStudentLite> = {
  "student-1": {
    id: "student-1",
    email: "amina@example.com",
    first_name: "Amina",
    last_name: "Talla",
  },
};

describe("admin manual payments helpers", () => {
  it("filters submissions by status and free text", () => {
    const pending = createSubmission({ id: "sub-1", status: "pending_review" });
    const approved = createSubmission({
      id: "sub-2",
      status: "approved",
      lead_id: "lead-2",
      student_id: "student-2",
    });

    expect(
      filterManualPaymentSubmissions({
        submissions: [pending, approved],
        leadById,
        profileById,
        statusFilter: "pending_review",
        query: "Amina",
      }),
    ).toEqual([pending]);

    expect(
      filterManualPaymentSubmissions({
        submissions: [pending, approved],
        leadById,
        profileById,
        statusFilter: "all",
        query: "second@example.com",
      }),
    ).toEqual([approved]);
  });

  it("builds stats including pending amount and blocked lead count", () => {
    const submissions = [
      createSubmission({ id: "s1", status: "pending_review", amount: 1000 }),
      createSubmission({ id: "s2", status: "pending_review", amount: 2500 }),
      createSubmission({ id: "s3", status: "approved", lead_id: "lead-2" }),
      createSubmission({ id: "s4", status: "rejected" }),
    ];

    expect(buildManualPaymentStats(submissions, leadById)).toEqual({
      pending: 2,
      approved: 1,
      rejected: 1,
      blocked: 1,
      pendingAmount: 3500,
    });
  });

  it("resolves a fallback label for the student column", () => {
    expect(
      getManualPaymentStudentLabel(profileById["student-1"], null, "Inconnu"),
    ).toBe("Amina Talla");
    expect(getManualPaymentStudentLabel(undefined, "fallback@example.com", "Inconnu")).toBe(
      "fallback@example.com",
    );
    expect(getManualPaymentStudentLabel(undefined, null, "Inconnu")).toBe("Inconnu");
  });
});
