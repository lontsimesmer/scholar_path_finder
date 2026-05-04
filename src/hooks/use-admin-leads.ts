import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { LeadRecord } from "@/lib/admin-leads";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("AdminLeads");

export function useAdminLeads() {
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");

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

  return {
    isLoading,
    leads,
    searchQuery,
    paymentFilter,
    pipelineFilter,
    setSearchQuery,
    setPaymentFilter,
    setPipelineFilter,
    loadLeads,
  };
}
