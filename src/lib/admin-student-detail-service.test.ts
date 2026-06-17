import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAdminStudentNote,
  fetchAdminStudentActivityLogs,
  fetchAdminStudentNotes,
  logAdminStudentActivity,
} from "@/lib/admin-student-detail-service";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getSession: vi.fn(),
  insert: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    from: mocks.from,
  },
}));

const createSelectChain = (response: unknown) => {
  mocks.order.mockResolvedValue(response);
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  return { select: mocks.select };
};

describe("admin student detail service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: "admin@example.com",
          },
        },
      },
    });
  });

  it("fetches notes and activity logs ordered by newest first", async () => {
    const notes = [{ id: "note-1", note: "Important" }];
    mocks.from.mockReturnValueOnce(createSelectChain({ data: notes, error: null }));

    await expect(fetchAdminStudentNotes("student-1")).resolves.toEqual(notes);
    expect(mocks.from).toHaveBeenCalledWith("student_admin_notes");
    expect(mocks.eq).toHaveBeenCalledWith("student_id", "student-1");
    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });

    const logs = [{ id: "log-1", action_type: "document_updated" }];
    mocks.from.mockReturnValueOnce(createSelectChain({ data: logs, error: null }));

    await expect(fetchAdminStudentActivityLogs("student-1")).resolves.toEqual(logs);
    expect(mocks.from).toHaveBeenCalledWith("student_admin_activity_logs");
  });

  it("throws fetch errors instead of swallowing them", async () => {
    const error = new Error("query failed");
    mocks.from.mockReturnValueOnce(createSelectChain({ data: null, error }));

    await expect(fetchAdminStudentNotes("student-1")).rejects.toThrow(error);
  });

  it("creates notes with the current admin email", async () => {
    const createdNote = {
      id: "note-1",
      admin_email: "admin@example.com",
      note: "Verifier le passeport",
      student_id: "student-1",
    };
    mocks.single.mockResolvedValue({ data: createdNote, error: null });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.from.mockReturnValue({ insert: mocks.insert });

    await expect(
      createAdminStudentNote({
        note: "Verifier le passeport",
        studentId: "student-1",
      }),
    ).resolves.toEqual(createdNote);

    expect(mocks.insert).toHaveBeenCalledWith({
      admin_email: "admin@example.com",
      note: "Verifier le passeport",
      student_id: "student-1",
    });
  });

  it("logs activities with optional application and document context", async () => {
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });

    await logAdminStudentActivity({
      actionLabel: "Document rejete",
      actionType: "document_updated",
      applicationId: "app-1",
      details: { nextStatus: "rejected" },
      documentId: "doc-1",
      studentId: "student-1",
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      action_label: "Document rejete",
      action_type: "document_updated",
      admin_email: "admin@example.com",
      application_id: "app-1",
      details: { nextStatus: "rejected" },
      document_id: "doc-1",
      student_id: "student-1",
    });
  });

  it("requires an authenticated admin email before writing", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: { user: {} } } });

    await expect(
      createAdminStudentNote({
        note: "Note",
        studentId: "student-1",
      }),
    ).rejects.toThrow("Admin session email is required.");
  });
});
