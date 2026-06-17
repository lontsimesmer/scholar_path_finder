import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { buildStudentFullName } from "@/lib/student-profile";

export type ManualPaymentSubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type ManualPaymentSubmissionRecord = Tables<"manual_payment_submissions">;

export interface ManualPaymentStudentLite {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export type ManualPaymentLeadRecord = Tables<"leads">;

export interface AdminManualPaymentsText {
  breadcrumbCurrent: string;
  breadcrumbDashboard: string;
  title: string;
  subtitle: string;
  empty: string;
  noLead: string;
  noStudent: string;
  metrics: {
    pending: string;
    approved: string;
    rejected: string;
    blocked: string;
    pendingDescription: string;
    approvedDescription: string;
    rejectedDescription: string;
    blockedDescription: string;
  };
  filters: {
    status: string;
    all: string;
    searchPlaceholder: string;
  };
  statuses: Record<ManualPaymentSubmissionStatus, string>;
  columns: {
    lead: string;
    student: string;
    amount: string;
    submittedAt: string;
    status: string;
    actions: string;
  };
  actions: {
    view: string;
    approve: string;
    reject: string;
    block: string;
    unblock: string;
  };
  dialog: {
    title: string;
    receiptTitle: string;
    receiptUnavailable: string;
    receiptZoom: string;
    receiptOpenNewTab: string;
    leadSection: string;
    submissionSection: string;
    senderNameLabel: string;
    senderPhoneLabel: string;
    providerReferenceLabel: string;
    notesLabel: string;
    commentLabel: string;
    commentPlaceholder: string;
    approveButton: string;
    rejectButton: string;
    blockButton: string;
    blockConfirmTitle: string;
    blockConfirmDescription: string;
    blockConfirmAction: string;
    blockCancel: string;
    blockReasonLabel: string;
    closeButton: string;
    successApproveTitle: string;
    successRejectTitle: string;
    successBlockTitle: string;
    successUnblockTitle: string;
    errorTitle: string;
    requireCommentTitle: string;
    requireCommentDescription: string;
  };
}

const PENDING_STATUS: ManualPaymentSubmissionStatus = "pending_review";
const APPROVED_STATUS: ManualPaymentSubmissionStatus = "approved";
const REJECTED_STATUS: ManualPaymentSubmissionStatus = "rejected";

export const getManualPaymentStudentLabel = (
  profile: ManualPaymentStudentLite | undefined,
  fallbackEmail: string | null | undefined,
  noStudentLabel: string,
) =>
  buildStudentFullName(profile?.first_name, profile?.last_name) ||
  fallbackEmail ||
  noStudentLabel;

export const filterManualPaymentSubmissions = ({
  submissions,
  leadById,
  profileById,
  statusFilter,
  query,
}: {
  submissions: ManualPaymentSubmissionRecord[];
  leadById: Record<string, ManualPaymentLeadRecord>;
  profileById: Record<string, ManualPaymentStudentLite>;
  statusFilter: string;
  query: string;
}) => {
  const normalizedQuery = query.trim().toLowerCase();

  return submissions.filter((submission) => {
    const matchesStatus = statusFilter === "all" ? true : submission.status === statusFilter;
    if (!matchesStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const profile = profileById[submission.student_id];
    const lead = leadById[submission.lead_id];
    const haystack = [
      submission.id,
      submission.provider_reference ?? "",
      submission.sender_name ?? "",
      submission.sender_phone ?? "",
      submission.notes ?? "",
      submission.status,
      profile?.email ?? "",
      buildStudentFullName(profile?.first_name, profile?.last_name) ?? "",
      lead?.email ?? "",
      lead?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};

export const buildManualPaymentStats = (
  submissions: ManualPaymentSubmissionRecord[],
  leadById: Record<string, ManualPaymentLeadRecord>,
) => {
  const pending = submissions.filter((s) => s.status === PENDING_STATUS);
  const approved = submissions.filter((s) => s.status === APPROVED_STATUS);
  const rejected = submissions.filter((s) => s.status === REJECTED_STATUS);
  const blockedLeadIds = new Set(
    Object.values(leadById)
      .filter((lead) => Boolean(lead.manual_payment_blocked_at))
      .map((lead) => lead.id),
  );

  return {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    blocked: blockedLeadIds.size,
    pendingAmount: pending.reduce((sum, s) => sum + s.amount, 0),
  };
};

export const getManualPaymentReceiptSignedUrl = async (
  receiptPath: string,
  expiresInSeconds = 60,
) => {
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(receiptPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create signed URL");
  }

  return data.signedUrl;
};
