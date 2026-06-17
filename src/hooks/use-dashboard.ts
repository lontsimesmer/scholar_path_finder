import { useCallback, useMemo, useState } from "react";

import {
  DashboardText,
  DashboardViewModel,
  StudentDocument,
  buildLockedDashboardProfilePayload,
  dashboardRoadmapSteps,
} from "@/lib/dashboard";
import {
  buildProcedureCheckoutPath,
  doesProcedurePaymentRequireAction,
  isProcedurePaymentPending,
} from "@/lib/procedure-lead";
import {
  getStudentDisplayName,
  getStudentProfileCorrectionComment,
  getStudentProfileReviewStatus,
  hasRequiredProcedureProfile,
  hasValidatedProcedureProfile,
  isStudentProfileLocked,
} from "@/lib/student-profile";
import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import { useDashboardData } from "@/hooks/use-dashboard-data";

interface UseDashboardOptions {
  dashboardText: DashboardText;
  language: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  redirectAfterCompletion: string | null;
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

export const useDashboard = ({
  dashboardText,
  language,
  navigate,
  redirectAfterCompletion,
  toast,
}: UseDashboardOptions) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [selectedDocumentRequestId, setSelectedDocumentRequestId] = useState<string | null>(null);
  const [selectedReplacementDocumentId, setSelectedReplacementDocumentId] = useState<string | null>(null);
  const [selectedReplacementDocumentPath, setSelectedReplacementDocumentPath] = useState<string | null>(null);
  const handleLoadError = useCallback((message: string) => {
    toast({
      title: dashboardText.errorTitle,
      description: message,
      variant: "destructive",
    });
  }, [dashboardText.errorTitle, toast]);

  const {
    application,
    documents,
    documentRequests,
    fetchData,
    formData,
    isLoading,
    procedureLead,
    profile,
    setDocuments,
    setFormData,
    user,
  } = useDashboardData({
    navigate,
    onLoadError: handleLoadError,
  });

  const updateFormField = useCallback((field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }, [setFormData]);

