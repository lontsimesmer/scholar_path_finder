import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSession, isAdminEmail } from "@/lib/admin-session";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getSession: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    from: mocks.from,
  },
}));

describe("admin session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({
      select: mocks.select,
    });
    mocks.select.mockReturnValue({
      eq: mocks.eq,
    });
    mocks.eq.mockReturnValue({
      maybeSingle: mocks.maybeSingle,
    });
  });

  it("rejects missing emails without querying admins", async () => {
    await expect(isAdminEmail(null)).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("checks admin membership through the admins table", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { email: "admin@example.com" }, error: null });

    await expect(isAdminEmail("admin@example.com")).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith("admins");
    expect(mocks.select).toHaveBeenCalledWith("email");
    expect(mocks.eq).toHaveBeenCalledWith("email", "admin@example.com");
  });

  it("throws when the admin lookup fails", async () => {
    const error = new Error("database unavailable");
    mocks.maybeSingle.mockResolvedValue({ data: null, error });

    await expect(isAdminEmail("admin@example.com")).rejects.toThrow(error);
  });

  it("returns the session only when the authenticated user is an admin", async () => {
    const adminSession = {
      user: {
        email: "admin@example.com",
      },
    };
    mocks.getSession.mockResolvedValue({ data: { session: adminSession } });
    mocks.maybeSingle.mockResolvedValue({ data: { email: "admin@example.com" }, error: null });

    await expect(getAdminSession()).resolves.toBe(adminSession);
  });

  it("returns null when there is no authenticated email or no admin row", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: { user: {} } } });
    await expect(getAdminSession()).resolves.toBeNull();

    mocks.getSession.mockResolvedValueOnce({ data: { session: { user: { email: "user@example.com" } } } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(getAdminSession()).resolves.toBeNull();
  });
});
