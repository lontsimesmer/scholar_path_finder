import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/logger";

export type LeadRecord = Tables<"leads">;

export const MAX_FOLLOW_UP_COUNT = 14;

export type ResendLeadFollowUpResult =
  | { success: true; lead: Partial<LeadRecord> }
  | { success: false; message: string };

export type LeadAdminNote = {
  id: string;
  lead_id: string;
  admin_email: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type ToggleLeadFollowUpPauseResult =
  | { success: true; lead: Partial<LeadRecord> }
  | { success: false; message: string };

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
  copyCheckoutLink: string;
  linkCopiedTitle: string;
  linkCopiedDescription: string;
  linkCopyErrorTitle: string;
  resendFollowUp: string;
  resendFollowUpTooltipPaid: string;
  resendFollowUpTooltipLimit: string;
  resendFollowUpSuccessTitle: string;
  resendFollowUpSuccessDescription: string;
  resendFollowUpErrorTitle: string;
  resendFollowUpErrorCooldown: string;
  resendFollowUpErrorPaid: string;
  resendFollowUpErrorLimit: string;
  resendFollowUpErrorGeneric: string;
  resendFollowUpErrorPaused: string;
  notesButton: string;
  followUpsPauseButton: string;
  followUpsResumeButton: string;
  followUpsPausedBadge: string;
  notesDialog: {
    title: string;
    description: string;
    placeholder: string;
    save: string;
    saving: string;
    close: string;
    empty: string;
    loadError: string;
    createSuccess: string;
    createError: string;
  };
  pauseDialog: {
    pauseTitle: string;
    pauseDescription: string;
    resumeTitle: string;
    resumeDescription: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    confirmPause: string;
    confirmResume: string;
    cancel: string;
    pauseSuccessTitle: string;
    resumeSuccessTitle: string;
    errorTitle: string;
  };
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
    return "border-warning/30 bg-warning/10 text-warning";
  }

  return "border-border/50 bg-secondary/40 text-muted-foreground";
}

export function buildLeadCheckoutLink(
  { leadId, email }: { leadId: string; email: string },
  origin: string,
) {
  const trimmedOrigin = origin.replace(/\/+$/, "");
  const params = new URLSearchParams({ leadId, email }).toString();
  return `${trimmedOrigin}/checkout?${params}`;
}

export async function copyLeadCheckoutLink(
  lead: { id: string; email: string },
  origin: string,
): Promise<boolean> {
  const url = buildLeadCheckoutLink({ leadId: lead.id, email: lead.email }, origin);
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return false;
    }
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function canResendFollowUp(lead: LeadRecord): boolean {
  if (lead.payment_status === "paid") return false;
  if ((lead.follow_up_count ?? 0) >= MAX_FOLLOW_UP_COUNT) return false;
  if (isFollowUpPaused(lead)) return false;
  return true;
}

export function isFollowUpPaused(lead: LeadRecord): boolean {
  return Boolean(lead.follow_up_paused_at);
}

export async function fetchLeadAdminNotes(leadId: string): Promise<LeadAdminNote[]> {
  const { data, error } = await supabase
    .from("lead_admin_notes")
    .select("id, lead_id, admin_email, note, created_at, updated_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as LeadAdminNote[] | null) ?? [];
}

export async function createLeadAdminNote(input: {
  leadId: string;
  note: string;
}): Promise<LeadAdminNote> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const adminEmail = session?.user.email?.trim();
  if (!adminEmail) {
    throw new Error("Admin session is required to add a note.");
  }
  const { data, error } = await supabase
    .from("lead_admin_notes")
    .insert({ lead_id: input.leadId, admin_email: adminEmail, note: input.note })
    .select("id, lead_id, admin_email, note, created_at, updated_at")
    .single();
  if (error) {
    throw error;
  }
  return data as LeadAdminNote;
}

export async function toggleLeadFollowUpPause(input: {
  leadId: string;
  paused: boolean;
  reason?: string;
}): Promise<ToggleLeadFollowUpPauseResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      lead?: Partial<LeadRecord>;
      error?: string;
    }>("admin-lead-toggle-followups", {
      method: "POST",
      body: {
        leadId: input.leadId,
        paused: input.paused,
        reason: input.reason,
      },
    });
    if (error) {
      return { success: false, message: getErrorMessage(error, "Failed to toggle follow-ups") };
    }
    if (!data?.ok || !data.lead) {
      return {
        success: false,
        message: data?.error ?? "Empty response from admin-lead-toggle-followups",
      };
    }
    return { success: true, lead: data.lead };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to toggle follow-ups") };
  }
}

export async function resendLeadFollowUp(
  leadId: string,
): Promise<ResendLeadFollowUpResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      lead?: Partial<LeadRecord>;
      error?: string;
    }>("admin-lead-followup", {
      method: "POST",
      body: { leadId },
    });

    if (error) {
      const message = getErrorMessage(error, "Failed to resend follow-up");
      return { success: false, message };
    }
    if (!data?.ok || !data.lead) {
      return {
        success: false,
        message: data?.error ?? "Empty response from admin-lead-followup",
      };
    }
    return { success: true, lead: data.lead };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Failed to resend follow-up"),
    };
  }
}
