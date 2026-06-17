import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useContactVerification } from "@/hooks/use-contact-verification";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
  navigate: vi.fn(),
  readSupabaseFunctionError: vi.fn(),
  searchParams: new URLSearchParams(),
  toast: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [mocks.searchParams],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const verificationText = {
  alreadyVerifiedDescription: "Deja verifie",
  alreadyVerifiedTitle: "Verification terminee",
  backToLogin: "Retour connexion",
  codeHint: "Saisissez le code",
  codeLabel: "Code",
  emailChannelDescription: "Email",
  emailChannelLabel: "email",
  intro: "Verification",
  invalidLinkDescription: "Lien invalide",
  invalidLinkTitle: "Lien invalide",
  loading: "Chargement",
  resendButton: "Renvoyer",
  sendingButton: "Envoi",
  sentDescription: "Code envoye par {channel}",
  sentTitle: "Code envoye",
  signInDescription: "Connectez-vous",
  signInTitle: "Connexion",
  smsChannelDescription: "SMS",
  smsChannelLabel: "SMS",
  subtitle: "Verification",
  switchChannel: "Changer",
  title: "Verification",
  verifiedDescription: "Compte verifie",
  verifiedTitle: "Verifie",
  verifyButton: "Verifier",
  verifyingButton: "Verification",
};

vi.mock("@/i18n/language", () => ({
  useLanguage: () => ({
    language: "fr",
    t: {
      verification: verificationText,
    },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

vi.mock("@/lib/supabase-function-errors", () => ({
  readSupabaseFunctionError: mocks.readSupabaseFunctionError,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const pendingEmailStatus = {
  channels: {
    email: { maskedDestination: "a***@example.com", required: true, verified: false },
    sms: { maskedDestination: null, required: false, verified: false },
  },
  completedChannels: [],
  enabled: true,
  pendingChannels: ["email"],
  verificationRequired: true,
};

describe("useContactVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams("token=token-1&email=student%40example.com&channels=email,sms&redirect=/dashboard");
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.readSupabaseFunctionError.mockResolvedValue({ code: undefined, message: "Erreur verification" });
    mocks.invoke.mockImplementation((functionName: string) => {
      if (functionName === "get-contact-verification-status") {
        return Promise.resolve({ data: pendingEmailStatus, error: null });
      }
      if (functionName === "send-contact-verification-code") {
        return Promise.resolve({
          data: {
            challengeId: "challenge-1",
            cooldownSeconds: 30,
            enabled: true,
            expiresAt: "2026-01-01T00:05:00.000Z",
            maskedDestination: "a***@example.com",
            verificationRequired: true,
          },
          error: null,
        });
      }
      if (functionName === "verify-contact-verification-code") {
        return Promise.resolve({
          data: {
            channel: "email",
            completedChannels: ["email"],
            enabled: true,
            fullyVerified: true,
            pendingChannels: [],
            success: true,
          },
          error: null,
        });
      }
      throw new Error(`Unexpected function ${functionName}`);
    });
  });

  it("loads public token status and automatically sends the first pending code", async () => {
    const { result } = renderHook(() => useContactVerification());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.currentChallenge.challengeId).toBe("challenge-1");
    });

    expect(mocks.invoke).toHaveBeenCalledWith("get-contact-verification-status", {
      body: { token: "token-1" },
    });
    expect(mocks.invoke).toHaveBeenCalledWith("send-contact-verification-code", {
      body: {
        channel: "email",
        locale: "fr",
        requestedChannels: ["email", "sms"],
        token: "token-1",
      },
    });
    expect(result.current.currentChannel).toBe("email");
    expect(result.current.currentDestination).toBe("a***@example.com");
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Code envoye par email",
      title: "Code envoye",
    });
  });

  it("verifies a complete public challenge then redirects to login with context", async () => {
    const { result } = renderHook(() => useContactVerification());

    await waitFor(() => {
      expect(result.current.currentChallenge.challengeId).toBe("challenge-1");
    });

    act(() => {
      result.current.setCode("123456");
    });
    await act(async () => {
      await result.current.handleVerify();
    });

    expect(mocks.invoke).toHaveBeenCalledWith("verify-contact-verification-code", {
      body: {
        challengeId: "challenge-1",
        code: "123456",
        token: "token-1",
      },
    });
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Compte verifie",
      title: "Verifie",
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/login?email=student%40example.com&redirect=%2Fdashboard", {
      replace: true,
    });
  });

  it("marks authenticated verification links invalid when there is no session", async () => {
    mocks.searchParams = new URLSearchParams("redirect=/dashboard");

    const { result } = renderHook(() => useContactVerification());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isInvalidLink).toBe(true);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("shows function errors when sending a code fails", async () => {
    mocks.invoke.mockImplementation((functionName: string) => {
      if (functionName === "get-contact-verification-status") {
        return Promise.resolve({ data: pendingEmailStatus, error: null });
      }
      return Promise.reject(new Error("send failed"));
    });
    mocks.readSupabaseFunctionError.mockResolvedValue({ code: "RATE_LIMITED", message: "Trop de tentatives" });

    renderHook(() => useContactVerification());

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        description: "Trop de tentatives",
        title: "Lien invalide",
        variant: "destructive",
      });
    });
  });
});
