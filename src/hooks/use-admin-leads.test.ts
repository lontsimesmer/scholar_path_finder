import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminLeads } from "@/hooks/use-admin-leads";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  orderCreatedAt: vi.fn(),
  orderUpdatedAt: vi.fn(),
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

describe("useAdminLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ order: mocks.orderUpdatedAt });
    mocks.orderUpdatedAt.mockReturnValue({ order: mocks.orderCreatedAt });
  });

  it("loads leads ordered by update and creation date", async () => {
    const leads = [{ id: "lead-1", email: "lead@example.com" }];
    mocks.orderCreatedAt.mockResolvedValue({ data: leads, error: null });

    const { result } = renderHook(() => useAdminLeads());

    await act(async () => {
      await result.current.loadLeads();
    });

    expect(mocks.from).toHaveBeenCalledWith("leads");
    expect(mocks.orderUpdatedAt).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(mocks.orderCreatedAt).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result.current.leads).toEqual(leads);
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps filter state independently from loading", async () => {
    mocks.orderCreatedAt.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useAdminLeads());

    act(() => {
      result.current.setSearchQuery("amina");
      result.current.setPaymentFilter("paid");
      result.current.setPipelineFilter("follow_up");
    });

    await waitFor(() => {
      expect(result.current.searchQuery).toBe("amina");
    });
    expect(result.current.paymentFilter).toBe("paid");
    expect(result.current.pipelineFilter).toBe("follow_up");
  });
});
