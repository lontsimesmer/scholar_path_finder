import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  type ManualPaymentLeadRecord,
  type ManualPaymentStudentLite,
  type ManualPaymentSubmissionRecord,
} from "@/lib/admin-manual-payments";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminManualPayments");

type ValidationAction = "approve" | "reject";

export const useAdminManualPayments = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<ManualPaymentSubmissionRecord[]>([]);
  const [leadById, setLeadById] = useState<Record<string, ManualPaymentLeadRecord>>({});
  const [profileById, setProfileById] = useState<Record<string, ManualPaymentStudentLite>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("manual_payment_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const typed = (data as ManualPaymentSubmissionRecord[] | null) ?? [];
      const leadIds = Array.from(new Set(typed.map((item) => item.lead_id).filter(Boolean)));
      const studentIds = Array.from(new Set(typed.map((item) => item.student_id).filter(Boolean)));

      const [leadsResponse, profilesResponse] = await Promise.all([
        leadIds.length > 0
          ? supabase.from("leads").select("*").in("id", leadIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase
              .from("student_profiles")
              .select("id, email, first_name, last_name")
              .in("id", studentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (leadsResponse.error) throw leadsResponse.error;
      if (profilesResponse.error) throw profilesResponse.error;

      setSubmissions(typed);
      setLeadById(
        Object.fromEntries(
          ((leadsResponse.data as ManualPaymentLeadRecord[] | null) ?? []).map((lead) => [
            lead.id,
            lead,
          ]),
        ),
      );
      setProfileById(
        Object.fromEntries(
          ((profilesResponse.data as ManualPaymentStudentLite[] | null) ?? []).map((profile) => [
            profile.id,
            profile,
          ]),
        ),
      );
      logger.info("Admin manual payments loaded", { count: typed.length });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to load manual payment submissions", { message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateSubmission = useCallback(
    async (submissionId: string, action: ValidationAction, comment?: string) => {
      setActionError(null);
      try {
        const { error } = await supabase.functions.invoke("validate-manual-payment", {
          body: { submissionId, action, comment },
        });
        if (error) throw error;
        await loadSubmissions();
        return { success: true } as const;
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.warn("Failed to validate manual payment submission", { submissionId, action, message });
        setActionError(message);
        return { success: false, message } as const;
      }
    },
    [loadSubmissions],
  );

  const blockLead = useCallback(
    async (leadId: string, reason?: string, unblock?: boolean) => {
      setActionError(null);
      try {
        const { error } = await supabase.functions.invoke("block-lead-manual-payment", {
          body: { leadId, reason, unblock: Boolean(unblock) },
        });
        if (error) throw error;
        await loadSubmissions();
        return { success: true } as const;
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.warn("Failed to update lead block status", { leadId, message });
        setActionError(message);
        return { success: false, message } as const;
      }
    },
    [loadSubmissions],
  );

  return {
    isLoading,
    submissions,
    leadById,
    profileById,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loadSubmissions,
    validateSubmission,
    blockLead,
    actionError,
  };
};
