import { CalendarClock, CircleDollarSign, CreditCard, UserRoundSearch } from "lucide-react";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLeadStats, AdminLeadsText } from "@/lib/admin-leads";

type AdminLeadsMetricsProps = {
  stats: AdminLeadStats;
  text: AdminLeadsText;
};

export function AdminLeadsMetrics({ stats, text }: AdminLeadsMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        title={text.metrics.total}
        value={stats.total}
        description={text.metrics.totalDescription}
        icon={UserRoundSearch}
      />
      <AdminMetricCard
        title={text.metrics.paid}
        value={stats.paidCount}
        description={text.metrics.paidDescription}
        icon={CircleDollarSign}
        tone="success"
      />
      <AdminMetricCard
        title={text.metrics.pendingPayments}
        value={stats.pendingPaymentsCount}
        description={text.metrics.pendingDescription}
        icon={CreditCard}
        tone="warning"
      />
      <AdminMetricCard
        title={text.metrics.followUpDue}
        value={stats.followUpDueCount}
        description={text.metrics.followUpDescription}
        icon={CalendarClock}
        tone="neutral"
      />
    </div>
  );
}
