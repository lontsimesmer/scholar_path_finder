import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCheckout } from "@/hooks/use-checkout";

const mocks = vi.hoisted(() => ({
  ensureStudentProfile: vi.fn(),
  getSession: vi.fn(),
  hasValidatedProcedureProfile: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("@/lib/student-profile", () => ({
  ensureStudentProfile: mocks.ensureStudentProfile,
  hasValidatedProcedureProfile: mocks.hasValidatedProcedureProfile,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const text = {
  profileRequiredDescription: "Completez votre profil",
  profileRequiredTitle: "Profil requis",
  unavailableDescription: "Paiement indisponible",
  unavailableTitle: "Indisponible",
};

const renderCheckoutHook = (overrides = {}) => {
  const navigate = vi.fn();
  const toast = vi.fn();
  const hook = renderHook(() =>
    useCheckout({
      navigate,
      requestedEmail: "student@example.com",
      requestedLeadId: "lead-1",
      searchQuery: "leadId=lead-1&email=student%40example.com",
      text,
      toast,
      ...overrides,
    }),
  );

  return { ...hook, navigate, toast };
};

describe("useCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("redirects away when checkout has no lead id", () => {
    const { navigate, toast } = renderCheckoutHook({ requestedLeadId: null });

    expect(toast).toHaveBeenCalledWith({
      description: "Paiement indisponible",
      title: "Indisponible",
      variant: "destructive",
    });
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("redirects unauthenticated visitors to login with checkout context", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    const { navigate } = renderCheckoutHook();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "/login?redirect=%2Fcheckout%3FleadId%3Dlead-1%26email%3Dstudent%2540example.com&email=student%40example.com",
        { replace: true },
      );
    });
  });

  it("loads an authenticated checkout when the profile is valid", async () => {
    const user = { id: "student-1", email: "student@example.com" };
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.ensureStudentProfile.mockResolvedValue({
      first_name: "Amina",
      last_name: "Talla",
    });
    mocks.hasValidatedProcedureProfile.mockReturnValue(true);

    const { result } = renderCheckoutHook();

    await waitFor(() => {
      expect(result.current.viewModel.isLoading).toBe(false);
    });
    expect(result.current.viewModel).toMatchObject({
      identity: {
        first_name: "Amina",
        last_name: "Talla",
      },
      leadId: "lead-1",
      paymentMethod: "mobile_money",
      user: {
        email: "student@example.com",
      },
    });
  });

  it("blocks checkout until the profile is completed", async () => {
    const user = { id: "student-1", email: "student@example.com" };
    mocks.getSession.mockResolvedValue({ data: { session: { user } } });
    mocks.ensureStudentProfile.mockResolvedValue({});
    mocks.hasValidatedProcedureProfile.mockReturnValue(false);

    const { navigate, toast } = renderCheckoutHook();

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        description: "Completez votre profil",
        title: "Profil requis",
      });
    });
    expect(navigate).toHaveBeenCalledWith(
      "/dashboard?redirect=%2Fcheckout%3FleadId%3Dlead-1%26email%3Dstudent%2540example.com",
      { replace: true },
    );
  });
});
