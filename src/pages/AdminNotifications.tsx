import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, MailPlus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminNotificationAddDialog } from "@/components/admin/notifications/AdminNotificationAddDialog";
import { AdminNotificationsTable } from "@/components/admin/notifications/AdminNotificationsTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  type AdminNotificationsText,
  filterRecipients,
} from "@/lib/admin-notifications";

const mapErrorMessage = (
  message: string,
  toasts: AdminNotificationsText["toasts"],
): string => {
  if (message === "Email is already a recipient") return toasts.errorAlreadyRecipient;
  if (message === "Invalid email format") return toasts.errorInvalidEmail;
  if (message === "Cannot remove the last recipient") return toasts.errorLastRecipient;
  return message || toasts.errorGeneric;
};

const AdminNotifications = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const text = t.adminNotifications as AdminNotificationsText;
  const { toast } = useToast();
  const {
    emails,
    isLoading,
    isAdding,
    isRemoving,
    searchQuery,
    setSearchQuery,
    add,
    remove,
  } = useAdminNotifications();

  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const session = await getAdminSession();
      if (!isActive) return;
      if (!session) {
        navigate("/login?redirect=/admin/notifications", { replace: true });
      }
    };
    void initialize();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  const filtered = useMemo(() => filterRecipients(emails, searchQuery), [emails, searchQuery]);

  const handleAdd = useCallback(
    async (email: string) => {
      const result = await add(email);
      if (result.success) {
        toast({
          title: text.toasts.addSuccessTitle,
          description: text.toasts.addSuccessDescription,
        });
        setAddOpen(false);
      } else {
        toast({
          title: text.toasts.errorTitle,
          description: mapErrorMessage(result.message, text.toasts),
          variant: "destructive",
        });
      }
    },
    [add, text.toasts, toast],
  );

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    const result = await remove(pendingRemoval);
    if (result.success) {
      toast({ title: text.toasts.removeSuccessTitle });
      setPendingRemoval(null);
    } else {
      toast({
        title: text.toasts.errorTitle,
        description: mapErrorMessage(result.message, text.toasts),
        variant: "destructive",
      });
    }
  }, [pendingRemoval, remove, text.toasts, toast]);

  return (
    <AdminLayout
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setAddOpen(true)}
          disabled={isAdding}
        >
          <MailPlus className="h-3.5 w-3.5" />
          {text.actions.add}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-1">
          <AdminMetricCard
            title={text.metrics.total}
            value={emails.length}
            description={text.metrics.totalDescription}
            icon={Bell}
          />
        </div>

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={text.filters.searchPlaceholder}
                className="pl-9"
              />
            </div>

            <AdminNotificationsTable
              emails={filtered}
              isLoading={isLoading}
              isRemoving={isRemoving}
              text={text}
              onRemove={(email) => setPendingRemoval(email)}
            />
          </CardContent>
        </Card>
      </div>

      <AdminNotificationAddDialog
        open={addOpen}
        isSubmitting={isAdding}
        text={text}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />

      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(value) => (!value ? setPendingRemoval(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.removeDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval
                ? text.removeDialog.description.replace("{email}", pendingRemoval)
                : text.removeDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{text.removeDialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {text.removeDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminNotifications;
