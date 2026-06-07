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
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <AdminMetricCard
      title={text.metrics.pending}
      value={`${stats.pending} · ${pendingAmountLabel}`}
      description={text.metrics.pendingDescription}
      icon={Clock}
      tone="warning"
      index={0}
    />
    <AdminMetricCard
      title={text.metrics.approved}
      value={stats.approved}
      description={text.metrics.approvedDescription}
      icon={CheckCircle2}
      tone="success"
      index={1}
    />
    <AdminMetricCard
      title={text.metrics.rejected}
      value={stats.rejected}
      description={text.metrics.rejectedDescription}
      icon={XCircle}
      tone="neutral"
      index={2}
    />
    <AdminMetricCard
      title={text.metrics.blocked}
      value={stats.blocked}
      description={text.metrics.blockedDescription}
      icon={ShieldOff}
      tone="neutral"
      index={3}
    />
  </div>
);
