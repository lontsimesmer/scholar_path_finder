import { useCallback, useEffect, useState } from "react";

import {
  type AdminTeamMember,
  fetchAdmins,
  inviteAdmin,
  removeAdmin,
  sortAdmins,
} from "@/lib/admin-team";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminTeam");

type MutationResult = { success: true } | { success: false; message: string };

export const useAdminTeam = () => {
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdmins();
      setAdmins(sortAdmins(data));
    } catch (error: unknown) {
      logger.error("Failed to load admin team", { message: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const invite = useCallback(async (email: string): Promise<MutationResult> => {
    setIsInviting(true);
    const result = await inviteAdmin(email);
    if (result.success) {
      setAdmins(result.admins);
    }
    setIsInviting(false);
    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  }, []);

  const remove = useCallback(async (email: string): Promise<MutationResult> => {
    setIsRemoving(true);
    const result = await removeAdmin(email);
    if (result.success) {
      setAdmins(result.admins);
    }
    setIsRemoving(false);
    return result.success
      ? { success: true }
      : { success: false, message: result.message };
  }, []);

  return {
    admins,
    isLoading,
    isInviting,
    isRemoving,
    searchQuery,
    setSearchQuery,
    loadAdmins,
    invite,
    remove,
  };
};
