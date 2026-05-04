import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  LeadRecord,
  PaymentTransactionRecord,
  StudentProfileLite,
} from "@/lib/admin-payments";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminPayments");

export const useAdminPayments = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [leadById, setLeadById] = useState<Record<string, LeadRecord>>({});
  const [profileById, setProfileById] = useState<Record<string, StudentProfileLite>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const loadPayments = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const typedTransactions = (data as PaymentTransactionRecord[] | null) ?? [];
      const leadIds = Array.from(new Set(typedTransactions.map((item) => item.lead_id).filter(Boolean)));
      const studentIds = Array.from(new Set(typedTransactions.map((item) => item.student_id).filter(Boolean)));

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

      if (leadsResponse.error) {
        throw leadsResponse.error;
      }

      if (profilesResponse.error) {
        throw profilesResponse.error;
      }

      setTransactions(typedTransactions);
      setLeadById(
        Object.fromEntries(((leadsResponse.data as LeadRecord[] | null) ?? []).map((lead) => [lead.id, lead])),
      );
      setProfileById(
        Object.fromEntries(
          (((profilesResponse.data as StudentProfileLite[] | null) ?? []).map((profile) => [
            profile.id,
            profile,
          ])),
        ),
      );
      logger.info("Admin payments loaded", { count: typedTransactions.length });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to load admin payments", { message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    channelFilter,
    isLoading,
    leadById,
    loadPayments,
    profileById,
    searchQuery,
    setChannelFilter,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    transactions,
  };
};
