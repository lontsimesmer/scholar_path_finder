import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import {
  AdminStudentActivityLog,
  AdminStudentDetailText,
  AdminStudentInternalNote,
} from "@/lib/admin-student-detail";
import {
  createAdminStudentNote,
  fetchAdminStudentActivityLogs,
  fetchAdminStudentNotes,
  logAdminStudentActivity,
} from "@/lib/admin-student-detail-service";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminStudentDetail");

type UseAdminStudentDetailParams = {
  studentId: string | null;
  refreshKey?: number;
  text: AdminStudentDetailText;
};

export function useAdminStudentDetail({ studentId, refreshKey = 0, text }: UseAdminStudentDetailParams) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<AdminStudentInternalNote[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminStudentActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const loadTimeline = useCallback(async () => {
    if (!studentId) {
      setNotes([]);
      setActivityLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [loadedNotes, loadedActivityLogs] = await Promise.all([
        fetchAdminStudentNotes(studentId),
        fetchAdminStudentActivityLogs(studentId),
      ]);
      setNotes(loadedNotes);
      setActivityLogs(loadedActivityLogs);
      logger.info("Admin student detail timeline loaded", {
        studentId,
        noteCount: loadedNotes.length,
        activityCount: loadedActivityLogs.length,
      });
    } catch (error: unknown) {
      logger.error("Failed to load admin student detail timeline", {
        studentId,
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline, refreshKey]);

  const addNote = useCallback(async () => {
    if (!studentId) {
      return;
    }

    const trimmedNote = noteDraft.trim();
    if (!trimmedNote) {
      return;
    }

    setIsSavingNote(true);
    try {
      const createdNote = await createAdminStudentNote({
        studentId,
        note: trimmedNote,
      });
      await logAdminStudentActivity({
        studentId,
        actionType: "internal_note_added",
        details: {
          summary: trimmedNote,
          noteId: createdNote.id,
        },
      });
      setNoteDraft("");
      toast({ title: text.noteAdded });
      await loadTimeline();
    } catch (error: unknown) {
      logger.error("Failed to create admin student note", {
        studentId,
        message: getErrorMessage(error),
      });
      toast({
        title: text.notesTitle,
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  }, [loadTimeline, noteDraft, studentId, text.noteAdded, text.notesTitle, toast]);

  return {
    notes,
    activityLogs,
    isLoading,
    isSavingNote,
    noteDraft,
    setNoteDraft,
    addNote,
  };
}
