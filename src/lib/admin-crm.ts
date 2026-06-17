import type { AdminStudentActivityType } from "@/lib/admin-student-detail";
import { getStudentDisplayName, getStudentProfileReviewStatus } from "@/lib/student-profile";

export interface StudentProfileSummary {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  profile_locked_at: string | null;
  profile_validation_comment: string | null;
  profile_invalidated_at: string | null;
  target_country: string | null;
  target_program: string | null;
  current_degree: string | null;
}

export interface StudentApplicationSummary {
  id: string;
  status: string;
  notes: string;
  updated_at: string;
}

export interface LeadSummary {
  id: string;
  email: string;
  name: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionSummary {
  id: string;
  student_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  local_status: string;
  channel: string;
  created_at: string;
}

export interface StudentDocumentSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface StudentPaymentSummary {
  total: number;
  accepted: number;
  pending: number;
  failed: number;
  latestTransaction: PaymentTransactionSummary | null;
}

export interface StudentDocument {
  id: string;
  title: string;
  file_path: string;
  status: "pending" | "approved" | "rejected";
  student_id: string;
  admin_feedback?: string;
}

export interface StudentDocumentRequest {
  id: string;
  student_id: string;
  application_id: string | null;
  title: string;
  description: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  requested_by: string | null;
  fulfilled_document_id: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCRMStudent {
  id: string;
  email: string;
  profile: StudentProfileSummary | null;
  application: StudentApplicationSummary | null;
  lead: LeadSummary | null;
  documentSummary: StudentDocumentSummary;
  paymentSummary: StudentPaymentSummary;
}

export interface AdminCRMFormData {
  first_name: string;
  last_name: string;
  birth_date: string;
  profile_validation_comment: string;
  target_country: string;
  target_program: string;
  current_degree: string;
  general_notes: string;
}

export interface AdminCRMMetrics {
  totalStudents: number;
  validatedProfiles: number;
  paidConsultations: number;
  pendingDocuments: number;
}

export const profileFilterValues = ["all", "validated", "correction_requested", "pending"] as const;
export const paymentFilterValues = ["all", "paid", "pending", "unpaid", "refunded", "none"] as const;
export const documentFilterValues = ["all", "pending", "approved", "rejected", "none"] as const;

export type ProfileFilterValue = (typeof profileFilterValues)[number];
export type PaymentFilterValue = (typeof paymentFilterValues)[number];
export type DocumentFilterValue = (typeof documentFilterValues)[number];

const pendingPaymentStatuses = new Set(["pending", "mobile_money_pending", "bank_transfer_pending"]);
const failedPaymentStatuses = new Set(["failed", "refused"]);

const emptyDocumentSummary: StudentDocumentSummary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

const emptyPaymentSummary: StudentPaymentSummary = {
  total: 0,
  accepted: 0,
  pending: 0,
  failed: 0,
  latestTransaction: null,
};

export const createAdminCRMFormData = (
  student?: AdminCRMStudent | null,
): AdminCRMFormData => ({
  first_name: student?.profile?.first_name || "",
  last_name: student?.profile?.last_name || "",
  birth_date: student?.profile?.birth_date || "",
  profile_validation_comment: student?.profile?.profile_validation_comment || "",
  target_country: student?.profile?.target_country || "",
  target_program: student?.profile?.target_program || "",
  current_degree: student?.profile?.current_degree || "",
  general_notes: student?.application?.notes || "",
});

export const buildDocumentSummary = (documents: StudentDocument[]): StudentDocumentSummary =>
  documents.reduce<StudentDocumentSummary>(
    (summary, document) => {
      summary.total += 1;
      summary[document.status] += 1;
      return summary;
    },
    { ...emptyDocumentSummary },
  );

export const buildPaymentSummary = (
  transactions: PaymentTransactionSummary[],
): StudentPaymentSummary =>
  transactions.reduce<StudentPaymentSummary>(
    (summary, transaction) => {
      summary.total += 1;

      if (transaction.local_status === "accepted") {
        summary.accepted += 1;
      } else if (pendingPaymentStatuses.has(transaction.local_status)) {
        summary.pending += 1;
      } else if (failedPaymentStatuses.has(transaction.local_status)) {
        summary.failed += 1;
      }

      if (
        !summary.latestTransaction ||
        new Date(transaction.created_at).getTime() >
          new Date(summary.latestTransaction.created_at).getTime()
      ) {
        summary.latestTransaction = transaction;
      }

      return summary;
    },
    { ...emptyPaymentSummary },
  );

export const getPaymentFilterState = (student: AdminCRMStudent): PaymentFilterValue => {
  if (student.lead?.payment_status === "refunded") {
    return "refunded";
  }

  if (student.lead?.payment_status === "paid" || student.paymentSummary.accepted > 0) {
    return "paid";
  }

  if (student.paymentSummary.pending > 0) {
    return "pending";
  }

  if (student.paymentSummary.total === 0 && !student.lead?.payment_status) {
    return "none";
  }

  return "unpaid";
};

export const getDocumentFilterState = (student: AdminCRMStudent): DocumentFilterValue => {
  if (student.documentSummary.total === 0) {
    return "none";
  }

  if (student.documentSummary.pending > 0) {
    return "pending";
  }

  if (student.documentSummary.rejected > 0) {
    return "rejected";
  }

  return "approved";
};

export const getTargetCountries = (students: AdminCRMStudent[]) =>
  Array.from(
    new Set(
      students
        .map((student) => student.profile?.target_country?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));

export const filterAdminCRMStudents = ({
  countryFilter,
  documentFilter,
  paymentFilter,
  profileFilter,
  query,
  statusFilter,
  students,
}: {
  countryFilter: string;
  documentFilter: DocumentFilterValue | "all";
  paymentFilter: PaymentFilterValue | "all";
  profileFilter: ProfileFilterValue | "all";
  query: string;
  statusFilter: string;
  students: AdminCRMStudent[];
}) => {
  const normalizedQuery = query.trim().toLowerCase();

  return students.filter((student) => {
    const displayName = getStudentDisplayName(student.profile, student.email).toLowerCase();
    const firstName = (student.profile?.first_name || "").toLowerCase();
    const lastName = (student.profile?.last_name || "").toLowerCase();
    const email = student.email.toLowerCase();
    const targetCountry = student.profile?.target_country || "";
    const profileReviewStatus = getStudentProfileReviewStatus(student.profile);
    const paymentState = getPaymentFilterState(student);
    const documentState = getDocumentFilterState(student);
    const matchesSearch =
      !normalizedQuery ||
      displayName.includes(normalizedQuery) ||
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      targetCountry.toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || student.application?.status === statusFilter;
    const matchesProfile = profileFilter === "all" || profileReviewStatus === profileFilter;
    const matchesPayment = paymentFilter === "all" || paymentState === paymentFilter;
    const matchesDocuments = documentFilter === "all" || documentState === documentFilter;
    const matchesCountry = countryFilter === "all" || targetCountry === countryFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesProfile &&
      matchesPayment &&
      matchesDocuments &&
      matchesCountry
    );
  });
};

export const buildAdminCRMMetrics = (students: AdminCRMStudent[]): AdminCRMMetrics => ({
  totalStudents: students.length,
  validatedProfiles: students.filter(
    (student) => getStudentProfileReviewStatus(student.profile) === "validated",
  ).length,
  paidConsultations: students.filter((student) => getPaymentFilterState(student) === "paid").length,
  pendingDocuments: students.filter((student) => student.documentSummary.pending > 0).length,
});

export interface AdminCRMText {
  accessDenied: string;
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  empty: string;
  noEmail: string;
  newStudent: string;
  edit: string;
  documents: string;
  openStudent: string;
  notesTitle: string;
  notesDescription: string;
  notePlaceholder: string;
  addNote: string;
  noteAdded: string;
  noNotes: string;
  historyTitle: string;
  historyDescription: string;
  noHistory: string;
  historyActions: Record<AdminStudentActivityType, string>;
  studentUpdated: string;
  updateFailed: string;
  statusUpdated: string;
  applicationStatusChangedSummary: string;
  unknownStatus: string;
  documentUpdated: string;
  documentRequestTitle: string;
  documentRequestDescription: string;
  documentRequestNameLabel: string;
  documentRequestNamePlaceholder: string;
  documentRequestDetailsLabel: string;
  documentRequestDetailsPlaceholder: string;
  documentRequestCreate: string;
  documentRequestCreating: string;
  documentRequestCreated: string;
  documentRequestRequiredTitle: string;
  documentRequestRequiredDescription: string;
  documentRequestsEmpty: string;
  documentRequestStatuses: Record<StudentDocumentRequest["status"], string>;
  profileValidated: string;
  profilePendingValidation: string;
  profileCorrectionRequested: string;
  correctionComment: string;
  correctionCommentPlaceholder: string;
  correctionCommentRequiredTitle: string;
  correctionCommentRequiredDescription: string;
  correctionRequestedSuccess: string;
  requestCorrection: string;
  editDialogTitle: string;
  saveChanges: string;
  documentsTitle: string;
  noDocuments: string;
  viewFile: string;
  approve: string;
  reject: string;
  feedbackPlaceholder: string;
  fields: {
    firstName: string;
    lastName: string;
    birthDate: string;
    targetCountry: string;
    targetProgram: string;
    currentDegree: string;
    generalNote: string;
    generalNotePlaceholder: string;
  };
  columns: {
    student: string;
    target: string;
    currentStatus: string;
    payment: string;
    documents: string;
    actions: string;
  };
  filters: {
    all: string;
    status: string;
    profile: string;
    payment: string;
    documents: string;
    country: string;
  };
  profileStates: Record<ProfileFilterValue, string>;
  paymentStates: Record<PaymentFilterValue, string>;
  documentStates: Record<DocumentFilterValue, string>;
  metrics: {
    totalStudents: string;
    validatedProfiles: string;
    paidConsultations: string;
    pendingDocuments: string;
    totalStudentsDescription: string;
    validatedProfilesDescription: string;
    paidConsultationsDescription: string;
    pendingDocumentsDescription: string;
  };
  sheet: {
    title: string;
    profileSummary: string;
    procedureSummary: string;
    paymentSummary: string;
    documentSummary: string;
    latestTransaction: string;
    transactionCount: string;
    noTransactions: string;
    leadStatus: string;
    paymentStatus: string;
    documentsPending: string;
    documentsApproved: string;
    documentsRejected: string;
    totalDocuments: string;
    noTargetCountry: string;
    noTargetProgram: string;
    noCurrentDegree: string;
    attentionRequired: string;
    allClear: string;
    allClearDescription: string;
    jumpTo: string;
    sectionOverview: string;
    sectionProcedure: string;
    sectionDocuments: string;
    sectionNotes: string;
    sectionHistory: string;
    studentEmail: string;
    profileStatus: string;
    noBirthDate: string;
    latestNote: string;
    latestActivity: string;
    pendingActionsTitle: string;
    profilePendingAction: string;
    profileCorrectionAction: string;
    paymentPendingAction: string;
    paymentMissingAction: string;
    documentsPendingAction: string;
    notesMissingAction: string;
  };
}
