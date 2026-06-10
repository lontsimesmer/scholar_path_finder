import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminManualPaymentValidationDialog } from "@/components/admin/manual-payments/AdminManualPaymentValidationDialog";
import { AdminManualPaymentsFilters } from "@/components/admin/manual-payments/AdminManualPaymentsFilters";
import { AdminManualPaymentsMetrics } from "@/components/admin/manual-payments/AdminManualPaymentsMetrics";
import { AdminManualPaymentsTable } from "@/components/admin/manual-payments/AdminManualPaymentsTable";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminManualPayments } from "@/hooks/use-admin-manual-payments";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  type AdminManualPaymentsText,
  buildManualPaymentStats,
  filterManualPaymentSubmissions,
  type ManualPaymentSubmissionRecord,
} from "@/lib/admin-manual-payments";

const AdminManualPayments = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const text = t.adminManualPayments as AdminManualPaymentsText;
  const {
    isLoading,
    submissions,
    leadById,
    profileById,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loadSubmissions,
    validateSubmission,
    blockLead,
  } = useAdminManualPayments();

  const [activeSubmission, setActiveSubmission] = useState<ManualPaymentSubmissionRecord | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const session = await getAdminSession();
      if (!session) {
        navigate("/login?redirect=/admin/manual-payments", { replace: true });
        return;
      }
      if (isActive) {
        await loadSubmissions();
      }
    };
    void initialize();
    return () => {
      isActive = false;
    };
  }, [loadSubmissions, navigate]);

  useEffect(() => {
    const submissionId = searchParams.get("submissionId");
    if (!submissionId) return;
    const match = submissions.find((s) => s.id === submissionId);
    if (match) {
      setActiveSubmission(match);
    }
  }, [searchParams, submissions]);

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency: "XAF",
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const filtered = useMemo(
    () =>
      filterManualPaymentSubmissions({
        submissions,
        leadById,
        profileById,
        statusFilter,
        query: searchQuery,
      }),
    [leadById, profileById, searchQuery, statusFilter, submissions],
  );

  const stats = useMemo(
    () => buildManualPaymentStats(submissions, leadById),
    [leadById, submissions],
  );

  const closeDialog = () => {
    setActiveSubmission(null);
    if (searchParams.has("submissionId")) {
      searchParams.delete("submissionId");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <AdminLayout title={text.title} subtitle={text.subtitle}>
      <div className="space-y-6">
        <AdminManualPaymentsMetrics
          stats={stats}
          pendingAmountLabel={amountFormatter.format(stats.pendingAmount)}
          text={text}
        />

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
            <AdminManualPaymentsFilters
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              text={text}
            />

            <AdminManualPaymentsTable
              amountFormatter={amountFormatter}
              dateFormatter={dateFormatter}
              isLoading={isLoading}
              submissions={filtered}
              leadById={leadById}
              profileById={profileById}
              text={text}
              onReview={(submission) => setActiveSubmission(submission)}
            />
          </CardContent>
        </Card>
      </div>

      <AdminManualPaymentValidationDialog
        open={Boolean(activeSubmission)}
        submission={activeSubmission}
        lead={activeSubmission ? leadById[activeSubmission.lead_id] : undefined}
        profile={activeSubmission ? profileById[activeSubmission.student_id] : undefined}
        amountFormatter={amountFormatter}
        dateFormatter={dateFormatter}
        text={text}
        onClose={closeDialog}
        onValidate={validateSubmission}
        onBlockLead={blockLead}
      />
    </AdminLayout>
  );
};

export default AdminManualPayments;
