import { CheckCircle2, CircleDollarSign, Files, LayoutDashboard } from "lucide-react";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminCRMMetrics as AdminCRMMetricsData, AdminCRMText } from "@/lib/admin-crm";

interface AdminCRMMetricsProps {
  metrics: AdminCRMMetricsData;
  text: AdminCRMText;
}

export const AdminCRMMetrics = ({ metrics, text }: AdminCRMMetricsProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <AdminMetricCard
      title={text.metrics.totalStudents}
      value={metrics.totalStudents}
      description={text.metrics.totalStudentsDescription}
      icon={LayoutDashboard}
    />
    <AdminMetricCard
      title={text.metrics.validatedProfiles}
      value={metrics.validatedProfiles}
      description={text.metrics.validatedProfilesDescription}
      icon={CheckCircle2}
      tone="success"
    />
    <AdminMetricCard
      title={text.metrics.paidConsultations}
      value={metrics.paidConsultations}
      description={text.metrics.paidConsultationsDescription}
      icon={CircleDollarSign}
    />
    <AdminMetricCard
      title={text.metrics.pendingDocuments}
      value={metrics.pendingDocuments}
      description={text.metrics.pendingDocumentsDescription}
      icon={Files}
      tone="warning"
    />
  </div>
);
