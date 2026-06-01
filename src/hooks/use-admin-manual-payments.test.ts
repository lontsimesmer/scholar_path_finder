import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminManualPayments } from "@/hooks/use-admin-manual-payments";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const submissions = [
  {
    id: "sub-1",
    lead_id: "lead-1",
    student_id: "student-1",
    amount: 15625,
    currency: "XAF",
    receipt_path: "student-1/proof.png",
    receipt_mime_type: "image/png",
    sender_name: null,
    sender_phone: null,
    provider_reference: null,
    notes: null,
    status: "pending_review",
    reviewer_email: null,
    reviewer_comment: null,
    reviewed_at: null,
    payment_transaction_id: null,
    metadata: {},
    created_at: "2026-06-01T08:00:00.000Z",
    updated_at: "2026-06-01T08:00:00.000Z",
  },
];

const installSupabaseMocks = () => {
  mocks.from.mockImplementation((table: string) => {
    if (table === "manual_payment_submissions") {
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: submissions, error: null }),
        }),
      };
    }
    if (table === "leads") {
      return {
        select: () => ({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "lead-1",
                email: "lead@example.com",
                name: "Lead Name",
                manual_payment_blocked_at: null,
              },
            ],
            error: null,
          }),
        }),
      };
    }
    if (table === "student_profiles") {
      return {
        select: () => ({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "student-1",
                email: "amina@example.com",
                first_name: "Amina",
                last_name: "Talla",
              },
            ],
            error: null,
          }),
        }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
};

describe("useAdminManualPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installSupabaseMocks();
  });

  it("loads submissions and indexes leads/profiles", async () => {
    const { result } = renderHook(() => useAdminManualPayments());

    await act(async () => {
      await result.current.loadSubmissions();
    });

    expect(result.current.submissions).toEqual(submissions);
    expect(result.current.leadById["lead-1"].name).toBe("Lead Name");
    expect(result.current.profileById["student-1"].first_name).toBe("Amina");
    expect(result.current.isLoading).toBe(false);
  });

  it("calls validate-manual-payment with the approve action and reloads", async () => {
    mocks.invoke.mockResolvedValue({ data: { submissionId: "sub-1" }, error: null });

    const { result } = renderHook(() => useAdminManualPayments());

    let outcome: Awaited<ReturnType<typeof result.current.validateSubmission>> = { success: false };
    await act(async () => {
      outcome = await result.current.validateSubmission("sub-1", "approve");
    });

    expect(outcome).toEqual({ success: true });
    expect(mocks.invoke).toHaveBeenCalledWith("validate-manual-payment", {
      body: { submissionId: "sub-1", action: "approve", comment: undefined },
    });
  });

  it("propagates a rejection error to the caller", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error("nope") });

    const { result } = renderHook(() => useAdminManualPayments());

    let outcome: Awaited<ReturnType<typeof result.current.validateSubmission>> = { success: false };
    await act(async () => {
      outcome = await result.current.validateSubmission("sub-1", "reject", "Bad proof");
    });

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.message).toBe("nope");
    }
    expect(result.current.actionError).toBe("nope");
  });

  it("invokes block-lead-manual-payment with the chosen reason", async () => {
    mocks.invoke.mockResolvedValue({ data: { leadId: "lead-1" }, error: null });

    const { result } = renderHook(() => useAdminManualPayments());

    await act(async () => {
      await result.current.blockLead("lead-1", "Spam");
    });

    expect(mocks.invoke).toHaveBeenCalledWith("block-lead-manual-payment", {
      body: { leadId: "lead-1", reason: "Spam", unblock: false },
    });
  });
});
