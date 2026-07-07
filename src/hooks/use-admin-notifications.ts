import { useCallback, useEffect, useState } from "react";

import {
  addRecipient,
  fetchRecipients,
  removeRecipient,
  sortRecipients,
} from "@/lib/admin-notifications";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminNotifications");

type MutationResult = { success: true } | { success: false; message: string };

export const useAdminNotifications = () => {
  const [emails, setEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRecipients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecipients();
      setEmails(sortRecipients(data));
    } catch (error: unknown) {
      logger.error("Failed to load notification recipients", {
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const add = useCallback(async (email: string): Promise<MutationResult> => {
    setIsAdding(true);
    const result = await addRecipient(email);
    if (result.success) {
      setEmails(result.emails);
    }
    setIsAdding(false);
    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  }, []);

  const remove = useCallback(async (email: string): Promise<MutationResult> => {
    setIsRemoving(true);
    const result = await removeRecipient(email);
    if (result.success) {
      setEmails(result.emails);
    }
    setIsRemoving(false);
    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  }, []);

  return {
    emails,
    isLoading,
    isAdding,
    isRemoving,
    searchQuery,
    setSearchQuery,
    loadRecipients,
    add,
    remove,
  };
};
