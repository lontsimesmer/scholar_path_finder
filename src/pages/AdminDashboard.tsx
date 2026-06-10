import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminDashboardBlogCard } from "@/components/admin/dashboard/AdminDashboardBlogCard";
import { AdminDashboardMetrics } from "@/components/admin/dashboard/AdminDashboardMetrics";
import { AdminDashboardOperationsCard } from "@/components/admin/dashboard/AdminDashboardOperationsCard";
import { AdminDashboardPricingCard } from "@/components/admin/dashboard/AdminDashboardPricingCard";
import { AdminDashboardSidePanel } from "@/components/admin/dashboard/AdminDashboardSidePanel";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useLanguage } from "@/i18n/language";
import {
  AdminDashboardText,
  buildAdminDashboardActionItems,
  buildAdminDashboardMetrics,
  buildAdminDashboardOperations,
} from "@/lib/admin-dashboard";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { stats, isLoading } = useAdminDashboard();
  const text = t.adminDashboard as AdminDashboardText;
  const metrics = buildAdminDashboardMetrics(text, stats, isLoading);
  const actionItems = buildAdminDashboardActionItems(text, stats);
  const operations = buildAdminDashboardOperations(text, stats, isLoading);

  return (
    <AdminLayout title={text.title} subtitle={text.subtitle}>
      <div className="space-y-6">
        <AdminDashboardMetrics metrics={metrics} />

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <AdminDashboardPricingCard text={text.pricing} />

            <AdminDashboardOperationsCard
              title={text.operationalOverview}
              description={text.operationalDescription}
              operations={operations}
            />

            <AdminDashboardBlogCard
              title={text.blogTitle}
              description={text.blogDescription}
              publishedPostsLabel={text.metrics.publishedPosts}
              publishedPostsValue={isLoading ? "..." : stats.publishedPosts}
              manageLabel={text.manageBlogs}
              newArticleLabel={text.newArticle}
            />
          </div>

          <AdminDashboardSidePanel
            title={text.actionRequiredTitle}
            description={text.actionRequiredDescription}
            actionItems={actionItems}
            publicSiteLabel={text.publicSite}
            viewSiteLabel={text.viewSite}
            seoHealthLabel={text.seoHealth}
            optimizationOkLabel={text.optimizationOk}
            settingsLabel={text.settings}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
