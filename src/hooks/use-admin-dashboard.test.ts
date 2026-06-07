import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getAdminSession: vi.fn(),
  in: vi.fn(),
  navigate: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/lib/admin-session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: mocks.signOut,
    },
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

const createCountQuery = (count: number) => ({
  count,
  error: null,
});

describe("useAdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("redirects non-admin visitors to login", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    renderHook(() => useAdminDashboard());

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/login?redirect=/admin", { replace: true });
    });
  });

  it("loads dashboard stats for admins", async () => {
    let leadsQueryCount = 0;
    mocks.from.mockImplementation((table: string) => {
      if (table === "student_applications") {
        return { select: vi.fn().mockResolvedValue(createCountQuery(3)) };
      }
      if (table === "blog_posts") {
        return { select: () => ({ eq: vi.fn().mockResolvedValue(createCountQuery(2)) }) };
      }
      if (table === "leads") {
        return {
          select: vi.fn(() => {
            leadsQueryCount += 1;
            if (leadsQueryCount === 1) {
              return Promise.resolve(createCountQuery(8));
            }

            return { eq: vi.fn().mockResolvedValue(createCountQuery(4)) };
          }),
        };
      }
      if (table === "payment_transactions") {
        return { select: () => ({ in: vi.fn().mockResolvedValue(createCountQuery(1)) }) };
      }
      if (table === "student_documents") {
        return { select: () => ({ eq: vi.fn().mockResolvedValue(createCountQuery(5)) }) };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = renderHook(() => useAdminDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.stats).toEqual({
      activeStudents: 3,
      paidConsultations: 4,
      pendingDocuments: 5,
      pendingPayments: 1,
      publishedPosts: 2,
      totalLeads: 8,
    });
  });

  it("signs out and returns to the public home", async () => {
    mocks.from.mockReturnValue({ select: vi.fn().mockResolvedValue(createCountQuery(0)) });
    const { result } = renderHook(() => useAdminDashboard());

    await act(async () => {
      await result.current.handleSignOut();
    });

    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });
});
