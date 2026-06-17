import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotifications } from "@/hooks/use-notifications";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

type StubNotification = {
  id: string;
  read_at: string | null;
};

/**
 * Build a chainable + thenable mock that mimics PostgrestFilterBuilder:
 * every filter method returns the same object, and awaiting it yields the
 * provided result.
 */
const buildThenableMock = (result: { data?: unknown; error: unknown }) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: (onFulfilled: (value: typeof result) => unknown) => Promise<unknown>;
  } = {
    select: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    not: vi.fn(),
    lt: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    then: (onFulfilled) => Promise.resolve(result).then(onFulfilled),
  };
  for (const key of Object.keys(chain)) {
    if (key === "then") continue;
    (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain;
};

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no notifications when no recipient is provided", async () => {
    const { result } = renderHook(() => useNotifications({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("purges expired notifications then loads the visible ones", async () => {
    const data: StubNotification[] = [
      { id: "n1", read_at: null },
      { id: "n2", read_at: null },
      { id: "n3", read_at: "2026-05-31T10:00:00.000Z" },
    ];
    const deleteChain = buildThenableMock({ data: null, error: null });
    const selectChain = buildThenableMock({ data, error: null });

    mocks.from.mockImplementation(() => ({
      delete: deleteChain.delete,
      select: selectChain.select,
    }));

    const { result } = renderHook(() => useNotifications({ userId: "user-1" }));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(3);
    });

    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.not).toHaveBeenCalledWith("read_at", "is", null);
    expect(deleteChain.lt).toHaveBeenCalledWith("read_at", expect.any(String));
    expect(deleteChain.eq).toHaveBeenCalledWith("recipient_user_id", "user-1");

    expect(selectChain.select).toHaveBeenCalledWith("*");
    expect(selectChain.or).toHaveBeenCalledWith(
      expect.stringContaining("read_at.is.null"),
    );
    expect(selectChain.eq).toHaveBeenCalledWith("recipient_user_id", "user-1");
    expect(result.current.unreadCount).toBe(2);
  });

  it("optimistically marks a notification as read", async () => {
    const data: StubNotification[] = [{ id: "n1", read_at: null }];
    const deleteChain = buildThenableMock({ data: null, error: null });
    const selectChain = buildThenableMock({ data, error: null });
    const updateChain = buildThenableMock({ data: null, error: null });

    mocks.from.mockImplementation(() => ({
      delete: deleteChain.delete,
      select: selectChain.select,
      update: updateChain.update,
    }));

    const { result } = renderHook(() => useNotifications({ userId: "user-1" }));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markRead("n1");
    });

    expect(updateChain.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
    expect(updateChain.eq).toHaveBeenCalledWith("id", "n1");
    expect(updateChain.is).toHaveBeenCalledWith("read_at", null);
    expect(result.current.notifications[0].read_at).not.toBeNull();
  });
});
