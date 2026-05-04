import type { Tables } from "@/integrations/supabase/types";

export type LeadRecord = Tables<"leads">;

export type AdminLeadsText = {
  title: string;
  subtitle: string;
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  openPayments: string;
  searchPlaceholder: string;
  empty: string;
  noPhone: string;
  noMessage: string;
  notProvided: string;
  openCheckout: string;
  metrics: {
    total: string;
    paid: string;
    pendingPayments: string;
    followUpDue: string;
    totalDescription: string;
    paidDescription: string;
    pendingDescription: string;
    followUpDescription: string;
  };
  filters: {
    payment: string;
    pipeline: string;
    all: string;
  };
  paymentStatuses: Record<string, string>;
  pipelineStatuses: Record<string, string>;
  columns: {
    contact: string;
    message: string;
    payment: string;
    pipeline: string;
    createdAt: string;
    actions: string;
  };
};

export type AdminLeadStats = {
  total: number;
  paidCount: number;
  pendingPaymentsCount: number;
  followUpDueCount: number;
};

export const pendingLeadPaymentStatuses = ["pending", "mobile_money_pending", "bank_transfer_pending"];

type FilterLeadsParams = {
  leads: LeadRecord[];
  query: string;
  paymentFilter: string;
  pipelineFilter: string;
};

export function filterAdminLeads({
  leads,
  query,
  paymentFilter,
  pipelineFilter,
}: FilterLeadsParams) {
  const normalizedQuery = query.trim().toLowerCase();

  return leads.filter((lead) => {
    const matchesPayment = paymentFilter === "all" ? true : (lead.payment_status ?? "unpaid") === paymentFilter;
    const matchesPipeline = pipelineFilter === "all" ? true : lead.status === pipelineFilter;

    if (!matchesPayment || !matchesPipeline) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [lead.name, lead.email, lead.phone ?? "", lead.message, lead.payment_status ?? "", lead.status]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function buildAdminLeadStats(leads: LeadRecord[]): AdminLeadStats {
  return {
    total: leads.length,
    paidCount: leads.filter((lead) => lead.payment_status === "paid").length,
    pendingPaymentsCount: leads.filter((lead) => pendingLeadPaymentStatuses.includes(lead.payment_status ?? "")).length,
    followUpDueCount: leads.filter((lead) => {
      if (lead.status === "follow_up") {
        return true;
      }

      if (!lead.next_follow_up_at) {
        return false;
      }

      return new Date(lead.next_follow_up_at).getTime() <= Date.now();
    }).length,
  };
}

export function getAdminLeadPaymentLabel(text: AdminLeadsText, status: string | null) {
  return text.paymentStatuses[status ?? "unpaid"] ?? (status ?? text.notProvided);
}

export function getAdminLeadPipelineLabel(text: AdminLeadsText, status: string) {
  return text.pipelineStatuses[status] ?? status;
}

export function getAdminLeadPaymentBadgeClassName(paymentStatus: string | null) {
  if (paymentStatus === "paid") {
    return "border-success/20 bg-success/5 text-success";
  }

  if (pendingLeadPaymentStatuses.includes(paymentStatus ?? "")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-border/50 bg-secondary/40 text-muted-foreground";
}
