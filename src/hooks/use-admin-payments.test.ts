import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminPayments } from "@/hooks/use-admin-payments";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const transactions = [
  {
    id: "payment-1",
    lead_id: "lead-1",
    student_id: "student-1",
    transaction_id: "TX-1",
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("useAdminPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads payments and indexes related leads and profiles", async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === "payment_transactions") {
        return {
          select: () => ({
            order: mocks.order.mockResolvedValue({ data: transactions, error: null }),
          }),
        };
      }

      if (table === "leads") {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: "lead-1", email: "lead@example.com" }],
              error: null,
            }),
          }),
        };
      }

      if (table === "student_profiles") {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: "student-1", email: "student@example.com", first_name: "Amina", last_name: "Talla" }],
              error: null,
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = renderHook(() => useAdminPayments());

    await act(async () => {
      await result.current.loadPayments();
    });

    expect(result.current.transactions).toEqual(transactions);
    expect(result.current.leadById["lead-1"].email).toBe("lead@example.com");
    expect(result.current.profileById["student-1"].first_name).toBe("Amina");
    expect(result.current.isLoading).toBe(false);
  });

  it("skips related queries when there are no payments", async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        order: mocks.order.mockResolvedValue({ data: [], error: null }),
      }),
    });

    const { result } = renderHook(() => useAdminPayments());

    await act(async () => {
      await result.current.loadPayments();
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.leadById).toEqual({});
    expect(result.current.profileById).toEqual({});
  });
});
