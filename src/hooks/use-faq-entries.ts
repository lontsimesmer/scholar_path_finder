import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { type FaqEntry, sortFaqEntriesForDisplay } from "@/lib/faq";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useFaqEntries");

export function useFaqEntries() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("faq_entries")
          .select("*")
          .eq("is_published", true);

        if (error) throw error;

        if (isActive) {
          setEntries(sortFaqEntriesForDisplay((data as FaqEntry[]) ?? []));
        }
      } catch (error: unknown) {
        logger.warn("Failed to load FAQ entries", { message: getErrorMessage(error) });
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, []);

  return { entries, isLoading };
}
