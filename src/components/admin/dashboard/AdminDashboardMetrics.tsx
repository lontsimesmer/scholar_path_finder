import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDashboardMetric } from "@/lib/admin-dashboard";

type AdminDashboardMetricsProps = {
  metrics: AdminDashboardMetric[];
};

export function AdminDashboardMetrics({ metrics }: AdminDashboardMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric, index) => (
        <AdminMetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          icon={metric.icon}
          tone={metric.tone}
          index={index}
        />
      ))}
    </div>
  );
}
