import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type NotificationRecord } from "@/hooks/use-notifications";
import { useLanguage } from "@/i18n/language";
import { cn } from "@/lib/utils";

type NotificationsBellProps = {
  userId?: string | null;
  adminEmail?: string | null;
  triggerClassName?: string;
};

const formatRelativeDate = (iso: string, language: "fr" | "en") => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const NotificationsBell = ({
  userId,
  adminEmail,
  triggerClassName,
}: NotificationsBellProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({
    userId,
    adminEmail,
  });

  const labels = t.notifications;

  const handleClickItem = async (notification: NotificationRecord) => {
    if (!notification.read_at) {
      await markRead(notification.id);
    }
    if (notification.link_path) {
      navigate(notification.link_path);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={labels.bellAria}
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 text-foreground/60 transition-all hover:text-primary hover:border-primary/30",
            triggerClassName,
          )}
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{labels.title}</p>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent"
              onClick={() => void markAllRead()}
            >
              {labels.markAllRead}
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">{labels.emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{labels.emptyDescription}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((notification) => {
                const typeLabel =
                  labels.types[notification.type as keyof typeof labels.types] ?? notification.type;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleClickItem(notification)}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                        !notification.read_at ? "bg-primary/5" : "",
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {typeLabel}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>
                      {notification.body ? (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground/80">
                        {formatRelativeDate(notification.created_at, language)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
