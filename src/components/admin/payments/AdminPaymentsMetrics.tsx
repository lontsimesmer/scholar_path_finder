import {
  CheckCircle2,
  CreditCard,
  ReceiptText,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPaymentsText } from "@/lib/admin-payments";

interface AdminPaymentsMetricsProps {
  acceptedAmountLabel: string;
  stats: {
    total: number;
    accepted: number;
    pending: number;
    failed: number;
  };
  text: AdminPaymentsText;
}

export const AdminPaymentsMetrics = ({
  acceptedAmountLabel,
  stats,
  text,
}: AdminPaymentsMetricsProps) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <AdminMetricCard
      title={text.metrics.total}
      value={stats.total}
      description={text.metrics.totalDescription}
      icon={WalletCards}
    />
    <AdminMetricCard
      title={text.metrics.accepted}
      value={stats.accepted}
      description={text.metrics.acceptedDescription}
      icon={CheckCircle2}
      tone="success"
    />
    <AdminMetricCard
      title={text.metrics.pending}
      value={stats.pending}
      description={text.metrics.pendingDescription}
      icon={CreditCard}
      tone="warning"
    />
    <AdminMetricCard
      title={text.metrics.failed}
      value={stats.failed}
      description={text.metrics.failedDescription}
      icon={TriangleAlert}
      tone="neutral"
    />
    <AdminMetricCard
      title={text.metrics.acceptedAmount}
      value={acceptedAmountLabel}
      description={text.metrics.acceptedAmountDescription}
      icon={ReceiptText}
    />
  </div>
);
