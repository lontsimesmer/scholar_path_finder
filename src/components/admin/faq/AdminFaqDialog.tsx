import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminFaqInput, AdminFaqText } from "@/lib/admin-faq";
import type { FaqEntry } from "@/lib/faq";

interface AdminFaqDialogProps {
  open: boolean;
  entry: FaqEntry | null;
  text: AdminFaqText;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: AdminFaqInput) => Promise<void> | void;
}

const emptyInput: AdminFaqInput = {
  question_fr: "",
  answer_fr: "",
  question_en: "",
  answer_en: "",
  category: null,
  position: 10,
  is_published: true,
};

export const AdminFaqDialog = ({
  open,
  entry,
  text,
  isSaving,
  onClose,
  onSave,
}: AdminFaqDialogProps) => {
  const [input, setInput] = useState<AdminFaqInput>(emptyInput);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setInput({
        question_fr: entry.question_fr,
        answer_fr: entry.answer_fr,
        question_en: entry.question_en,
        answer_en: entry.answer_en,
        category: entry.category,
        position: entry.position,
        is_published: entry.is_published,
      });
    } else {
      setInput(emptyInput);
    }
  }, [open, entry]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({
      ...input,
      question_fr: input.question_fr.trim(),
      answer_fr: input.answer_fr.trim(),
      question_en: input.question_en.trim(),
      answer_en: input.answer_en.trim(),
      category: input.category ? input.category.trim() || null : null,
    });
  };

  const isValid =
    input.question_fr.trim().length > 0 &&
    input.answer_fr.trim().length > 0 &&
    input.question_en.trim().length > 0 &&
    input.answer_en.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? text.dialog.editTitle : text.dialog.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faq-question-fr">
              {text.dialog.questionFrLabel}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="faq-question-fr"
              value={input.question_fr}
              onChange={(event) => setInput((prev) => ({ ...prev, question_fr: event.target.value }))}
              disabled={isSaving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-answer-fr">
              {text.dialog.answerFrLabel}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Textarea
              id="faq-answer-fr"
              rows={4}
              value={input.answer_fr}
              onChange={(event) => setInput((prev) => ({ ...prev, answer_fr: event.target.value }))}
              disabled={isSaving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-question-en">
              {text.dialog.questionEnLabel}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="faq-question-en"
              value={input.question_en}
              onChange={(event) => setInput((prev) => ({ ...prev, question_en: event.target.value }))}
              disabled={isSaving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-answer-en">
              {text.dialog.answerEnLabel}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Textarea
              id="faq-answer-en"
              rows={4}
              value={input.answer_en}
              onChange={(event) => setInput((prev) => ({ ...prev, answer_en: event.target.value }))}
              disabled={isSaving}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faq-category">{text.dialog.categoryLabel}</Label>
              <Input
                id="faq-category"
                value={input.category ?? ""}
                onChange={(event) =>
                  setInput((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder={text.dialog.categoryPlaceholder}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-position">{text.dialog.positionLabel}</Label>
              <Input
                id="faq-position"
                type="number"
                min={0}
                step={10}
                value={input.position}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  setInput((prev) => ({
                    ...prev,
                    position: Number.isFinite(parsed) ? parsed : 0,
                  }));
                }}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/30 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{text.dialog.isPublishedLabel}</p>
              <p className="text-xs text-muted-foreground">
                {input.is_published ? text.statuses.published : text.statuses.unpublished}
              </p>
            </div>
            <Switch
              checked={input.is_published}
              onCheckedChange={(value) =>
                setInput((prev) => ({ ...prev, is_published: value }))
              }
              disabled={isSaving}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              {text.dialog.cancel}
            </Button>
            <Button type="submit" disabled={!isValid || isSaving}>
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {text.dialog.saving}
                </span>
              ) : (
                text.dialog.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
