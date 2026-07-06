import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAdmins,
  filterAdmins,
  inviteAdmin,
  isValidAdminEmail,
  normalizeAdminEmail,
  removeAdmin,
  sortAdmins,
  type AdminTeamMember,
} from "@/lib/admin-team";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

const make = (overrides: Partial<AdminTeamMember>): AdminTeamMember => ({
  email: "user@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("admin-team helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidAdminEmail", () => {
    it("accepts standard emails", () => {
      expect(isValidAdminEmail("user@example.com")).toBe(true);
      expect(isValidAdminEmail("  User@Example.Com  ")).toBe(true);
    });

    it("rejects malformed strings", () => {
      expect(isValidAdminEmail("")).toBe(false);
      expect(isValidAdminEmail("user")).toBe(false);
      expect(isValidAdminEmail("user@")).toBe(false);
      expect(isValidAdminEmail("user@example")).toBe(false);
      // @ts-expect-error - guard against non-string input
      expect(isValidAdminEmail(undefined)).toBe(false);
    });
  });

  it("normalizes emails to lowercase and trims whitespace", () => {
    expect(normalizeAdminEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("sorts admins by creation date ascending", () => {
    const admins = [
      make({ email: "c@a.com", created_at: "2026-01-03T00:00:00.000Z" }),
      make({ email: "a@a.com", created_at: "2026-01-01T00:00:00.000Z" }),
      make({ email: "b@a.com", created_at: "2026-01-02T00:00:00.000Z" }),
    ];
    expect(sortAdmins(admins).map((admin) => admin.email)).toEqual([
      "a@a.com",
      "b@a.com",
      "c@a.com",
    ]);
  });

  it("filters admins by case-insensitive email substring", () => {
    const admins = [
      make({ email: "alice@example.com" }),
      make({ email: "bob@example.com" }),
      make({ email: "charlie@other.com" }),
    ];
    expect(filterAdmins(admins, "  EXAMPLE ").map((admin) => admin.email)).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    expect(filterAdmins(admins, "").length).toBe(3);
  });

  describe("fetchAdmins", () => {
    it("invokes the edge function with GET and returns sorted admins", async () => {
      mocks.invoke.mockResolvedValue({
        data: {
          admins: [
            make({ email: "b@a.com", created_at: "2026-01-02T00:00:00.000Z" }),
            make({ email: "a@a.com", created_at: "2026-01-01T00:00:00.000Z" }),
          ],
        },
        error: null,
      });

      const result = await fetchAdmins();

      expect(mocks.invoke).toHaveBeenCalledWith("admin-team", {
        method: "GET",
        body: undefined,
      });
      expect(result.map((admin) => admin.email)).toEqual(["a@a.com", "b@a.com"]);
    });

    it("propagates errors from the edge function", async () => {
      mocks.invoke.mockResolvedValue({ data: null, error: new Error("boom") });
      await expect(fetchAdmins()).rejects.toThrow("boom");
    });
  });

  describe("inviteAdmin", () => {
    it("returns a validation error for malformed emails without calling the function", async () => {
      const result = await inviteAdmin("not-an-email");
      expect(result).toEqual({ success: false, message: "Invalid email format" });
      expect(mocks.invoke).not.toHaveBeenCalled();
    });

    it("normalizes email and returns success with updated admin list", async () => {
      const admins = [make({ email: "new@example.com" })];
      mocks.invoke.mockResolvedValue({
        data: { ok: true, admins },
        error: null,
      });

      const result = await inviteAdmin("  New@Example.com ");

      expect(mocks.invoke).toHaveBeenCalledWith("admin-team", {
        method: "POST",
        body: { email: "new@example.com" },
      });
      expect(result).toEqual({ success: true, admins });
    });

    it("returns a failure result when the edge function fails", async () => {
      mocks.invoke.mockResolvedValue({
        data: null,
        error: new Error("Email is already an admin"),
      });

      const result = await inviteAdmin("dup@example.com");

      expect(result).toEqual({
        success: false,
        message: "Email is already an admin",
      });
    });
  });

  describe("removeAdmin", () => {
    it("calls the edge function with DELETE and returns updated list", async () => {
      const admins = [make({ email: "still@example.com" })];
      mocks.invoke.mockResolvedValue({
        data: { ok: true, admins },
        error: null,
      });

      const result = await removeAdmin("  Removed@Example.com ");

      expect(mocks.invoke).toHaveBeenCalledWith("admin-team", {
        method: "DELETE",
        body: { email: "removed@example.com" },
      });
      expect(result).toEqual({ success: true, admins });
    });

    it("returns a failure result on server error", async () => {
      mocks.invoke.mockResolvedValue({
        data: null,
        error: new Error("You cannot remove yourself"),
      });

      const result = await removeAdmin("self@example.com");
      expect(result).toEqual({
        success: false,
        message: "You cannot remove yourself",
      });
    });
  });
});
