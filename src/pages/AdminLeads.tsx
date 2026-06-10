import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminLeadsFilters } from "@/components/admin/leads/AdminLeadsFilters";
import { AdminLeadsMetrics } from "@/components/admin/leads/AdminLeadsMetrics";
import { AdminLeadsTable } from "@/components/admin/leads/AdminLeadsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminLeads } from "@/hooks/use-admin-leads";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
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

  return (
    <AdminLayout
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button asChild size="sm" variant="outline" className="h-8 gap-2">
          <Link to="/admin/payments">
            <CreditCard className="h-3.5 w-3.5" />
            {text.openPayments}
          </Link>
        </Button>
      }
    >
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
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminLeads;
