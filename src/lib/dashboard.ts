import { StudentProfileRecord } from "@/lib/student-profile";
import { ProcedureLeadSummary } from "@/lib/procedure-lead";

export type StudentProfile = StudentProfileRecord;

export interface Application {
  id: string;
  status: string;
  notes: string;
  updated_at: string;
}

export interface StudentDocument {
  id: string;
  title?: string;
  name?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  file_path: string;
  admin_feedback?: string;
}

export interface StudentDocumentRequest {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  created_at: string;
  fulfilled_document_id: string | null;
}

export interface DashboardText {
  advisorFeedback: string;
  advisorNoteLabel: string;
  birthDate: string;
  completeBeforeContinuing: string;
  completeProfileDescription: string;
  completeProfileHelper: string;
  completeProfileTitle: string;
  confirmProfilePrompt: string;
  confirmValidationAction: string;
  confirmValidationCancel: string;
  confirmValidationDescription: string;
  confirmValidationTitle: string;
  confirmValidationWarning: string;
  correctionRequestedPrompt: string;
  correctionRequestedTitle: string;
  currentDegree: string;
  currentDegreePlaceholder: string;
  docStatus: Record<string, string>;
  docTitle: string;
  docTitlePlaceholder: string;
  documentsTitle: string;
  documentRequestsTitle: string;
  documentRequestsDescription: string;
  documentRequestPendingBadge: string;
  documentRequestUploadAction: string;
  errorTitle: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  noActiveProcedureBadge: string;
  noActiveProcedureDescription: string;
  noActiveProcedureHelper: string;
  noActiveProcedureTitle: string;
  noDocs: string;
  notSpecified: string;
  paymentConfirmedDescription: string;
  paymentConfirmedTitle: string;
  paymentPendingBadge: string;
  paymentPendingDescription: string;
  paymentPendingTitle: string;
  paymentRequiredBadge: string;
  paymentRequiredDescription: string;
  paymentRequiredTitle: string;
  proceedToPayment: string;
  procedureStartedBadge: string;
  procedureStatusTitle: string;
  profileLockedAt: string;
  profileLockedBadge: string;
  profileLockedDescription: string;
  profileLockedSuccessDescription: string;
  profileLockedSuccessTitle: string;
  profileLockedTitle: string;
  profileTitle: string;
  requiredForProcedure: string;
  roadmapTitle: string;
  replaceDocumentAction: string;
  selectFile: string;
  startProcedure: string;
  status: Record<string, string>;
  stepLabel: string;
  subtitle: string;
  targetCountry: string;
  targetCountryPlaceholder: string;
  targetProgram: string;
  targetProgramPlaceholder: string;
  untitledDocument: string;
  uploadDoc: string;
  uploadError: string;
  uploadSuccess: string;
  validateAndContinue: string;
  validateProfile: string;
  validationInProgress: string;
  welcome: string;
}

export interface DashboardViewModel {
  application: Application | null;
  canResumePayment: boolean;
  completionRedirectTarget: string | null;
  currentStatusIndex: number;
  documents: StudentDocument[];
  documentRequests: StudentDocumentRequest[];
  docTitle: string;
  formData: StudentProfile;
  formHasRequiredFields: boolean;
  formattedBirthDate: string;
  formattedLockedAt: string;
  hasPendingPaymentBeforeApplication: boolean;
  hasProcedureContext: boolean;
  isConfirmDialogOpen: boolean;
  isLoading: boolean;
  isSavingProfile: boolean;
  isUploadOpen: boolean;
  isUploading: boolean;
  paymentCheckoutPath: string | null;
  paymentIsPending: boolean;
  paymentRequiresAction: boolean;
  procedureLead: ProcedureLeadSummary | null;
  procedurePaymentStatus: string | null;
  profile: StudentProfile | null;
  profileCorrectionComment: string | null;
  profileDisplayName: string;
  profileIsLocked: boolean;
  profileIsReadyForProcedure: boolean;
  profileReviewStatus: "validated" | "correction_requested" | "pending";
  roadmapSteps: string[];
  showCompletionGate: boolean;
  user: { email?: string | null; id: string } | null;
}

export const dashboardRoadmapSteps = [
  "consultation_paid",
  "profile_evaluation",
  "university_selection",
  "application_submitted",
  "admission_received",
  "visa_processing",
  "visa_granted",
  "completed",
];

export const sanitizeDashboardRedirect = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  return value;
};

export const createStudentProfileFormData = (
  profile?: StudentProfile | null,
): StudentProfile => ({
  id: profile?.id || "",
  email: profile?.email || "",
  phone_number: profile?.phone_number || "",
  first_name: profile?.first_name || "",
  last_name: profile?.last_name || "",
  birth_date: profile?.birth_date || "",
  profile_locked_at: profile?.profile_locked_at || null,
  profile_validation_comment: profile?.profile_validation_comment || null,
  profile_invalidated_at: profile?.profile_invalidated_at || null,
  current_degree: profile?.current_degree || "",
  target_country: profile?.target_country || "",
  target_program: profile?.target_program || "",
});

export const buildLockedDashboardProfilePayload = ({
  formData,
  user,
}: {
  formData: StudentProfile;
  user: { email?: string | null; id: string } | null;
}) => {
  if (!user) {
    return null;
  }

  const firstName = formData.first_name?.trim() || "";
  const lastName = formData.last_name?.trim() || "";
  const birthDate = formData.birth_date?.trim() || "";

  if (!firstName || !lastName || !birthDate) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    profile_locked_at: new Date().toISOString(),
    profile_validation_comment: null,
    profile_invalidated_at: null,
    current_degree: formData.current_degree?.trim() || null,
    target_country: formData.target_country?.trim() || null,
    target_program: formData.target_program?.trim() || null,
    updated_at: new Date().toISOString(),
  };
};
