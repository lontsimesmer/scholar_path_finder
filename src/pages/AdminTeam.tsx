import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminInviteDialog } from "@/components/admin/team/AdminInviteDialog";
import { AdminTeamTable } from "@/components/admin/team/AdminTeamTable";
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
import { useAdminTeam } from "@/hooks/use-admin-team";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  type AdminTeamMember,
  type AdminTeamText,
  filterAdmins,
  normalizeAdminEmail,
} from "@/lib/admin-team";

const mapErrorMessage = (
  message: string,
  toasts: AdminTeamText["toasts"],
): string => {
  if (message === "Email is already an admin") return toasts.errorAlreadyAdmin;
  if (message === "Invalid email format") return toasts.errorInvalidEmail;
  if (message === "You cannot remove yourself") return toasts.errorSelfRemove;
  if (message === "Rate limit exceeded") return toasts.errorRateLimit;
  return message || toasts.errorGeneric;
};

const AdminTeam = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const text = t.adminTeam as AdminTeamText;
  const { toast } = useToast();
  const {
    admins,
    isLoading,
    isInviting,
    isRemoving,
    searchQuery,
    setSearchQuery,
    invite,
    remove,
  } = useAdminTeam();

  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<AdminTeamMember | null>(null);

  useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const session = await getAdminSession();
      if (!isActive) return;
      if (!session) {
        navigate("/login?redirect=/admin/team", { replace: true });
        return;
      }
      setCurrentEmail(session.user.email ? normalizeAdminEmail(session.user.email) : null);
    };
    void initialize();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const filtered = useMemo(() => filterAdmins(admins, searchQuery), [admins, searchQuery]);

  const invitedCount = useMemo(
    () => (currentEmail ? admins.filter((admin) => admin.email !== currentEmail).length : admins.length),
    [admins, currentEmail],
  );

  const handleInvite = useCallback(
    async (email: string) => {
      const result = await invite(email);
      if (result.success) {
        toast({
          title: text.toasts.inviteSuccessTitle,
          description: text.toasts.inviteSuccessDescription,
        });
        setInviteOpen(false);
      } else {
        toast({
          title: text.toasts.errorTitle,
          description: mapErrorMessage(result.message, text.toasts),
          variant: "destructive",
        });
      }
    },
    [invite, text.toasts, toast],
  );

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    const result = await remove(pendingRemoval.email);
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
          onClick={() => setInviteOpen(true)}
          disabled={isInviting}
        >
          <UserPlus className="h-3.5 w-3.5" />
          {text.actions.invite}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard
            title={text.metrics.total}
            value={admins.length}
            description={text.metrics.totalDescription}
            icon={ShieldCheck}
          />
          <AdminMetricCard
            title={text.metrics.invited}
            value={invitedCount}
            description={text.metrics.invitedDescription}
            icon={Mail}
            tone="neutral"
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

            <AdminTeamTable
              admins={filtered}
              isLoading={isLoading}
              currentEmail={currentEmail}
              dateFormatter={dateFormatter}
              text={text}
              onRemove={(admin) => setPendingRemoval(admin)}
            />
          </CardContent>
        </Card>
      </div>

      <AdminInviteDialog
        open={inviteOpen}
        isSubmitting={isInviting}
        text={text}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
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
                ? text.removeDialog.description.replace("{email}", pendingRemoval.email)
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

export default AdminTeam;
