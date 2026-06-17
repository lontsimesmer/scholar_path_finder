import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useContactForm } from "@/hooks/use-contact-form";

const mocks = vi.hoisted(() => ({
  clearProcedureDraft: vi.fn(),
  ensureStudentProfile: vi.fn(),
  functionsInvoke: vi.fn(),
  getSession: vi.fn(),
  hasValidatedProcedureProfile: vi.fn(),
  loadProcedureDraft: vi.fn(),
  navigate: vi.fn(),
  onAuthStateChange: vi.fn(),
  readSupabaseFunctionError: vi.fn(),
  saveProcedureDraft: vi.fn(),
  signInWithPassword: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const contactFormText = {
  accountCreatedDescription: "Compte cree",
  accountCreatedTitle: "Compte cree",
  completeProfileAction: "Completer",
  completeProfileDescription: "Profil requis",
  completeProfileTitle: "Profil requis",
  confirmPassword: "Confirmation",
  confirmPasswordPlaceholder: "Confirmation",
  createAccountAndSubmit: "Creer",
  createAccountHint: "Creer un compte",
  email: "Email",
  emailPlaceholder: "email",
  errorMessage: "Erreur formulaire",
  errorTitle: "Erreur",
  existingAccountDescription: "Connectez-vous",
  existingAccountTitle: "Compte existant",
  firstName: "Prenom",
  firstNamePlaceholder: "Prenom",
  lastName: "Nom",
  lastNamePlaceholder: "Nom",
  message: "Message",
  messagePlaceholder: "Message",
  password: "Mot de passe",
  passwordMismatchDescription: "Les mots de passe ne correspondent pas",
  passwordMismatchTitle: "Mot de passe invalide",
  passwordPlaceholder: "Mot de passe",
  passwordRequiredDescription: "Mot de passe requis",
  passwordRequiredTitle: "Mot de passe requis",
  phone: "Telephone",
  phoneAlreadyUsedDescription: "Telephone deja utilise",
  phoneAlreadyUsedTitle: "Telephone utilise",
  privacyNote: "Confidentialite",
  signedInHint: "Connecte",
  submitProcedure: "Envoyer",
  successMessage: "Procedure envoyee",
  successTitle: "Succes",
  title: "Contact",
  verificationPendingDescription: "Verification requise",
  verificationPendingTitle: "Verification requise",
};

vi.mock("@/i18n/language", () => ({
  useLanguage: () => ({
    t: {
      contact: {
        form: contactFormText,
      },
    },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
    },
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

vi.mock("@/lib/procedure-draft", () => ({
  clearProcedureDraft: mocks.clearProcedureDraft,
  loadProcedureDraft: mocks.loadProcedureDraft,
  saveProcedureDraft: mocks.saveProcedureDraft,
}));

vi.mock("@/lib/student-profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/student-profile")>("@/lib/student-profile");
  return {
    ...actual,
    ensureStudentProfile: mocks.ensureStudentProfile,
    hasValidatedProcedureProfile: mocks.hasValidatedProcedureProfile,
  };
});

vi.mock("@/lib/supabase-function-errors", () => ({
  readSupabaseFunctionError: mocks.readSupabaseFunctionError,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const authenticatedUser = {
  id: "student-1",
  email: "student@example.com",
} as User;

const validatedProfile = {
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

const createSubmitEvent = () =>
  ({
    preventDefault: vi.fn(),
  }) as unknown as React.FormEvent;

const changeField = (
  result: ReturnType<typeof renderHook<ReturnType<typeof useContactForm>, unknown>>["result"],
  name: string,
  value: string,
) => {
  act(() => {
    result.current.handleChange({
      target: { name, value },
    } as React.ChangeEvent<HTMLInputElement>);
  });
};

const fillAnonymousForm = (result: ReturnType<typeof renderHook<ReturnType<typeof useContactForm>, unknown>>["result"]) => {
  changeField(result, "firstName", "Amina");
  changeField(result, "lastName", "Talla");
  changeField(result, "email", "amina@example.com");
  changeField(result, "phone", "612345678");
  changeField(result, "message", "Je veux demarrer la procedure");
};

describe("useContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mocks.loadProcedureDraft.mockReturnValue(null);
    mocks.readSupabaseFunctionError.mockResolvedValue({ code: undefined, message: "" });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it("requires passwords before anonymous lead submission", async () => {
    const { result } = renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.isAuthLoading).toBe(false);
    });
    fillAnonymousForm(result);

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Mot de passe requis",
      title: "Mot de passe requis",
      variant: "destructive",
    });
    expect(mocks.functionsInvoke).not.toHaveBeenCalled();
  });

  it("persists the draft and redirects when the email already has an account", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        accountStatus: "existing_requires_sign_in",
        leadId: "lead-1",
      },
      error: null,
    });
    const { result } = renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.isAuthLoading).toBe(false);
    });
    fillAnonymousForm(result);
    act(() => {
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mocks.functionsInvoke).toHaveBeenCalledWith("submit-lead", {
      body: {
        email: "amina@example.com",
        firstName: "Amina",
        lastName: "Talla",
        message: "Je veux demarrer la procedure",
        name: "Amina Talla",
        password: "secret123",
        phone: "+237612345678",
      },
    });
    expect(mocks.saveProcedureDraft).toHaveBeenCalledWith({
      countryCode: "+237",
      email: "amina@example.com",
      firstName: "Amina",
      lastName: "Talla",
      message: "Je veux demarrer la procedure",
      phone: "612345678",
    });
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/login?email=amina%40example.com&redirect=%2Fstart-procedure",
      { replace: true },
    );
  });

  it("redirects to contact verification when a created account needs verification", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        accountStatus: "created",
        leadId: "lead-1",
        verificationAccessToken: "token-1",
        verificationChannels: ["email", "sms"],
        verificationEmail: "verify@example.com",
        verificationRequired: true,
      },
      error: null,
    });
    const { result } = renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.isAuthLoading).toBe(false);
    });
    fillAnonymousForm(result);
    act(() => {
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mocks.clearProcedureDraft).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Verification requise",
      title: "Verification requise",
    });
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/verify-contact?channels=email%2Csms&token=token-1&email=verify%40example.com&redirect=%2Fdashboard",
      { replace: true },
    );
  });

  it("submits authenticated users without a password and redirects to dashboard", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: authenticatedUser } } });
    mocks.ensureStudentProfile.mockResolvedValue(validatedProfile);
    mocks.hasValidatedProcedureProfile.mockReturnValue(true);
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        accountStatus: "authenticated",
        leadId: "lead-1",
      },
      error: null,
    });

    const { result } = renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.isAuthLoading).toBe(false);
    });
    changeField(result, "message", "Je continue");

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mocks.functionsInvoke).toHaveBeenCalledWith("submit-lead", {
      body: {
        email: "student@example.com",
        firstName: "Amina",
        lastName: "Talla",
        message: "Je continue",
        name: "Amina Talla",
        password: undefined,
        phone: undefined,
      },
    });
    expect(mocks.clearProcedureDraft).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("maps structured phone ownership errors to the dedicated message", async () => {
    mocks.functionsInvoke.mockRejectedValue(new Error("phone used"));
    mocks.readSupabaseFunctionError.mockResolvedValue({
      code: "PHONE_ALREADY_USED",
      message: "Phone already used",
    });
    const { result } = renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.isAuthLoading).toBe(false);
    });
    fillAnonymousForm(result);
    act(() => {
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Telephone deja utilise",
      title: "Telephone utilise",
      variant: "destructive",
    });
  });
});
