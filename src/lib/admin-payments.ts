import { Tables } from "@/integrations/supabase/types";
import { buildStudentFullName } from "@/lib/student-profile";

export interface PaymentTransactionRecord {
  id: string;
  lead_id: string;
  student_id: string;
  transaction_id: string;
  payment_url: string | null;
  channel: string;
  amount: number;
  currency: string;
  local_status: string;
  provider_status: string | null;
  customer_email: string | null;
  created_at: string;
}

export interface StudentProfileLite {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export type LeadRecord = Tables<"leads">;

export interface AdminPaymentsText {
  breadcrumbCurrent: string;
  breadcrumbDashboard: string;
  channels: Record<string, string>;
  columns: {
    transaction: string;
    student: string;
    amount: string;
    status: string;
    context: string;
    createdAt: string;
    actions: string;
  };
  empty: string;
  filters: {
    status: string;
    channel: string;
    all: string;
  };
  localStatuses: Record<string, string>;
  metrics: {
    total: string;
    accepted: string;
    pending: string;
    failed: string;
    acceptedAmount: string;
    totalDescription: string;
    acceptedDescription: string;
    pendingDescription: string;
    failedDescription: string;
    acceptedAmountDescription: string;
  };
  noLead: string;
  noStudent: string;
  openCheckout: string;
  openLeads: string;
  searchPlaceholder: string;
  subtitle: string;
  title: string;
}

export const pendingLocalStatuses = ["initialized", "pending"];
export const failedLocalStatuses = ["failed", "refused"];

export const getPaymentStudentLabel = (
  profile: StudentProfileLite | undefined,
  fallbackEmail: string | null | undefined,
  noStudentLabel: string,
) =>
  buildStudentFullName(profile?.first_name, profile?.last_name) ||
  fallbackEmail ||
  noStudentLabel;

export const filterPaymentTransactions = ({
  channelFilter,
  leadById,
  profileById,
  query,
  statusFilter,
  transactions,
}: {
  channelFilter: string;
  leadById: Record<string, LeadRecord>;
  profileById: Record<string, StudentProfileLite>;
  query: string;
  statusFilter: string;
  transactions: PaymentTransactionRecord[];
}) => {
  const normalizedQuery = query.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const matchesStatus = statusFilter === "all" ? true : transaction.local_status === statusFilter;
    const matchesChannel = channelFilter === "all" ? true : transaction.channel === channelFilter;

    if (!matchesStatus || !matchesChannel) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const profile = profileById[transaction.student_id];
    const lead = leadById[transaction.lead_id];
    const haystack = [
      transaction.transaction_id,
      transaction.customer_email ?? "",
      transaction.provider_status ?? "",
      transaction.channel,
      buildStudentFullName(profile?.first_name, profile?.last_name) ?? "",
      profile?.email ?? "",
      lead?.email ?? "",
      lead?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};

export const buildPaymentStats = (transactions: PaymentTransactionRecord[]) => {
  const acceptedTransactions = transactions.filter((transaction) => transaction.local_status === "accepted");
  const pendingTransactions = transactions.filter((transaction) =>
    pendingLocalStatuses.includes(transaction.local_status),
  );
  const failedTransactions = transactions.filter((transaction) =>
    failedLocalStatuses.includes(transaction.local_status),
  );

  return {
    total: transactions.length,
    accepted: acceptedTransactions.length,
    pending: pendingTransactions.length,
    failed: failedTransactions.length,
    acceptedAmount: acceptedTransactions.reduce((sum, item) => sum + item.amount, 0),
  };
};
