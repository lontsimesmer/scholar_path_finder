import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  LeadRecord,
  resendLeadFollowUp,
  toggleLeadFollowUpPause,
} from "@/lib/admin-leads";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("AdminLeads");

type ResendResult =
  | { success: true }
  | { success: false; message: string };

export function useAdminLeads() {
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [isResending, setIsResending] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setLeads((data as LeadRecord[] | null) ?? []);
      logger.info("Admin leads loaded", { count: data?.length ?? 0 });
    } catch (error: unknown) {
      logger.error("Failed to load admin leads", {
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendFollowUp = useCallback(async (leadId: string): Promise<ResendResult> => {
    setIsResending(true);
    const result = await resendLeadFollowUp(leadId);
    if (result.success && result.lead) {
      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? { ...lead, ...result.lead } : lead)),
      );
    }
    setIsResending(false);
    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  }, []);

  const toggleFollowUpPause = useCallback(
    async (input: { leadId: string; paused: boolean; reason?: string }): Promise<ResendResult> => {
      setIsTogglingPause(true);
      const result = await toggleLeadFollowUpPause(input);
      if (result.success && result.lead) {
        setLeads((current) =>
          current.map((lead) =>
            lead.id === input.leadId ? { ...lead, ...result.lead } : lead,
          ),
        );
      }
      setIsTogglingPause(false);
      return result.success
        ? { success: true }
        : { success: false, message: result.message };
    },
    [],
  );

  return {
    isLoading,
    isResending,
    isTogglingPause,
    leads,
    searchQuery,
    paymentFilter,
    pipelineFilter,
    setSearchQuery,
    setPaymentFilter,
    setPipelineFilter,
    loadLeads,
    resendFollowUp,
    toggleFollowUpPause,
  };
}
