import { LogOut } from "lucide-react";

import Header from "@/components/Header";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminDashboardBlogCard } from "@/components/admin/dashboard/AdminDashboardBlogCard";
import { AdminDashboardMetrics } from "@/components/admin/dashboard/AdminDashboardMetrics";
import { AdminDashboardOperationsCard } from "@/components/admin/dashboard/AdminDashboardOperationsCard";
import { AdminDashboardPricingCard } from "@/components/admin/dashboard/AdminDashboardPricingCard";
import { AdminDashboardSidePanel } from "@/components/admin/dashboard/AdminDashboardSidePanel";
import { Button } from "@/components/ui/button";
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
  const { stats, isLoading, handleSignOut } = useAdminDashboard();
  const text = t.adminDashboard as AdminDashboardText;
  const metrics = buildAdminDashboardMetrics(text, stats, isLoading);
  const actionItems = buildAdminDashboardActionItems(text, stats);
  const operations = buildAdminDashboardOperations(text, stats, isLoading);
  const navItems = [
    { href: "/admin", label: t.adminCRM.breadcrumbDashboard },
    { href: "/admin/crm", label: t.adminCRM.breadcrumbCurrent },
    { href: "/admin/leads", label: t.adminLeads.breadcrumbCurrent },
    { href: "/admin/payments", label: t.adminPayments.breadcrumbCurrent },
    { href: "/admin/blog", label: t.adminBlog.breadcrumbCurrent },
  ];
  const highlights = [
    {
      label: text.metrics.pendingPayments,
      value: isLoading ? "..." : stats.pendingPayments,
      tone: "warning" as const,
    },
    {
      label: text.metrics.pendingDocuments,
      value: isLoading ? "..." : stats.pendingDocuments,
      tone: "neutral" as const,
    },
    {
      label: text.metrics.paidConsultations,
      value: isLoading ? "..." : stats.paidConsultations,
      tone: "success" as const,
    },
  ];

  return (
    <div className="page-shell">
      <Header />

      <main className="relative z-10 pb-24 pt-32">
        <div className="section-container space-y-10">
          <AdminWorkspaceHeader
            title={text.title}
            subtitle={text.subtitle}
            navItems={navItems}
            highlights={highlights}
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <LogOut size={16} />
                {text.signOut}
              </Button>
            }
          />

          <div className="animate-card-in" style={{ animationDelay: "120ms" }}>
            <AdminDashboardMetrics metrics={metrics} />
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-8">
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
      </main>
    </div>
  );
};

export default AdminDashboard;
