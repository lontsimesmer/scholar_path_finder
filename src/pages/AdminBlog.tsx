import { useCallback, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";

import Header from "@/components/Header";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminBlogEditorDialog } from "@/components/admin/blog/AdminBlogEditorDialog";
import { AdminBlogPostsTable } from "@/components/admin/blog/AdminBlogPostsTable";
import { Button } from "@/components/ui/button";
import { useAdminBlog } from "@/hooks/use-admin-blog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { ADMIN_DASHBOARD_PATH, getAdminSession } from "@/lib/admin-session";
import { AdminBlogText } from "@/lib/admin-blog";

const AdminBlog = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const blogText = t.adminBlog as AdminBlogText;
  const {
    closeDialog,
    editPost,
    fetchPosts,
    handleDelete,
    handleSave,
    isDialogOpen,
    isLoading,
    isSubmitting,
    missingFields,
    normalizedEditingPost,
    openNewPostDialog,
    posts,
    setIsDialogOpen,
    toggleStatus,
    updateEditingPost,
  } = useAdminBlog({
    text: {
      deleteConfirm: blogText.deleteConfirm,
      deleteSuccessDescription: blogText.deleteSuccessDescription,
      deleteSuccessTitle: blogText.deleteSuccessTitle,
      errorTitle: blogText.errorTitle,
      fieldLabels: blogText.fieldLabels,
      hiddenTitle: blogText.hiddenTitle,
      missingFieldsTitle: blogText.missingFieldsTitle,
      publishedTitle: blogText.publishedTitle,
      saveSuccessDescription: blogText.saveSuccessDescription,
      saveSuccessTitle: blogText.saveSuccessTitle,
    },
    toast,
  });

  const checkUser = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) {
      navigate("/login?redirect=/admin/blog", { replace: true });
    }
  }, [navigate]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setIsDialogOpen(true);
        return;
      }

      closeDialog();

      if (searchParams.get("action") === "new") {
        navigate("/admin/blog", { replace: true });
      }
    },
    [closeDialog, navigate, searchParams, setIsDialogOpen],
  );

  useEffect(() => {
    void checkUser();
    void fetchPosts();

    if (searchParams.get("action") === "new") {
      openNewPostDialog();
    }
  }, [checkUser, fetchPosts, openNewPostDialog, searchParams]);

  const navItems = [
    { href: "/admin", label: blogText.breadcrumbDashboard },
    { href: "/admin/crm", label: t.adminCRM.breadcrumbCurrent },
    { href: "/admin/leads", label: t.adminLeads.breadcrumbCurrent },
    { href: "/admin/payments", label: t.adminPayments.breadcrumbCurrent },
    { href: "/admin/blog", label: blogText.breadcrumbCurrent },
  ];
  const highlights = [
    {
      label: blogText.publishedTitle,
      value: posts.filter((post) => post.status === "published").length,
      tone: "success" as const,
    },
    {
      label: blogText.hiddenTitle,
      value: posts.filter((post) => post.status === "draft").length,
      tone: "warning" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />
      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <AdminWorkspaceHeader
            dashboardHref={ADMIN_DASHBOARD_PATH}
            dashboardLabel={blogText.breadcrumbDashboard}
            currentLabel={blogText.breadcrumbCurrent}
            title={blogText.title}
            subtitle={blogText.subtitle}
            navItems={navItems}
            highlights={highlights}
            actions={
              <Button className="gap-2 rounded-xl px-6" onClick={openNewPostDialog}>
                <Plus size={18} />
                {blogText.newArticle}
              </Button>
            }
          />

          <AdminBlogPostsTable
            currentLanguage={language}
            isLoading={isLoading}
            onDelete={handleDelete}
            onEdit={editPost}
            onOpenPreview={(slug) => window.open(`/blog/${slug}`, "_blank")}
            onToggleStatus={toggleStatus}
            posts={posts}
            text={blogText}
          />
        </div>
      </main>

      <AdminBlogEditorDialog
        editorLabels={blogText.editor}
        isOpen={isDialogOpen}
        isSubmitting={isSubmitting}
        missingFieldsCount={missingFields.length}
        onOpenChange={handleDialogOpenChange}
        onSave={handleSave}
        onUpdatePost={updateEditingPost}
        post={normalizedEditingPost}
        text={blogText}
      />
    </div>
  );
};

export default AdminBlog;
