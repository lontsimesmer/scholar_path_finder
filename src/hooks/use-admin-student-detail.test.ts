import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminStudentDetail } from "@/hooks/use-admin-student-detail";
import type { AdminStudentDetailText } from "@/lib/admin-student-detail";

const mocks = vi.hoisted(() => ({
  createAdminStudentNote: vi.fn(),
  fetchAdminStudentActivityLogs: vi.fn(),
  fetchAdminStudentNotes: vi.fn(),
  logAdminStudentActivity: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/lib/admin-student-detail-service", () => ({
  createAdminStudentNote: mocks.createAdminStudentNote,
  fetchAdminStudentActivityLogs: mocks.fetchAdminStudentActivityLogs,
  fetchAdminStudentNotes: mocks.fetchAdminStudentNotes,
  logAdminStudentActivity: mocks.logAdminStudentActivity,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const text = {
  applicationStatusChangedSummary: "Statut change de {from} vers {to}",
  historyActions: {},
  historyDescription: "Historique",
  historyTitle: "Historique",
  noHistory: "Aucun historique",
  noNotes: "Aucune note",
  noteAdded: "Note ajoutee",
  notePlaceholder: "Note",
  notesDescription: "Notes",
  notesTitle: "Notes internes",
  unknownStatus: "Inconnu",
} as AdminStudentDetailText;

describe("useAdminStudentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAdminStudentNotes.mockResolvedValue([{ id: "note-1", note: "Verifier" }]);
    mocks.fetchAdminStudentActivityLogs.mockResolvedValue([{ id: "log-1", action_type: "document_updated" }]);
    mocks.createAdminStudentNote.mockResolvedValue({ id: "note-2" });
    mocks.logAdminStudentActivity.mockResolvedValue(undefined);
  });

  it("clears timeline state when no student is selected", async () => {
    const { result } = renderHook(() => useAdminStudentDetail({ studentId: null, text }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.notes).toEqual([]);
    expect(result.current.activityLogs).toEqual([]);
    expect(mocks.fetchAdminStudentNotes).not.toHaveBeenCalled();
  });

  it("loads notes and activity logs for the selected student", async () => {
    const { result } = renderHook(() => useAdminStudentDetail({ studentId: "student-1", text }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mocks.fetchAdminStudentNotes).toHaveBeenCalledWith("student-1");
    expect(mocks.fetchAdminStudentActivityLogs).toHaveBeenCalledWith("student-1");
    expect(result.current.notes).toEqual([{ id: "note-1", note: "Verifier" }]);
    expect(result.current.activityLogs).toEqual([{ id: "log-1", action_type: "document_updated" }]);
  });

  it("creates a note, logs the activity, resets the draft, and reloads", async () => {
    const { result } = renderHook(() => useAdminStudentDetail({ studentId: "student-1", text }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setNoteDraft("  Nouvelle note  ");
    });
    await act(async () => {
      await result.current.addNote();
    });

    expect(mocks.createAdminStudentNote).toHaveBeenCalledWith({
      note: "Nouvelle note",
      studentId: "student-1",
    });
    expect(mocks.logAdminStudentActivity).toHaveBeenCalledWith({
      actionType: "internal_note_added",
      details: {
        noteId: "note-2",
        summary: "Nouvelle note",
      },
      studentId: "student-1",
    });
    expect(result.current.noteDraft).toBe("");
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Note ajoutee" });
  });
});
