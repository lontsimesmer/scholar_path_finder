import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminTeam } from "@/hooks/use-admin-team";

const mocks = vi.hoisted(() => ({
  fetchAdmins: vi.fn(),
  inviteAdmin: vi.fn(),
  removeAdmin: vi.fn(),
}));

vi.mock("@/lib/admin-team", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-team")>("@/lib/admin-team");
  return {
    ...actual,
    fetchAdmins: mocks.fetchAdmins,
    inviteAdmin: mocks.inviteAdmin,
    removeAdmin: mocks.removeAdmin,
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

const admin = (email: string, iso: string) => ({ email, created_at: iso });

describe("useAdminTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAdmins.mockResolvedValue([
      admin("a@a.com", "2026-01-01T00:00:00.000Z"),
      admin("b@a.com", "2026-01-02T00:00:00.000Z"),
    ]);
  });

  it("loads admins on mount", async () => {
    const { result } = renderHook(() => useAdminTeam());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mocks.fetchAdmins).toHaveBeenCalledOnce();
    expect(result.current.admins.map((a) => a.email)).toEqual(["a@a.com", "b@a.com"]);
  });

  it("returns success and updates the list when invite succeeds", async () => {
    const updated = [
      admin("a@a.com", "2026-01-01T00:00:00.000Z"),
      admin("b@a.com", "2026-01-02T00:00:00.000Z"),
      admin("c@a.com", "2026-01-03T00:00:00.000Z"),
    ];
    mocks.inviteAdmin.mockResolvedValue({ success: true, admins: updated });

    const { result } = renderHook(() => useAdminTeam());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.invite("c@a.com");
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.admins.map((a) => a.email)).toEqual([
      "a@a.com",
      "b@a.com",
      "c@a.com",
    ]);
    expect(mocks.inviteAdmin).toHaveBeenCalledWith("c@a.com");
  });

  it("returns failure message when invite fails and keeps admin list unchanged", async () => {
    mocks.inviteAdmin.mockResolvedValue({
      success: false,
      message: "Email is already an admin",
    });

    const { result } = renderHook(() => useAdminTeam());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.invite("dup@a.com");
    });

    expect(outcome).toEqual({ success: false, message: "Email is already an admin" });
    expect(result.current.admins.map((a) => a.email)).toEqual(["a@a.com", "b@a.com"]);
  });

  it("removes an admin and refreshes the list", async () => {
    const updated = [admin("a@a.com", "2026-01-01T00:00:00.000Z")];
    mocks.removeAdmin.mockResolvedValue({ success: true, admins: updated });

    const { result } = renderHook(() => useAdminTeam());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: { success: boolean; message?: string } = { success: false };
    await act(async () => {
      outcome = await result.current.remove("b@a.com");
    });

    expect(outcome).toEqual({ success: true });
    expect(result.current.admins.map((a) => a.email)).toEqual(["a@a.com"]);
    expect(mocks.removeAdmin).toHaveBeenCalledWith("b@a.com");
  });
});
