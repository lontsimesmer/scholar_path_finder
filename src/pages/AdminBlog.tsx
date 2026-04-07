import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  Loader2,
  EyeOff,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/language";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title_fr: string;
  slug_fr: string;
  content_fr: string;
  excerpt_fr: string;
  title_en: string;
  slug_en: string;
  content_en: string;
  excerpt_en: string;
  status: "draft" | "published";
  image_url: string;
}

type EditablePost = Partial<Post>;

const AUTHORIZED_EMAILS = [
  "toubi.prestation@gmail.com",
  "powerprestationint@gmail.com",
  "admin@powerprestation.com",
];

const createEmptyPost = (): EditablePost => ({
  status: "draft",
  image_url: "",
  title_fr: "",
  slug_fr: "",
  content_fr: "",
  excerpt_fr: "",
  title_en: "",
  slug_en: "",
  content_en: "",
  excerpt_en: "",
});

const normalizePost = (post: EditablePost | null | undefined): EditablePost => ({
  ...createEmptyPost(),
  ...post,
  image_url: post?.image_url ?? "",
  title_fr: post?.title_fr ?? "",
  slug_fr: post?.slug_fr ?? "",
  content_fr: post?.content_fr ?? "",
  excerpt_fr: post?.excerpt_fr ?? "",
  title_en: post?.title_en ?? "",
  slug_en: post?.slug_en ?? "",
  content_en: post?.content_en ?? "",
  excerpt_en: post?.excerpt_en ?? "",
  status: post?.status ?? "draft",
});

const isFieldFilled = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

