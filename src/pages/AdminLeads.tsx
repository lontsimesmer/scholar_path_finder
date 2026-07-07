import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminLeadsFilters } from "@/components/admin/leads/AdminLeadsFilters";
import { AdminLeadsMetrics } from "@/components/admin/leads/AdminLeadsMetrics";
import { AdminLeadsTable } from "@/components/admin/leads/AdminLeadsTable";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdminLeads } from "@/hooks/use-admin-leads";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  AdminLeadsText,
  buildAdminLeadStats,
  copyLeadCheckoutLink,
  filterAdminLeads,
  type LeadRecord,
} from "@/lib/admin-leads";

const mapResendError = (
  message: string,
  text: AdminLeadsText,
): string => {
  if (message === "Lead already paid") return text.resendFollowUpErrorPaid;
  if (message === "Follow-up limit reached") return text.resendFollowUpErrorLimit;
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
    leads,
    searchQuery,
    paymentFilter,
    pipelineFilter,
    setSearchQuery,
    setPaymentFilter,
    setPipelineFilter,
    loadLeads,
    resendFollowUp,
  } = useAdminLeads();

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
              onCopyCheckoutLink={handleCopyCheckoutLink}
              onResendFollowUp={handleResendFollowUp}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminLeads;
