import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReceiptText } from "lucide-react";

import Header from "@/components/Header";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminPaymentsFilters } from "@/components/admin/payments/AdminPaymentsFilters";
import { AdminPaymentsMetrics } from "@/components/admin/payments/AdminPaymentsMetrics";
import { AdminPaymentsTable } from "@/components/admin/payments/AdminPaymentsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/language";
import { ADMIN_DASHBOARD_PATH, getAdminSession } from "@/lib/admin-session";
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
  const navItems = [
    { href: "/admin", label: adminPaymentsText.breadcrumbDashboard },
    { href: "/admin/crm", label: t.adminCRM.breadcrumbCurrent },
    { href: "/admin/leads", label: t.adminLeads.breadcrumbCurrent },
    { href: "/admin/payments", label: adminPaymentsText.breadcrumbCurrent },
    { href: "/admin/blog", label: t.adminBlog.breadcrumbCurrent },
  ];
  const highlights = [
    {
      label: adminPaymentsText.metrics.total,
      value: stats.total,
    },
    {
      label: adminPaymentsText.metrics.pending,
      value: stats.pending,
      tone: "warning" as const,
    },
    {
      label: adminPaymentsText.metrics.failed,
      value: stats.failed,
      tone: "neutral" as const,
    },
    {
      label: adminPaymentsText.metrics.acceptedAmount,
      value: amountFormatter.format(stats.acceptedAmount),
      tone: "success" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <AdminWorkspaceHeader
            dashboardHref={ADMIN_DASHBOARD_PATH}
            dashboardLabel={adminPaymentsText.breadcrumbDashboard}
            currentLabel={adminPaymentsText.breadcrumbCurrent}
            title={adminPaymentsText.title}
            subtitle={adminPaymentsText.subtitle}
            navItems={navItems}
            highlights={highlights}
            actions={
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/admin/leads">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  {adminPaymentsText.openLeads}
                </Link>
              </Button>
            }
          />

          <AdminPaymentsMetrics
            acceptedAmountLabel={amountFormatter.format(stats.acceptedAmount)}
            stats={stats}
            text={adminPaymentsText}
          />

          <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
            <CardContent className="space-y-6 p-6 pt-6 md:pt-6">
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
      </main>
    </div>
  );
};

export default AdminPayments;
