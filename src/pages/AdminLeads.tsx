import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminLeadNotesDialog } from "@/components/admin/leads/AdminLeadNotesDialog";
import { AdminLeadsFilters } from "@/components/admin/leads/AdminLeadsFilters";
import { AdminLeadsMetrics } from "@/components/admin/leads/AdminLeadsMetrics";
import { AdminLeadsTable } from "@/components/admin/leads/AdminLeadsTable";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminLeads } from "@/hooks/use-admin-leads";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  AdminLeadsText,
  buildAdminLeadStats,
  copyLeadCheckoutLink,
  filterAdminLeads,
  isFollowUpPaused,
  type LeadRecord,
} from "@/lib/admin-leads";

const mapResendError = (
  message: string,
  text: AdminLeadsText,
): string => {
  if (message === "Lead already paid") return text.resendFollowUpErrorPaid;
  if (message === "Follow-up limit reached") return text.resendFollowUpErrorLimit;
  if (message === "Follow-ups are paused for this lead") return text.resendFollowUpErrorPaused;
  if (message.startsWith("Cooldown active")) return text.resendFollowUpErrorCooldown;
  return message || text.resendFollowUpErrorGeneric;
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const text = t.adminLeads as AdminLeadsText;
  const {
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
  } = useAdminLeads();

  const [notesLead, setNotesLead] = useState<LeadRecord | null>(null);
  const [pauseLead, setPauseLead] = useState<LeadRecord | null>(null);
  const [pauseReason, setPauseReason] = useState("");

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      const session = await getAdminSession();
      if (!session) {
        navigate("/login?redirect=/admin/leads", { replace: true });
        return;
      }

      if (isActive) {
        await loadLeads();
      }
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, [loadLeads, navigate]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const filteredLeads = useMemo(
    () =>
      filterAdminLeads({
        leads,
        query: searchQuery,
        paymentFilter,
        pipelineFilter,
      }),
    [leads, paymentFilter, pipelineFilter, searchQuery],
  );

  const stats = useMemo(() => buildAdminLeadStats(leads), [leads]);

  const handleCopyCheckoutLink = useCallback(
    async (lead: LeadRecord) => {
      const ok = await copyLeadCheckoutLink(lead, window.location.origin);
      if (ok) {
        toast({
          title: text.linkCopiedTitle,
          description: text.linkCopiedDescription,
        });
      } else {
        toast({
          title: text.linkCopyErrorTitle,
          variant: "destructive",
        });
      }
    },
    [text.linkCopiedDescription, text.linkCopiedTitle, text.linkCopyErrorTitle, toast],
  );

  const handleResendFollowUp = useCallback(
    async (lead: LeadRecord) => {
      const result = await resendFollowUp(lead.id);
      if (result.success) {
        toast({
          title: text.resendFollowUpSuccessTitle,
          description: text.resendFollowUpSuccessDescription.replace(
            "{email}",
            lead.email,
          ),
        });
      } else {
        toast({
          title: text.resendFollowUpErrorTitle,
          description: mapResendError(result.message, text),
          variant: "destructive",
        });
      }
    },
    [resendFollowUp, text, toast],
  );

  const handleOpenNotes = useCallback((lead: LeadRecord) => {
    setNotesLead(lead);
  }, []);

  const handleRequestToggleFollowUpPause = useCallback((lead: LeadRecord) => {
    setPauseLead(lead);
    setPauseReason("");
  }, []);

  const handleConfirmToggleFollowUpPause = useCallback(async () => {
    if (!pauseLead) return;
    const currentlyPaused = isFollowUpPaused(pauseLead);
    const result = await toggleFollowUpPause({
      leadId: pauseLead.id,
      paused: !currentlyPaused,
      reason: currentlyPaused ? undefined : pauseReason.trim() || undefined,
    });
    if (result.success) {
      toast({
        title: currentlyPaused
          ? text.pauseDialog.resumeSuccessTitle
          : text.pauseDialog.pauseSuccessTitle,
      });
      setPauseLead(null);
      setPauseReason("");
    } else {
      toast({
        title: text.pauseDialog.errorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [pauseLead, pauseReason, text.pauseDialog, toast, toggleFollowUpPause]);

  return (
    <AdminLayout title={text.title} subtitle={text.subtitle}>
      <div className="space-y-6">
        <AdminLeadsMetrics stats={stats} text={text} />

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
            <AdminLeadsFilters
              searchQuery={searchQuery}
              paymentFilter={paymentFilter}
              pipelineFilter={pipelineFilter}
              text={text}
              onSearchQueryChange={setSearchQuery}
              onPaymentFilterChange={setPaymentFilter}
              onPipelineFilterChange={setPipelineFilter}
            />

            <AdminLeadsTable
              isLoading={isLoading}
              leads={filteredLeads}
              text={text}
              dateFormatter={dateFormatter}
              isResending={isResending}
              isTogglingPause={isTogglingPause}
              onCopyCheckoutLink={handleCopyCheckoutLink}
              onResendFollowUp={handleResendFollowUp}
              onOpenNotes={handleOpenNotes}
              onToggleFollowUpPause={handleRequestToggleFollowUpPause}
            />
          </CardContent>
        </Card>
      </div>

      <AdminLeadNotesDialog
        open={Boolean(notesLead)}
        leadId={notesLead?.id ?? null}
        leadEmail={notesLead?.email ?? null}
        dateFormatter={dateFormatter}
        text={text}
        onClose={() => setNotesLead(null)}
      />

      <AlertDialog
        open={Boolean(pauseLead)}
        onOpenChange={(value) => {
          if (!value) {
            setPauseLead(null);
            setPauseReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pauseLead && isFollowUpPaused(pauseLead)
                ? text.pauseDialog.resumeTitle
                : text.pauseDialog.pauseTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pauseLead && isFollowUpPaused(pauseLead)
                ? text.pauseDialog.resumeDescription
                : text.pauseDialog.pauseDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pauseLead && !isFollowUpPaused(pauseLead) ? (
            <div className="space-y-2">
              <Label htmlFor="admin-lead-pause-reason">
                {text.pauseDialog.reasonLabel}
              </Label>
              <Input
                id="admin-lead-pause-reason"
                value={pauseReason}
                onChange={(event) => setPauseReason(event.target.value)}
                placeholder={text.pauseDialog.reasonPlaceholder}
                disabled={isTogglingPause}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingPause}>
              {text.pauseDialog.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleFollowUpPause}
              disabled={isTogglingPause}
            >
              {pauseLead && isFollowUpPaused(pauseLead)
                ? text.pauseDialog.confirmResume
                : text.pauseDialog.confirmPause}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminLeads;
