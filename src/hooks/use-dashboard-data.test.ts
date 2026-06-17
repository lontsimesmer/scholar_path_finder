import { renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardData } from "@/hooks/use-dashboard-data";

const mocks = vi.hoisted(() => ({
  ensureStudentProfile: vi.fn(),
  from: vi.fn(),
  functionsInvoke: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

vi.mock("@/lib/student-profile", () => ({
  ensureStudentProfile: mocks.ensureStudentProfile,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const user = {
  id: "student-1",
  email: "student@example.com",
} as User;

const profile = {
  birth_date: "2000-01-01",
  email: "student@example.com",
  first_name: "Amina",
  id: "student-1",
  last_name: "Talla",
  phone_number: "+237612345678",
  profile_invalidated_at: null,
  profile_locked_at: "2026-01-01T00:00:00.000Z",
  profile_validation_comment: null,
};

const createApplicationChain = () => ({
  select: () => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "app-1", notes: "", status: "profile_evaluation", updated_at: "2026-01-01T00:00:00.000Z" },
            error: null,
          }),
        })),
      })),
    })),
  }),
});

const createDocumentsChain = () => ({
  select: () => ({
    eq: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [{ created_at: "2026-01-01T00:00:00.000Z", file_path: "student-1/passport.pdf", id: "doc-1", status: "pending", title: "Passeport" }],
        error: null,
      }),
    })),
  }),
});

const createDocumentRequestsChain = () => ({
  select: () => ({
    eq: vi.fn(() => ({
      neq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [{ created_at: "2026-01-01T00:00:00.000Z", fulfilled_document_id: null, id: "request-1", status: "pending", title: "Releve" }],
          error: null,
        }),
      })),
    })),
  }),
});

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mocks.ensureStudentProfile.mockResolvedValue(profile);
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        lead: {
          createdAt: "2026-01-01T00:00:00.000Z",
          email: "student@example.com",
          leadId: "lead-1",
          leadStatus: "pending",
          paymentStatus: "paid",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === "student_applications") {
        return createApplicationChain();
      }
      if (table === "student_documents") {
        return createDocumentsChain();
      }
      if (table === "student_document_requests") {
        return createDocumentRequestsChain();
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it("redirects unauthenticated users to login", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const navigate = vi.fn();
    const onLoadError = vi.fn();

    renderHook(() => useDashboardData({ navigate, onLoadError }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/login?redirect=/dashboard", { replace: true });
    });
    expect(onLoadError).not.toHaveBeenCalled();
  });

  it("loads profile, application, procedure lead, documents, and document requests", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    const navigate = vi.fn();
    const onLoadError = vi.fn();

    const { result } = renderHook(() => useDashboardData({ navigate, onLoadError }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.id).toBe("student-1");
    expect(result.current.profile?.first_name).toBe("Amina");
    expect(result.current.formData.first_name).toBe("Amina");
    expect(result.current.application?.status).toBe("profile_evaluation");
    expect(result.current.procedureLead?.leadId).toBe("lead-1");
    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documentRequests).toHaveLength(1);
  });

  it("reports unexpected load errors", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.ensureStudentProfile.mockRejectedValue(new Error("profile failed"));
    const onLoadError = vi.fn();

    const { result } = renderHook(() => useDashboardData({ navigate: vi.fn(), onLoadError }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(onLoadError).toHaveBeenCalledWith("profile failed");
  });
});
