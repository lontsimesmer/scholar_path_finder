import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardText, StudentProfile } from "@/lib/dashboard";

const mocks = vi.hoisted(() => ({
  actionHandlers: {
    confirmProfileValidation: vi.fn(),
    handleFileUpload: vi.fn(),
    handleSignOut: vi.fn(),
    navigateToProcedureStart: vi.fn(),
    requestProfileValidation: vi.fn(),
  },
  fetchData: vi.fn(),
  setDocuments: vi.fn(),
  setFormData: vi.fn(),
  useDashboardActions: vi.fn(),
  useDashboardData: vi.fn(),
}));

vi.mock("@/hooks/use-dashboard-actions", () => ({
  useDashboardActions: mocks.useDashboardActions,
}));

vi.mock("@/hooks/use-dashboard-data", () => ({
  useDashboardData: mocks.useDashboardData,
}));

const dashboardText = {
  errorTitle: "Erreur",
  notSpecified: "Non renseigne",
  untitledDocument: "Document sans titre",
} as DashboardText;

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
} as StudentProfile;

describe("useDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDashboardData.mockReturnValue({
      application: null,
      documents: [],
      documentRequests: [],
      fetchData: mocks.fetchData,
      formData: profile,
      isLoading: false,
      procedureLead: {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "student@example.com",
        leadId: "lead-1",
        leadStatus: "pending",
        paymentStatus: "unpaid",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      profile,
      setDocuments: mocks.setDocuments,
      setFormData: mocks.setFormData,
      user: { email: "student@example.com", id: "student-1" },
    });
    mocks.useDashboardActions.mockReturnValue({
      actions: mocks.actionHandlers,
      isSavingProfile: false,
      isUploading: false,
    });
  });

  it("builds a dashboard view model from data and procedure payment state", () => {
    const { result } = renderHook(() =>
      useDashboard({
        dashboardText,
        language: "fr",
        navigate: vi.fn(),
        redirectAfterCompletion: null,
        toast: vi.fn(),
      }),
    );

    expect(result.current.viewModel).toMatchObject({
      canResumePayment: true,
      completionRedirectTarget: "/checkout?leadId=lead-1&email=student%40example.com",
      formattedBirthDate: "01/01/2000",
      hasProcedureContext: true,
      paymentCheckoutPath: "/checkout?leadId=lead-1&email=student%40example.com",
      paymentRequiresAction: true,
      profileDisplayName: "Amina Talla",
      profileIsLocked: true,
      profileIsReadyForProcedure: true,
      showCompletionGate: false,
    });
  });

  it("opens uploads for document requests and rejected document replacements", () => {
    const { result } = renderHook(() =>
      useDashboard({
        dashboardText,
        language: "fr",
        navigate: vi.fn(),
        redirectAfterCompletion: null,
        toast: vi.fn(),
      }),
    );

    act(() => {
      result.current.actions.openDocumentRequestUpload("request-1", "Releve");
    });
    expect(result.current.viewModel.isUploadOpen).toBe(true);
    expect(result.current.viewModel.docTitle).toBe("Releve");

    act(() => {
      result.current.setIsUploadOpen(false);
    });
    expect(result.current.viewModel.isUploadOpen).toBe(false);

    act(() => {
      result.current.actions.openDocumentReplacementUpload({
        created_at: "2026-01-01T00:00:00.000Z",
        file_path: "student-1/old.pdf",
        id: "doc-1",
        status: "rejected",
        title: "",
      });
    });
    expect(result.current.viewModel.isUploadOpen).toBe(true);
    expect(result.current.viewModel.docTitle).toBe("Document sans titre");
  });

  it("navigates to payment only when a checkout path exists", () => {
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      useDashboard({
        dashboardText,
        language: "fr",
        navigate,
        redirectAfterCompletion: null,
        toast: vi.fn(),
      }),
    );

    act(() => {
      result.current.actions.navigateToPayment();
    });

    expect(navigate).toHaveBeenCalledWith("/checkout?leadId=lead-1&email=student%40example.com");
  });
});
