import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { computeReadCutoffIso } from "@/lib/notifications";

export type NotificationRecord = Tables<"notifications">;

const POLL_INTERVAL_MS = 30_000;
const NOTIFICATION_LIMIT = 30;

const logger = createLogger("Notifications");

type UseNotificationsParams = {
  userId?: string | null;
  adminEmail?: string | null;
};

export function useNotifications({ userId, adminEmail }: UseNotificationsParams) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isActiveRef = useRef(true);

  const enabled = Boolean(userId) || Boolean(adminEmail);
  const filterKey = userId ?? adminEmail ?? null;

  const loadNotifications = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      return;
    }

    const cutoffIso = computeReadCutoffIso();

    try {
      // Purge notifications read more than READ_NOTIFICATION_RETENTION_MINUTES ago.
      const deleteQuery = supabase
        .from("notifications")
        .delete()
        .not("read_at", "is", null)
        .lt("read_at", cutoffIso);
      if (userId) {
        deleteQuery.eq("recipient_user_id", userId);
      } else if (adminEmail) {
        deleteQuery.eq("recipient_admin_email", adminEmail);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        logger.warn("Failed to purge expired notifications", {
          message: deleteError.message,
        });
      }

      let query = supabase
        .from("notifications")
        .select("*")
        .or(`read_at.is.null,read_at.gte.${cutoffIso}`)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATION_LIMIT);

      if (userId) {
        query = query.eq("recipient_user_id", userId);
      } else if (adminEmail) {
        query = query.eq("recipient_admin_email", adminEmail);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      if (isActiveRef.current) {
        setNotifications((data as NotificationRecord[]) ?? []);
      }
    } catch (error: unknown) {
      logger.warn("Failed to load notifications", { message: getErrorMessage(error) });
    }
  }, [adminEmail, enabled, userId]);

  useEffect(() => {
    isActiveRef.current = true;
    setIsLoading(true);

    const initial = async () => {
      await loadNotifications();
      if (isActiveRef.current) {
        setIsLoading(false);
      }
    };

    void initial();

    if (!enabled) {
      return () => {
        isActiveRef.current = false;
      };
    }

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void loadNotifications();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      isActiveRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, filterKey, loadNotifications]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((n) => (n.id === notificationId && !n.read_at ? { ...n, read_at: now } : n)),
      );

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", notificationId)
        .is("read_at", null);

      if (error) {
        logger.warn("Failed to mark notification as read", {
          notificationId,
          message: error.message,
        });
        await loadNotifications();
      }
    },
    [loadNotifications],
  );

  const markAllRead = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const now = new Date().toISOString();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) {
      return;
    }

    setNotifications((current) =>
      current.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds)
      .is("read_at", null);

    if (error) {
      logger.warn("Failed to mark all notifications as read", { message: error.message });
      await loadNotifications();
    }
  }, [enabled, loadNotifications, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: loadNotifications,
    markRead,
    markAllRead,
  };
}
