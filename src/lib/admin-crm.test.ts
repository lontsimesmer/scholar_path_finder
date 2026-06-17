import { describe, expect, it } from "vitest";

import {
  AdminCRMStudent,
  buildAdminCRMMetrics,
  buildDocumentSummary,
  buildPaymentSummary,
  filterAdminCRMStudents,
  getDocumentFilterState,
  getPaymentFilterState,
} from "@/lib/admin-crm";

const createStudent = (overrides: Partial<AdminCRMStudent>): AdminCRMStudent => ({
  id: "student-1",
  email: "student@example.com",
  profile: {
    id: "student-1",
    email: "student@example.com",
    first_name: "Amina",
    last_name: "Talla",
    birth_date: "2000-01-01",
    profile_locked_at: null,
    profile_validation_comment: null,
    profile_invalidated_at: null,
    target_country: "France",
    target_program: "Master",
    current_degree: "Licence",
  },
  application: {
    id: "app-1",
    notes: "",
    status: "profile_evaluation",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  lead: null,
  documentSummary: {
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0,
  },
  paymentSummary: {
    accepted: 0,
    failed: 0,
    latestTransaction: null,
    pending: 0,
    total: 0,
  },
  ...overrides,
});

describe("admin CRM helpers", () => {
  it("summarizes document statuses and exposes the blocking document state", () => {
    const summary = buildDocumentSummary([
      { id: "doc-1", file_path: "a.pdf", status: "approved", student_id: "student-1", title: "A" },
      { id: "doc-2", file_path: "b.pdf", status: "pending", student_id: "student-1", title: "B" },
      { id: "doc-3", file_path: "c.pdf", status: "rejected", student_id: "student-1", title: "C" },
    ]);

    expect(summary).toEqual({
      approved: 1,
      pending: 1,
      rejected: 1,
      total: 3,
    });
    expect(getDocumentFilterState(createStudent({ documentSummary: summary }))).toBe("pending");
  });

  it("summarizes payments and keeps the latest transaction", () => {
    const summary = buildPaymentSummary([
      {
        id: "payment-1",
        amount: 15625,
        channel: "MOBILE_MONEY",
        created_at: "2026-01-01T00:00:00.000Z",
        currency: "XAF",
        local_status: "pending",
        student_id: "student-1",
        transaction_id: "TX-1",
      },
      {
        id: "payment-2",
        amount: 15625,
        channel: "MOBILE_MONEY",
        created_at: "2026-01-02T00:00:00.000Z",
        currency: "XAF",
        local_status: "accepted",
        student_id: "student-1",
        transaction_id: "TX-2",
      },
    ]);

    expect(summary.accepted).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.latestTransaction?.transaction_id).toBe("TX-2");
    expect(getPaymentFilterState(createStudent({ paymentSummary: summary }))).toBe("paid");
  });

  it("filters students by search, payment, document, profile, status, and country", () => {
    const matchingStudent = createStudent({
      documentSummary: { approved: 0, pending: 1, rejected: 0, total: 1 },
      paymentSummary: { accepted: 1, failed: 0, latestTransaction: null, pending: 0, total: 1 },
      profile: {
        ...createStudent({}).profile!,
        profile_locked_at: "2026-01-01T00:00:00.000Z",
      },
    });
    const otherStudent = createStudent({
      id: "student-2",
      email: "other@example.com",
      profile: {
        ...createStudent({}).profile!,
        id: "student-2",
        email: "other@example.com",
        first_name: "Jean",
        last_name: "Dupont",
        target_country: "Canada",
      },
    });

    expect(
      filterAdminCRMStudents({
        countryFilter: "France",
        documentFilter: "pending",
        paymentFilter: "paid",
        profileFilter: "validated",
        query: "amina",
        statusFilter: "profile_evaluation",
        students: [matchingStudent, otherStudent],
      }),
    ).toEqual([matchingStudent]);

    expect(buildAdminCRMMetrics([matchingStudent, otherStudent])).toEqual({
      paidConsultations: 1,
      pendingDocuments: 1,
      totalStudents: 2,
      validatedProfiles: 1,
    });
  });
});
