import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDashboardMetric } from "@/lib/admin-dashboard";

type AdminDashboardMetricsProps = {
  metrics: AdminDashboardMetric[];
};

export function AdminDashboardMetrics({ metrics }: AdminDashboardMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <AdminMetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          icon={metric.icon}
          tone={metric.tone}
        />
      ))}
    </div>
  );
}
