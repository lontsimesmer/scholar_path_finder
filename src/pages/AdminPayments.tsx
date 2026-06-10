import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReceiptText } from "lucide-react";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminPaymentsFilters } from "@/components/admin/payments/AdminPaymentsFilters";
import { AdminPaymentsMetrics } from "@/components/admin/payments/AdminPaymentsMetrics";
import { AdminPaymentsTable } from "@/components/admin/payments/AdminPaymentsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  AdminPaymentsText,
  buildPaymentStats,
  filterPaymentTransactions,
} from "@/lib/admin-payments";
import { useAdminPayments } from "@/hooks/use-admin-payments";

const AdminPayments = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const adminPaymentsText = t.adminPayments as AdminPaymentsText;
  const {
    channelFilter,
    isLoading,
    leadById,
    loadPayments,
    profileById,
    searchQuery,
    setChannelFilter,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    transactions,
  } = useAdminPayments();

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      const session = await getAdminSession();
      if (!session) {
        navigate("/login?redirect=/admin/payments", { replace: true });
        return;
      }

      if (isActive) {
        await loadPayments();
      }
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, [loadPayments, navigate]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency: "XAF",
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const filteredTransactions = useMemo(
    () =>
      filterPaymentTransactions({
        channelFilter,
        leadById,
        profileById,
        query: searchQuery,
        statusFilter,
        transactions,
      }),
    [channelFilter, leadById, profileById, searchQuery, statusFilter, transactions],
  );

  const stats = useMemo(() => buildPaymentStats(transactions), [transactions]);

  return (
    <AdminLayout
      title={adminPaymentsText.title}
      subtitle={adminPaymentsText.subtitle}
      actions={
        <Button asChild size="sm" variant="outline" className="h-8 gap-2">
          <Link to="/admin/leads">
            <ReceiptText className="h-3.5 w-3.5" />
            {adminPaymentsText.openLeads}
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <AdminPaymentsMetrics
          acceptedAmountLabel={amountFormatter.format(stats.acceptedAmount)}
          stats={stats}
          text={adminPaymentsText}
        />

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
            <AdminPaymentsFilters
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              onSearchQueryChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              text={adminPaymentsText}
            />

            <AdminPaymentsTable
              amountFormatter={amountFormatter}
              dateFormatter={dateFormatter}
              filteredTransactions={filteredTransactions}
              isLoading={isLoading}
              leadById={leadById}
              noStudentLabel={adminPaymentsText.noStudent}
              onOpenPaymentUrl={(url) => window.open(url, "_blank", "noopener,noreferrer")}
              profileById={profileById}
              text={adminPaymentsText}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
