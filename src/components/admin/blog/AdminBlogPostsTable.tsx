import { ExternalLink, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminBlogText, BlogPostRecord } from "@/lib/admin-blog";
import { cn } from "@/lib/utils";

interface AdminBlogPostsTableProps {
  currentLanguage: string;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: (post: BlogPostRecord) => void;
  onOpenPreview: (slug: string) => void;
  onToggleStatus: (post: BlogPostRecord) => Promise<void>;
  posts: BlogPostRecord[];
  text: AdminBlogText;
}

export const AdminBlogPostsTable = ({
  currentLanguage,
  isLoading,
  onDelete,
  onEdit,
  onOpenPreview,
  onToggleStatus,
  posts,
  text,
}: AdminBlogPostsTableProps) => (
  <div className="admin-table overflow-hidden rounded-2xl border border-border/40 bg-white shadow-soft">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[400px]">{text.articleColumn}</TableHead>
          <TableHead>{text.statusColumn}</TableHead>
          <TableHead className="text-right">{text.quickActions}</TableHead>
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
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          posts.map((post) => (
            <TableRow key={post.id} className="group transition-colors hover:bg-secondary/5">
              <TableCell>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border bg-secondary/40">
                    {post.image_url ? (
                      <img src={post.image_url} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">
                      {(currentLanguage === "fr" ? post.title_fr : post.title_en) || text.untitled}
                    </p>
                    <p className="truncate text-[10px] italic text-muted-foreground opacity-60">
                      {(currentLanguage === "fr" ? post.title_en : post.title_fr) || text.translationMissing}
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
                      : "border-warning/30 bg-warning/10 text-warning",
                  )}
                >
                  {post.status === "published" ? text.visible : text.hidden}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(post.status === "published" ? "text-warning" : "text-success")}
                    onClick={() => void onToggleStatus(post)}
                  >
                    {post.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() => onOpenPreview(post.slug_fr)}
                  >
                    <ExternalLink size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(post)}>
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => void onDelete(post.id)}
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
);
