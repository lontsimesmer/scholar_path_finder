import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";

import Header from "@/components/Header";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminLeadsFilters } from "@/components/admin/leads/AdminLeadsFilters";
import { AdminLeadsMetrics } from "@/components/admin/leads/AdminLeadsMetrics";
import { AdminLeadsTable } from "@/components/admin/leads/AdminLeadsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminLeads } from "@/hooks/use-admin-leads";
import { useLanguage } from "@/i18n/language";
import { ADMIN_DASHBOARD_PATH, getAdminSession } from "@/lib/admin-session";
import { AdminLeadsText, buildAdminLeadStats, filterAdminLeads } from "@/lib/admin-leads";

const AdminLeads = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const text = t.adminLeads as AdminLeadsText;
  const {
    isLoading,
    leads,
    searchQuery,
    paymentFilter,
    pipelineFilter,
    setSearchQuery,
    setPaymentFilter,
    setPipelineFilter,
    loadLeads,
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
  const navItems = [
    { href: "/admin", label: text.breadcrumbDashboard },
    { href: "/admin/crm", label: t.adminCRM.breadcrumbCurrent },
    { href: "/admin/leads", label: text.breadcrumbCurrent },
    { href: "/admin/payments", label: t.adminPayments.breadcrumbCurrent },
    { href: "/admin/manual-payments", label: t.adminManualPayments.breadcrumbCurrent },
    { href: "/admin/blog", label: t.adminBlog.breadcrumbCurrent },
    { href: "/admin/faq", label: t.adminFaq.breadcrumbCurrent },
  ];
  const highlights = [
    {
      label: text.metrics.total,
      value: stats.total,
    },
    {
      label: text.metrics.pendingPayments,
      value: stats.pendingPaymentsCount,
      tone: "warning" as const,
    },
    {
      label: text.metrics.followUpDue,
      value: stats.followUpDueCount,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <AdminWorkspaceHeader
            dashboardHref={ADMIN_DASHBOARD_PATH}
            dashboardLabel={text.breadcrumbDashboard}
            currentLabel={text.breadcrumbCurrent}
            title={text.title}
            subtitle={text.subtitle}
            navItems={navItems}
            highlights={highlights}
            actions={
              <Button asChild className="rounded-xl">
                <Link to="/admin/payments">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {text.openPayments}
                </Link>
              </Button>
            }
          />

          <AdminLeadsMetrics stats={stats} text={text} />

          <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
            <CardContent className="space-y-6 p-6 pt-6 md:pt-6">
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
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminLeads;
