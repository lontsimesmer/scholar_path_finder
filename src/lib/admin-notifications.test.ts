import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addRecipient,
  fetchRecipients,
  filterRecipients,
  isValidNotificationEmail,
  normalizeNotificationEmail,
  removeRecipient,
  sortRecipients,
} from "@/lib/admin-notifications";

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

describe("admin-notifications helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidNotificationEmail", () => {
    it("accepts well-formed emails", () => {
      expect(isValidNotificationEmail("user@example.com")).toBe(true);
      expect(isValidNotificationEmail("  User@Example.COM  ")).toBe(true);
    });

    it("rejects malformed strings", () => {
      expect(isValidNotificationEmail("")).toBe(false);
      expect(isValidNotificationEmail("user")).toBe(false);
      expect(isValidNotificationEmail("user@")).toBe(false);
      expect(isValidNotificationEmail("user@x")).toBe(false);
      // @ts-expect-error - guard against non-string input
      expect(isValidNotificationEmail(undefined)).toBe(false);
    });
  });

  it("normalizes emails", () => {
    expect(normalizeNotificationEmail(" User@Example.COM ")).toBe("user@example.com");
  });

  it("sorts recipients alphabetically", () => {
    expect(sortRecipients(["c@a.com", "a@a.com", "b@a.com"])).toEqual([
      "a@a.com",
      "b@a.com",
      "c@a.com",
    ]);
  });

  it("filters by case-insensitive substring", () => {
    expect(filterRecipients(["a@a.com", "b@b.com"], " A@ ")).toEqual(["a@a.com"]);
    expect(filterRecipients(["a@a.com", "b@b.com"], "")).toEqual(["a@a.com", "b@b.com"]);
  });

  describe("fetchRecipients", () => {
    it("invokes GET and returns sorted emails", async () => {
      mocks.invoke.mockResolvedValue({
        data: { emails: ["c@a.com", "a@a.com"] },
        error: null,
      });
      const result = await fetchRecipients();
      expect(mocks.invoke).toHaveBeenCalledWith("admin-notification-recipients", {
        method: "GET",
        body: undefined,
      });
      expect(result).toEqual(["a@a.com", "c@a.com"]);
    });

    it("propagates errors", async () => {
      mocks.invoke.mockResolvedValue({ data: null, error: new Error("boom") });
      await expect(fetchRecipients()).rejects.toThrow("boom");
    });
  });

  describe("addRecipient", () => {
    it("returns validation error for malformed email", async () => {
      const result = await addRecipient("not-an-email");
      expect(result).toEqual({ success: false, message: "Invalid email format" });
      expect(mocks.invoke).not.toHaveBeenCalled();
    });

    it("normalizes email and returns updated list", async () => {
      mocks.invoke.mockResolvedValue({
        data: { ok: true, emails: ["a@a.com", "new@a.com"] },
        error: null,
      });
      const result = await addRecipient("  New@A.com ");
      expect(mocks.invoke).toHaveBeenCalledWith("admin-notification-recipients", {
        method: "POST",
        body: { email: "new@a.com" },
      });
      expect(result).toEqual({ success: true, emails: ["a@a.com", "new@a.com"] });
    });

    it("returns failure on server error", async () => {
      mocks.invoke.mockResolvedValue({
        data: null,
        error: new Error("Email is already a recipient"),
      });
      const result = await addRecipient("dup@a.com");
      expect(result).toEqual({
        success: false,
        message: "Email is already a recipient",
      });
    });
  });

  describe("removeRecipient", () => {
    it("calls DELETE and returns updated list", async () => {
      mocks.invoke.mockResolvedValue({
        data: { ok: true, emails: ["a@a.com"] },
        error: null,
      });
      const result = await removeRecipient("  B@A.com ");
      expect(mocks.invoke).toHaveBeenCalledWith("admin-notification-recipients", {
        method: "DELETE",
        body: { email: "b@a.com" },
      });
      expect(result).toEqual({ success: true, emails: ["a@a.com"] });
    });

    it("returns failure on server error", async () => {
      mocks.invoke.mockResolvedValue({
        data: null,
        error: new Error("Cannot remove the last recipient"),
      });
      const result = await removeRecipient("last@a.com");
      expect(result).toEqual({
        success: false,
        message: "Cannot remove the last recipient",
      });
    });
  });
});
