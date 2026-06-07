import { Loader2, MessageSquarePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AdminStudentDetailText, AdminStudentInternalNote } from "@/lib/admin-student-detail";

interface AdminStudentNotesCardProps {
  dateFormatter: Intl.DateTimeFormat;
  isLoading: boolean;
  isSavingNote: boolean;
  noteDraft: string;
  notes: AdminStudentInternalNote[];
  onAddNote: () => Promise<void>;
  onNoteDraftChange: (value: string) => void;
  text: AdminStudentDetailText;
}

export const AdminStudentNotesCard = ({
  dateFormatter,
  isLoading,
  isSavingNote,
  noteDraft,
  notes,
  onAddNote,
  onNoteDraftChange,
  text,
}: AdminStudentNotesCardProps) => (
  <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <CardTitle>{text.notesTitle}</CardTitle>
        <CardDescription>{text.notesDescription}</CardDescription>
      </div>
      <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
        {notes.length}
      </Badge>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/40 bg-secondary/10 p-4">
        <div className="space-y-3">
          <Textarea
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            placeholder={text.notePlaceholder}
            className="min-h-[120px] rounded-xl bg-white"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => void onAddNote()}
              disabled={isSavingNote || !noteDraft.trim()}
              className="rounded-xl"
            >
              {isSavingNote ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="mr-2 h-4 w-4" />
              )}
              {text.addNote}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
          {text.noNotes}
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-[1.5rem] border border-border/40 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{note.admin_email}</p>
                <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(note.created_at))}</p>
              </div>
              <div className="mt-4 border-l-2 border-primary/20 pl-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{note.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