const AdminBlog = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);

  const requiredFieldLabels = t.adminBlog.fieldLabels as Record<Exclude<keyof Post, "id">, string>;
  const editorLabels = t.adminBlog.editor;

  const normalizedEditingPost = useMemo(
    () => normalizePost(editingPost),
    [editingPost],
  );

  const missingFields = useMemo(
    () =>
      Object.entries(requiredFieldLabels).filter(([field]) => {
        const value = normalizedEditingPost[field as keyof EditablePost];
        return !isFieldFilled(value);
      }),
    [normalizedEditingPost, requiredFieldLabels],
  );

  const checkUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !AUTHORIZED_EMAILS.includes(session.user.email || "")) {
      navigate("/");
    }
  }, [navigate]);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("status", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      toast({ title: t.adminBlog.errorTitle, description: error.message, variant: "destructive" });
    } else {
      setPosts((data || []) as Post[]);
    }

    setIsLoading(false);
  }, [t, toast]);

  const openNewPostDialog = useCallback(() => {
    setEditingPost(createEmptyPost());
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingPost(null);

    if (searchParams.get("action") === "new") {
      navigate("/admin/blog", { replace: true });
    }
  }, [navigate, searchParams]);

  const updateEditingPost = (patch: EditablePost) => {
    setEditingPost((current) => ({
      ...normalizePost(current),
      ...patch,
    }));
  };

  const editPost = (post: Post) => {
    setEditingPost(normalizePost(post));
    setIsDialogOpen(true);
  };

  useEffect(() => {
    checkUser();
    fetchPosts();

    if (searchParams.get("action") === "new") {
      openNewPostDialog();
    }
  }, [checkUser, fetchPosts, openNewPostDialog, searchParams]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (missingFields.length > 0) {
      toast({
        title: t.adminBlog.missingFieldsTitle,
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
      const { error: insertError } = await supabase
        .from("blog_posts")
        .insert([postData]);
      error = insertError;
    }

    if (error) {
      toast({ title: t.adminBlog.errorTitle, description: error.message, variant: "destructive" });
    } else {
      toast({
        title: t.adminBlog.saveSuccessTitle,
        description: t.adminBlog.saveSuccessDescription,
      });
      closeDialog();
      fetchPosts();
    }

    setIsSubmitting(false);
  };

  const toggleStatus = async (post: Post) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (!error) {
      toast({ title: newStatus === "published" ? t.adminBlog.publishedTitle : t.adminBlog.hiddenTitle });
      fetchPosts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.adminBlog.deleteConfirm)) {
      return;
    }

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);

    if (!error) {
      toast({
        title: t.adminBlog.deleteSuccessTitle,
        description: t.adminBlog.deleteSuccessDescription,
      });
      fetchPosts();
    }
  };

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />
      <main className="pt-32 pb-20">
        <div className="section-container">
          <div className="mb-8 flex items-center gap-4">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              <LayoutDashboard size={14} />
              {t.adminBlog.breadcrumbDashboard}
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {t.adminBlog.breadcrumbCurrent}
            </span>
          </div>

          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{t.adminBlog.title}</h1>
              <p className="mt-1 text-muted-foreground">{t.adminBlog.subtitle}</p>
            </div>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  setIsDialogOpen(true);
                  return;
                }

                closeDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl px-6" onClick={openNewPostDialog}>
                  <Plus size={18} />
                  {t.adminBlog.newArticle}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle>
                    {editingPost?.id ? t.adminBlog.editArticle : t.adminBlog.createArticle}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-8 pt-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t.adminBlog.globalStatus}
                      </label>
                      <Select
                        value={normalizedEditingPost.status || "draft"}
                        onValueChange={(value) =>
                          updateEditingPost({ status: value as "draft" | "published" })
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{t.adminBlog.draft}</SelectItem>
                          <SelectItem value="published">{t.adminBlog.published}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t.adminBlog.coverImageUrl}
                      </label>
                      <Input
                        required
                        value={normalizedEditingPost.image_url || ""}
                        onChange={(event) => updateEditingPost({ image_url: event.target.value })}
                        placeholder={t.adminBlog.coverImagePlaceholder}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <Tabs defaultValue="fr" className="w-full">
                    <TabsList className="mb-8 grid h-12 w-full grid-cols-2 rounded-2xl bg-secondary/20 p-1">
                      <TabsTrigger
                        value="fr"
                        className="rounded-xl text-xs font-bold uppercase tracking-widest"
                      >
                        {t.adminBlog.frTab}
                      </TabsTrigger>
                      <TabsTrigger
                        value="en"
                        className="rounded-xl text-xs font-bold uppercase tracking-widest"
                      >
                        {t.adminBlog.enTab}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="fr" className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {t.adminBlog.titleFr}
                          </label>
                          <Input
                            required
                            value={normalizedEditingPost.title_fr || ""}
                            onChange={(event) => updateEditingPost({ title_fr: event.target.value })}
                            placeholder={t.adminBlog.titleFrPlaceholder}
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {t.adminBlog.slugFr}
                          </label>
                          <Input
                            required
                            value={normalizedEditingPost.slug_fr || ""}
                            onChange={(event) => updateEditingPost({ slug_fr: event.target.value })}
                            placeholder={t.adminBlog.slugFrPlaceholder}
                            className="h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t.adminBlog.excerptFr}
                        </label>
                        <Textarea
                          required
                          value={normalizedEditingPost.excerpt_fr || ""}
                          onChange={(event) => updateEditingPost({ excerpt_fr: event.target.value })}
                          placeholder={t.adminBlog.excerptFrPlaceholder}
                          rows={3}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t.adminBlog.contentFr}
                        </label>
                        <RichTextEditor
                          value={normalizedEditingPost.content_fr || ""}
                          onChange={(value) => updateEditingPost({ content_fr: value })}
                          labels={editorLabels}
                          helperText={t.adminBlog.contentFrHelper}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="en" className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {t.adminBlog.titleEn}
                          </label>
                          <Input
                            required
                            value={normalizedEditingPost.title_en || ""}
                            onChange={(event) => updateEditingPost({ title_en: event.target.value })}
                            placeholder={t.adminBlog.titleEnPlaceholder}
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {t.adminBlog.slugEn}
                          </label>
                          <Input
                            required
                            value={normalizedEditingPost.slug_en || ""}
                            onChange={(event) => updateEditingPost({ slug_en: event.target.value })}
                            placeholder={t.adminBlog.slugEnPlaceholder}
                            className="h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t.adminBlog.excerptEn}
                        </label>
                        <Textarea
                          required
                          value={normalizedEditingPost.excerpt_en || ""}
                          onChange={(event) => updateEditingPost({ excerpt_en: event.target.value })}
                          placeholder={t.adminBlog.excerptEnPlaceholder}
                          rows={3}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t.adminBlog.contentEn}
                        </label>
                        <RichTextEditor
                          value={normalizedEditingPost.content_en || ""}
                          onChange={(value) => updateEditingPost({ content_en: value })}
                          labels={editorLabels}
                          helperText={t.adminBlog.contentEnHelper}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">{t.adminBlog.requiredHint}</p>
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="ghost" onClick={closeDialog}>
                        {t.adminBlog.cancel}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || missingFields.length > 0}
                        className="rounded-xl px-8"
                      >
                        {isSubmitting ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Save className="mr-2" size={18} />}
                        {t.adminBlog.save}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/40 bg-white shadow-strong">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-[400px]">{t.adminBlog.articleColumn}</TableHead>
                  <TableHead>{t.adminBlog.statusColumn}</TableHead>
                  <TableHead className="text-right">{t.adminBlog.quickActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-20 text-center">
                      <Loader2 className="mx-auto animate-spin text-primary" size={32} />
                    </TableCell>
                  </TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-20 text-center italic text-muted-foreground">
                      {t.adminBlog.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id} className="group transition-colors hover:bg-secondary/5">
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border bg-secondary/40">
                            {post.image_url && <img src={post.image_url} className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-foreground">
                              {(language === "fr" ? post.title_fr : post.title_en) || t.adminBlog.untitled}
                            </p>
                            <p className="truncate text-[10px] italic text-muted-foreground opacity-60">
                              {(language === "fr" ? post.title_en : post.title_fr) || t.adminBlog.translationMissing}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                            post.status === "published"
                              ? "border-success/20 bg-success/5 text-success"
                              : "border-amber-200 bg-amber-50 text-amber-600",
                          )}
                        >
                          {post.status === "published" ? t.adminBlog.visible : t.adminBlog.hidden}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(post.status === "published" ? "text-amber-600" : "text-success")}
                            onClick={() => toggleStatus(post)}
                          >
                            {post.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => window.open(`/blog/${post.slug_fr}`, "_blank")}
                          >
                            <ExternalLink size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => editPost(post)}>
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminBlog;
