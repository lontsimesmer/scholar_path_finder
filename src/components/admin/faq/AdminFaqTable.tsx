import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminFaqText } from "@/lib/admin-faq";
import type { FaqEntry } from "@/lib/faq";
import { cn } from "@/lib/utils";

interface AdminFaqTableProps {
  entries: FaqEntry[];
  isLoading: boolean;
  dateFormatter: Intl.DateTimeFormat;
  language: "fr" | "en";
  text: AdminFaqText;
  onEdit: (entry: FaqEntry) => void;
  onDelete: (entry: FaqEntry) => void;
  onTogglePublish: (entry: FaqEntry) => void;
  onMoveUp: (entry: FaqEntry) => void;
  onMoveDown: (entry: FaqEntry) => void;
}

export const AdminFaqTable = ({
  entries,
  isLoading,
  dateFormatter,
  language,
  text,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
}: AdminFaqTableProps) => (
  <div className="overflow-hidden rounded-[1.5rem] border border-border/40">
    <Table>
      <TableHeader className="bg-secondary/30">
        <TableRow>
          <TableHead className="w-20">{text.columns.position}</TableHead>
          <TableHead>{text.columns.question}</TableHead>
          <TableHead className="w-32">{text.columns.status}</TableHead>
          <TableHead className="w-44">{text.columns.updatedAt}</TableHead>
          <TableHead className="w-56 text-right">{text.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          entries.map((entry, index) => {
            const isFirst = index === 0;
            const isLast = index === entries.length - 1;
            return (
              <TableRow key={entry.id} className="align-top">
                <TableCell className="font-mono text-sm text-muted-foreground">{entry.position}</TableCell>
                <TableCell className="max-w-xl">
                  <p className="font-medium text-foreground">
                    {language === "fr" ? entry.question_fr : entry.question_en}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {language === "fr" ? entry.answer_fr : entry.answer_en}
                  </p>
                  {entry.category ? (
                    <p className="mt-1 inline-flex rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {entry.category}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      entry.is_published
                        ? "border-success/20 bg-success/5 text-success"
                        : "border-border/50 bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {entry.is_published ? text.statuses.published : text.statuses.unpublished}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(entry.updated_at))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onMoveUp(entry)}
                      disabled={isFirst}
                      title={text.actions.moveUp}
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onMoveDown(entry)}
                      disabled={isLast}
                      title={text.actions.moveDown}
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onTogglePublish(entry)}
                      title={text.actions.togglePublish}
                    >
                      {entry.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(entry)}
                      title={text.actions.edit}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(entry)}
                      title={text.actions.delete}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  </div>
);
