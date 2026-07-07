import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminNotifications } from "@/hooks/use-admin-notifications";

const mocks = vi.hoisted(() => ({
  fetchRecipients: vi.fn(),
  addRecipient: vi.fn(),
  removeRecipient: vi.fn(),
}));

vi.mock("@/lib/admin-notifications", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-notifications")>(
    "@/lib/admin-notifications",
  );
  return {
    ...actual,
    fetchRecipients: mocks.fetchRecipients,
    addRecipient: mocks.addRecipient,
    removeRecipient: mocks.removeRecipient,
  };
});

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

describe("useAdminNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchRecipients.mockResolvedValue(["a@a.com", "b@a.com"]);
  });

  it("loads recipients on mount", async () => {
    const { result } = renderHook(() => useAdminNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.emails).toEqual(["a@a.com", "b@a.com"]);
  });

  it("adds a recipient and refreshes the list on success", async () => {
    mocks.addRecipient.mockResolvedValue({
      success: true,
      emails: ["a@a.com", "b@a.com", "c@a.com"],
    });

    const { result } = renderHook(() => useAdminNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.add("c@a.com");
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.emails).toEqual(["a@a.com", "b@a.com", "c@a.com"]);
  });

  it("keeps the list unchanged on add failure", async () => {
    mocks.addRecipient.mockResolvedValue({
      success: false,
      message: "Email is already a recipient",
    });

    const { result } = renderHook(() => useAdminNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.add("dup@a.com");
    });

    expect(outcome).toEqual({ success: false, message: "Email is already a recipient" });
    expect(result.current.emails).toEqual(["a@a.com", "b@a.com"]);
  });

  it("removes a recipient on success", async () => {
    mocks.removeRecipient.mockResolvedValue({
      success: true,
      emails: ["a@a.com"],
    });

    const { result } = renderHook(() => useAdminNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.remove("b@a.com");
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.emails).toEqual(["a@a.com"]);
  });
});