  const formHasRequiredFields = useMemo(() => hasRequiredProcedureProfile(formData), [formData]);
  const profileIsLocked = useMemo(() => isStudentProfileLocked(profile), [profile]);
  const profileIsReadyForProcedure = useMemo(
    () => hasValidatedProcedureProfile(profile),
    [profile],
  );
  const profileReviewStatus = useMemo(
    () => getStudentProfileReviewStatus(profile),
    [profile],
  );
  const procedurePaymentStatus = useMemo(
    () => procedureLead?.paymentStatus ?? null,
    [procedureLead?.paymentStatus],
  );
  const paymentRequiresAction = useMemo(
    () => doesProcedurePaymentRequireAction(procedurePaymentStatus),
    [procedurePaymentStatus],
  );
  const paymentIsPending = useMemo(
    () => isProcedurePaymentPending(procedurePaymentStatus),
    [procedurePaymentStatus],
  );
  const paymentCheckoutPath = useMemo(
    () => buildProcedureCheckoutPath(procedureLead),
    [procedureLead],
  );
  const hasProcedureContext = useMemo(
    () => Boolean(application) || Boolean(procedureLead) || Boolean(redirectAfterCompletion),
    [application, procedureLead, redirectAfterCompletion],
  );
  const canResumePayment = useMemo(
    () => !application && paymentRequiresAction && Boolean(paymentCheckoutPath),
    [application, paymentCheckoutPath, paymentRequiresAction],
  );
  const hasPendingPaymentBeforeApplication = useMemo(
    () => !application && paymentIsPending,
    [application, paymentIsPending],
  );
  const completionRedirectTarget = useMemo(
    () => redirectAfterCompletion ?? (canResumePayment ? paymentCheckoutPath : null),
    [canResumePayment, paymentCheckoutPath, redirectAfterCompletion],
  );
  const profileCorrectionComment = useMemo(
    () => getStudentProfileCorrectionComment(profile),
    [profile],
  );
  const profileDisplayName = useMemo(
    () => getStudentDisplayName(profile, user?.email),
    [profile, user?.email],
  );
  const formattedBirthDate = useMemo(() => {
    if (!profile?.birth_date) {
      return dashboardText.notSpecified;
    }

    return new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString(
      language === "fr" ? "fr-FR" : "en-US",
    );
  }, [dashboardText.notSpecified, language, profile?.birth_date]);
  const currentStatusIndex = useMemo(() => {
    if (!application?.status) {
      return 0;
    }

    const index = dashboardRoadmapSteps.indexOf(application.status);
    return index >= 0 ? index : 0;
  }, [application?.status]);
  const formattedLockedAt = useMemo(() => {
    if (!profile?.profile_locked_at) {
      return dashboardText.notSpecified;
    }

    return new Date(profile.profile_locked_at).toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [dashboardText.notSpecified, language, profile?.profile_locked_at]);
  const showCompletionGate = hasProcedureContext && !profileIsReadyForProcedure;

  const buildLockedProfilePayload = useCallback(
    () => buildLockedDashboardProfilePayload({ formData, user }),
    [formData, user],
  );

  const handleUploadOpenChange = useCallback((open: boolean) => {
    setIsUploadOpen(open);
    if (!open) {
      setSelectedDocumentRequestId(null);
      setSelectedReplacementDocumentId(null);
      setSelectedReplacementDocumentPath(null);
    }
  }, []);

  const openDocumentRequestUpload = useCallback((requestId: string, title: string) => {
    setSelectedReplacementDocumentId(null);
    setSelectedReplacementDocumentPath(null);
    setSelectedDocumentRequestId(requestId);
    setDocTitle(title);
    setIsUploadOpen(true);
  }, []);

  const openDocumentReplacementUpload = useCallback((document: StudentDocument) => {
    setSelectedDocumentRequestId(null);
    setSelectedReplacementDocumentId(document.id);
    setSelectedReplacementDocumentPath(document.file_path);
    setDocTitle(document.title || document.name || dashboardText.untitledDocument);
    setIsUploadOpen(true);
  }, [dashboardText.untitledDocument]);

  const { actions: actionHandlers, isSavingProfile, isUploading } = useDashboardActions({
    buildLockedProfilePayload,
    completionRedirectTarget,
    dashboardText,
    docTitle,
    fetchData,
    navigate,
    profileIsLocked,
    selectedDocumentRequestId,
    selectedReplacementDocumentId,
    selectedReplacementDocumentPath,
    setDocTitle,
    setIsConfirmDialogOpen,
    setIsUploadOpen: handleUploadOpenChange,
    toast,
    user,
  });

  const navigateToPayment = useCallback(() => {
    if (!paymentCheckoutPath) {
      return;
    }

    navigate(paymentCheckoutPath);
  }, [navigate, paymentCheckoutPath]);

  const viewModel: DashboardViewModel = {
    application,
    canResumePayment,
    completionRedirectTarget,
    currentStatusIndex,
    documents,
    documentRequests,
    docTitle,
    formData,
    formHasRequiredFields,
    formattedBirthDate,
    formattedLockedAt,
    hasPendingPaymentBeforeApplication,
    hasProcedureContext,
    isConfirmDialogOpen,
    isLoading,
    isSavingProfile,
    isUploadOpen,
    isUploading,
    paymentCheckoutPath,
    paymentIsPending,
    paymentRequiresAction,
    procedureLead,
    procedurePaymentStatus,
    profile,
    profileCorrectionComment,
    profileDisplayName,
    profileIsLocked,
    profileIsReadyForProcedure,
    profileReviewStatus,
    roadmapSteps: dashboardRoadmapSteps,
    showCompletionGate,
    user: user ? { email: user.email, id: user.id } : null,
  };

  return {
    setDocTitle,
    setDocuments,
    setIsConfirmDialogOpen,
    setIsUploadOpen: handleUploadOpenChange,
    updateFormField,
    viewModel,
    actions: {
      ...actionHandlers,
      navigateToPayment,
      openDocumentRequestUpload,
      openDocumentReplacementUpload,
    },
  };
};
