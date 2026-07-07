import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  type AdminLeadsText,
  type LeadAdminNote,
  createLeadAdminNote,
  fetchLeadAdminNotes,
} from "@/lib/admin-leads";

const logger = createLogger("AdminLeadNotesDialog");

interface AdminLeadNotesDialogProps {
  open: boolean;
  leadId: string | null;
  leadEmail: string | null;
  dateFormatter: Intl.DateTimeFormat;
  text: AdminLeadsText;
  onClose: () => void;
}

export const AdminLeadNotesDialog = ({
  open,
  leadId,
  leadEmail,
  dateFormatter,
  text,
  onClose,
}: AdminLeadNotesDialogProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<LeadAdminNote[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !leadId) {
      setNotes([]);
      setDraft("");
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchLeadAdminNotes(leadId)
      .then((result) => {
        if (!cancelled) setNotes(result);
      })
      .catch((error) => {
        logger.warn("Failed to load lead admin notes", {
          leadId,
          message: getErrorMessage(error),
        });
        toast({
          title: text.notesDialog.loadError,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, open, text.notesDialog.loadError, toast]);

  const handleSubmit = useCallback(async () => {
    if (!leadId) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      const note = await createLeadAdminNote({ leadId, note: trimmed });
      setNotes((current) => [note, ...current]);
      setDraft("");
      toast({ title: text.notesDialog.createSuccess });
    } catch (error) {
      logger.warn("Failed to create lead admin note", {
        leadId,
        message: getErrorMessage(error),
      });
      toast({
        title: text.notesDialog.createError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [draft, leadId, text.notesDialog.createError, text.notesDialog.createSuccess, toast]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{text.notesDialog.title}</DialogTitle>
          <DialogDescription>
            {leadEmail
              ? text.notesDialog.description.replace("{email}", leadEmail)
              : text.notesDialog.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={text.notesDialog.placeholder}
              className="min-h-[110px] rounded-xl bg-white"
              disabled={isSaving}
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSaving || !draft.trim()}
                className="rounded-xl"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                )}
                {isSaving ? text.notesDialog.saving : text.notesDialog.save}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            </div>
          ) : notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
              {text.notesDialog.empty}
            </p>
          ) : (
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-border/40 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {note.admin_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(note.created_at))}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap border-l-2 border-primary/20 pl-4 text-sm leading-6 text-foreground">
                    {note.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {text.notesDialog.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
