import { FormEvent } from "react";
import { Loader2, Save } from "lucide-react";

import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminBlogText, EditableBlogPost } from "@/lib/admin-blog";

interface AdminBlogEditorDialogProps {
  editorLabels: Record<string, string>;
  isOpen: boolean;
  isSubmitting: boolean;
  missingFieldsCount: number;
  onOpenChange: (open: boolean) => void;
  onSave: (event: FormEvent) => Promise<void>;
  onUpdatePost: (patch: EditableBlogPost) => void;
  post: EditableBlogPost;
  text: AdminBlogText;
}

export const AdminBlogEditorDialog = ({
  editorLabels,
  isOpen,
  isSubmitting,
  missingFieldsCount,
  onOpenChange,
  onSave,
  onUpdatePost,
  post,
  text,
}: AdminBlogEditorDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl">
      <DialogHeader>
        <DialogTitle>{post.id ? text.editArticle : text.createArticle}</DialogTitle>
      </DialogHeader>

      <form onSubmit={(event) => void onSave(event)} className="space-y-8 pt-4">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.globalStatus}
            </label>
            <Select
              value={post.status || "draft"}
              onValueChange={(value) => onUpdatePost({ status: value as "draft" | "published" })}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{text.draft}</SelectItem>
                <SelectItem value="published">{text.published}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.coverImageUrl}
            </label>
            <Input
              required
              value={post.image_url || ""}
              onChange={(event) => onUpdatePost({ image_url: event.target.value })}
              placeholder={text.coverImagePlaceholder}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <Tabs defaultValue="fr" className="w-full">
          <TabsList className="mb-8 grid h-12 w-full grid-cols-2 rounded-2xl bg-secondary/20 p-1">
            <TabsTrigger value="fr" className="rounded-xl text-xs font-bold uppercase tracking-widest">
              {text.frTab}
            </TabsTrigger>
            <TabsTrigger value="en" className="rounded-xl text-xs font-bold uppercase tracking-widest">
              {text.enTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fr" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {text.titleFr}
                </label>
                <Input
                  required
                  value={post.title_fr || ""}
                  onChange={(event) => onUpdatePost({ title_fr: event.target.value })}
                  placeholder={text.titleFrPlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {text.slugFr}
                </label>
                <Input
                  required
                  value={post.slug_fr || ""}
                  onChange={(event) => onUpdatePost({ slug_fr: event.target.value })}
                  placeholder={text.slugFrPlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {text.excerptFr}
              </label>
              <Textarea
                required
                value={post.excerpt_fr || ""}
                onChange={(event) => onUpdatePost({ excerpt_fr: event.target.value })}
                placeholder={text.excerptFrPlaceholder}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {text.contentFr}
              </label>
              <RichTextEditor
                value={post.content_fr || ""}
                onChange={(value) => onUpdatePost({ content_fr: value })}
                labels={editorLabels}
                helperText={text.contentFrHelper}
              />
            </div>
          </TabsContent>

          <TabsContent value="en" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {text.titleEn}
                </label>
                <Input
                  required
                  value={post.title_en || ""}
                  onChange={(event) => onUpdatePost({ title_en: event.target.value })}
                  placeholder={text.titleEnPlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {text.slugEn}
                </label>
                <Input
                  required
                  value={post.slug_en || ""}
                  onChange={(event) => onUpdatePost({ slug_en: event.target.value })}
                  placeholder={text.slugEnPlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {text.excerptEn}
              </label>
              <Textarea
                required
                value={post.excerpt_en || ""}
                onChange={(event) => onUpdatePost({ excerpt_en: event.target.value })}
                placeholder={text.excerptEnPlaceholder}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {text.contentEn}
              </label>
              <RichTextEditor
                value={post.content_en || ""}
                onChange={(value) => onUpdatePost({ content_en: value })}
                labels={editorLabels}
                helperText={text.contentEnHelper}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">{text.requiredHint}</p>
          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting || missingFieldsCount > 0} className="rounded-xl px-8">
              {isSubmitting ? (
                <Loader2 className="mr-2 animate-spin" size={18} />
              ) : (
                <Save className="mr-2" size={18} />
              )}
              {text.save}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);
