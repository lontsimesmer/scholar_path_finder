import { CheckCircle2, Clock, ShieldOff, XCircle } from "lucide-react";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import type { AdminManualPaymentsText } from "@/lib/admin-manual-payments";

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  blocked: number;
  pendingAmount: number;
};

interface AdminManualPaymentsMetricsProps {
  stats: Stats;
  pendingAmountLabel: string;
  text: AdminManualPaymentsText;
}

export const AdminManualPaymentsMetrics = ({
  stats,
  pendingAmountLabel,
  text,
}: AdminManualPaymentsMetricsProps) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <AdminMetricCard
      title={text.metrics.pending}
      value={`${stats.pending} · ${pendingAmountLabel}`}
      description={text.metrics.pendingDescription}
      icon={Clock}
      tone="warning"
    />
    <AdminMetricCard
      title={text.metrics.approved}
      value={stats.approved}
      description={text.metrics.approvedDescription}
      icon={CheckCircle2}
      tone="success"
    />
    <AdminMetricCard
      title={text.metrics.rejected}
      value={stats.rejected}
      description={text.metrics.rejectedDescription}
      icon={XCircle}
      tone="neutral"
    />
    <AdminMetricCard
      title={text.metrics.blocked}
      value={stats.blocked}
      description={text.metrics.blockedDescription}
      icon={ShieldOff}
      tone="neutral"
    />
  </div>
);
