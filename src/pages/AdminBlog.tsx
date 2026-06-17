import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminBlogEditorDialog } from "@/components/admin/blog/AdminBlogEditorDialog";
import { AdminBlogPostsTable } from "@/components/admin/blog/AdminBlogPostsTable";
import { Button } from "@/components/ui/button";
import { useAdminBlog } from "@/hooks/use-admin-blog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
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

  return (
    <AdminLayout
      title={blogText.title}
      subtitle={blogText.subtitle}
      actions={
        <Button size="sm" className="h-8 gap-1.5" onClick={openNewPostDialog}>
          <Plus className="h-3.5 w-3.5" />
          {blogText.newArticle}
        </Button>
      }
    >
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
    </AdminLayout>
  );
};

export default AdminBlog;
