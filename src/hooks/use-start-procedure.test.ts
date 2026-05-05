import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStartProcedure } from "@/hooks/use-start-procedure";
import type { StartProcedureText } from "@/lib/start-procedure";

const mocks = vi.hoisted(() => ({
  clearProcedureDraft: vi.fn(),
  ensureStudentProfile: vi.fn(),
  functionsInvoke: vi.fn(),
  getSession: vi.fn(),
  hasValidatedProcedureProfile: vi.fn(),
  loadProcedureDraft: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

vi.mock("@/lib/procedure-draft", () => ({
  clearProcedureDraft: mocks.clearProcedureDraft,
  loadProcedureDraft: mocks.loadProcedureDraft,
}));

vi.mock("@/lib/student-profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/student-profile")>("@/lib/student-profile");
  return {
    ...actual,
    ensureStudentProfile: mocks.ensureStudentProfile,
    hasValidatedProcedureProfile: mocks.hasValidatedProcedureProfile,
  };
});

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

vi.mock("@/lib/supabase-function-errors", () => ({
  readSupabaseFunctionError: async (error: unknown) => ({
    code: undefined,
    message: error instanceof Error ? error.message : "",
  }),
}));

const text = {
  loadErrorDescription: "Chargement impossible",
  loadErrorTitle: "Erreur",
  phoneAlreadyUsedDescription: "Telephone deja utilise",
  phoneAlreadyUsedTitle: "Telephone utilise",
  submitErrorDescription: "Soumission impossible",
  submitErrorTitle: "Erreur",
  submitSuccessDescription: "Continuez vers le paiement",
  submitSuccessTitle: "Procedure creee",
} as StartProcedureText;

const user = {
  id: "student-1",
  email: "student@example.com",
} as User;

const validProfile = {
  id: "student-1",
  email: "student@example.com",
  first_name: "Amina",
  last_name: "Talla",
  birth_date: "2000-01-01",
  phone_number: "+237612345678",
  profile_locked_at: "2026-01-01T00:00:00.000Z",
  profile_validation_comment: null,
  profile_invalidated_at: null,
  current_degree: null,
  target_country: null,
  target_program: null,
};

const renderStartProcedureHook = () => {
  const navigate = vi.fn();
  const toast = vi.fn();
  const hook = renderHook(() =>
    useStartProcedure({
      language: "fr",
      navigate,
      notSpecified: "Non renseigne",
      text,
      toast,
    }),
  );

  return { ...hook, navigate, toast };
};

describe("useStartProcedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mocks.loadProcedureDraft.mockReturnValue(null);
    mocks.hasValidatedProcedureProfile.mockReturnValue(true);
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        lead: null,
      },
      error: null,
    });
  });

  it("redirects unauthenticated users to login", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    const { navigate } = renderStartProcedureHook();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/login?redirect=/start-procedure", { replace: true });
    });
  });

  it("loads profile, draft phone data, and procedure status for authenticated users", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.ensureStudentProfile.mockResolvedValue(validProfile);
    mocks.loadProcedureDraft.mockReturnValue({
      countryCode: "+33",
      email: "student@example.com",
      firstName: "Amina",
      lastName: "Talla",
      message: "Projet master",
      phone: "612345678",
    });
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        lead: {
          createdAt: "2026-01-01T00:00:00.000Z",
          email: "student@example.com",
          leadId: "lead-1",
          leadStatus: "pending",
          paymentStatus: "unpaid",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      error: null,
    });

    const { result } = renderStartProcedureHook();

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });
    expect(result.current.state).toMatchObject({
      countryCode: "+33",
      message: "Projet master",
      paymentCheckoutPath: "/checkout?leadId=lead-1&email=student%40example.com",
      paymentRequiresAction: true,
      phone: "612345678",
      profileDisplayName: "Amina Talla",
      profileReadyForProcedure: true,
    });
  });

  it("submits a validated procedure request and redirects to checkout", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.ensureStudentProfile.mockResolvedValue(validProfile);
    mocks.functionsInvoke
      .mockResolvedValueOnce({ data: { lead: null }, error: null })
      .mockResolvedValueOnce({ data: { leadId: "lead-2" }, error: null });

    const { navigate, result, toast } = renderStartProcedureHook();

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    act(() => {
      result.current.setters.setPhone("612345678");
      result.current.setters.setMessage("Je veux continuer");
    });

    await act(async () => {
      await result.current.actions.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(mocks.functionsInvoke).toHaveBeenLastCalledWith("submit-lead", {
      body: {
        email: "student@example.com",
        message: "Je veux continuer",
        name: "Amina Talla",
        phone: "+237612345678",
      },
    });
    expect(mocks.clearProcedureDraft).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      description: "Continuez vers le paiement",
      title: "Procedure creee",
    });
    expect(navigate).toHaveBeenCalledWith("/checkout?leadId=lead-2&email=student%40example.com", {
      replace: true,
    });
  });
});
