import { FormEvent, useCallback, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminBlogText,
  BlogPostRecord,
  EditableBlogPost,
  createEmptyBlogPost,
  isBlogFieldFilled,
  normalizeBlogPost,
} from "@/lib/admin-blog";
import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";

interface UseAdminBlogOptions {
  text: Pick<
    AdminBlogText,
    | "deleteConfirm"
    | "deleteSuccessDescription"
    | "deleteSuccessTitle"
    | "errorTitle"
    | "hiddenTitle"
    | "missingFieldsTitle"
    | "publishedTitle"
    | "saveSuccessDescription"
    | "saveSuccessTitle"
    | "fieldLabels"
  >;
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

export const useAdminBlog = ({ text, toast }: UseAdminBlogOptions) => {
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditableBlogPost | null>(null);

  const normalizedEditingPost = useMemo(
    () => normalizeBlogPost(editingPost),
    [editingPost],
  );

  const missingFields = useMemo(
    () =>
      Object.entries(text.fieldLabels).filter(([field]) => {
        const value = normalizedEditingPost[field as keyof EditableBlogPost];
        return !isBlogFieldFilled(value);
      }),
    [normalizedEditingPost, text.fieldLabels],
  );

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("status", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      toast({ title: text.errorTitle, description: error.message, variant: "destructive" });
    } else {
      setPosts((data || []) as BlogPostRecord[]);
    }

    setIsLoading(false);
  }, [text.errorTitle, toast]);

  const openNewPostDialog = useCallback(() => {
    setEditingPost(createEmptyBlogPost());
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingPost(null);
  }, []);

  const updateEditingPost = useCallback((patch: EditableBlogPost) => {
    setEditingPost((current) => ({
      ...normalizeBlogPost(current),
      ...patch,
    }));
  }, []);

  const editPost = useCallback((post: BlogPostRecord) => {
    setEditingPost(normalizeBlogPost(post));
    setIsDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (missingFields.length > 0) {
        toast({
          title: text.missingFieldsTitle,
          description: `Merci de renseigner: ${missingFields.map(([_, label]) => label).join(", ")}.`,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      const postData = {
        ...normalizedEditingPost,
        image_url: normalizedEditingPost.image_url?.trim(),
        title_fr: normalizedEditingPost.title_fr?.trim(),
        slug_fr: normalizedEditingPost.slug_fr?.trim(),
        content_fr: sanitizeRichTextHtml(normalizedEditingPost.content_fr),
        excerpt_fr: normalizedEditingPost.excerpt_fr?.trim(),
        title_en: normalizedEditingPost.title_en?.trim(),
        slug_en: normalizedEditingPost.slug_en?.trim(),
        content_en: sanitizeRichTextHtml(normalizedEditingPost.content_en),
        excerpt_en: normalizedEditingPost.excerpt_en?.trim(),
        updated_at: new Date().toISOString(),
      };

      let error;

      if (editingPost?.id) {
        const { error: updateError } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("blog_posts").insert([postData]);
        error = insertError;
      }

      if (error) {
        toast({ title: text.errorTitle, description: error.message, variant: "destructive" });
      } else {
        toast({
          title: text.saveSuccessTitle,
          description: text.saveSuccessDescription,
        });
        closeDialog();
        await fetchPosts();
      }

      setIsSubmitting(false);
    },
    [
      closeDialog,
      editingPost?.id,
      fetchPosts,
      missingFields,
      normalizedEditingPost,
      text.errorTitle,
      text.missingFieldsTitle,
      text.saveSuccessDescription,
      text.saveSuccessTitle,
      toast,
    ],
  );

  const toggleStatus = useCallback(
    async (post: BlogPostRecord) => {
      const newStatus = post.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (!error) {
        toast({ title: newStatus === "published" ? text.publishedTitle : text.hiddenTitle });
        await fetchPosts();
      }
    },
    [fetchPosts, text.hiddenTitle, text.publishedTitle, toast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(text.deleteConfirm)) {
        return;
      }

      const { error } = await supabase.from("blog_posts").delete().eq("id", id);

      if (!error) {
        toast({
          title: text.deleteSuccessTitle,
          description: text.deleteSuccessDescription,
        });
        await fetchPosts();
      }
    },
    [fetchPosts, text.deleteConfirm, text.deleteSuccessDescription, text.deleteSuccessTitle, toast],
  );

  return {
    closeDialog,
    editPost,
    editingPost,
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
  };
};
