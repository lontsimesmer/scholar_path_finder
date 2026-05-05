import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminCRM } from "@/hooks/use-admin-crm";
import type { AdminCRMText, AdminCRMStudent } from "@/lib/admin-crm";

const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
  functionsInvoke: vi.fn(),
  logAdminStudentActivity: vi.fn(),
  open: vi.fn(),
  readSupabaseFunctionError: vi.fn(),
  storageFrom: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    functions: {
      invoke: mocks.functionsInvoke,
    },
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

vi.mock("@/lib/admin-student-detail-service", () => ({
  logAdminStudentActivity: mocks.logAdminStudentActivity,
}));

vi.mock("@/lib/supabase-function-errors", () => ({
  readSupabaseFunctionError: mocks.readSupabaseFunctionError,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const text = {
  correctionCommentRequiredDescription: "Commentaire requis",
  correctionCommentRequiredTitle: "Correction requise",
  correctionRequestedSuccess: "Correction demandee",
  documentRequestCreated: "Demande creee",
  documentRequestRequiredDescription: "Titre requis",
  documentRequestRequiredTitle: "Document requis",
  documentUpdated: "Document mis a jour",
  statusUpdated: "Statut mis a jour",
  studentUpdated: "Etudiant mis a jour",
  updateFailed: "Echec",
} as Pick<
  AdminCRMText,
  | "correctionCommentRequiredDescription"
  | "correctionCommentRequiredTitle"
  | "correctionRequestedSuccess"
  | "documentRequestCreated"
  | "documentRequestRequiredDescription"
  | "documentRequestRequiredTitle"
  | "documentUpdated"
  | "statusUpdated"
  | "studentUpdated"
  | "updateFailed"
>;

const student: AdminCRMStudent = {
  application: {
    id: "app-1",
    notes: "",
    status: "consultation_paid",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  documentSummary: {
    approved: 0,
    pending: 1,
    rejected: 0,
    total: 1,
  },
  email: "student@example.com",
  id: "student-1",
  lead: null,
  paymentSummary: {
    accepted: 0,
    failed: 0,
    latestTransaction: null,
    pending: 0,
    total: 0,
  },
  profile: {
    birth_date: "2000-01-01",
    current_degree: "Licence",
    email: "student@example.com",
    first_name: "Amina",
    id: "student-1",
    last_name: "Talla",
    profile_invalidated_at: null,
    profile_locked_at: "2026-01-01T00:00:00.000Z",
    profile_validation_comment: null,
    target_country: "France",
    target_program: "Master",
  },
};

const renderCRM = () =>
  renderHook(() =>
    useAdminCRM({
      noEmail: "Sans email",
      text,
      toast: mocks.toast,
    }),
  );

const setupFetchStudentsMocks = () => {
  mocks.from.mockImplementation((table: string) => {
    if (table === "student_applications") {
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ id: "app-1", notes: "", status: "consultation_paid", student_id: "student-1", updated_at: "2026-01-01T00:00:00.000Z" }],
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }

    if (table === "student_profiles") {
      return {
        select: vi.fn().mockResolvedValue({
          data: [student.profile],
          error: null,
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    }

    if (table === "student_documents") {
      return {
        select: vi.fn((columns?: string) => {
          if (columns === "*") {
            return {
              eq: vi.fn().mockResolvedValue({
                data: [{ admin_feedback: "", file_path: "student-1/passport.pdf", id: "doc-1", status: "pending", student_id: "student-1", title: "Passeport" }],
                error: null,
              }),
            };
          }

          return Promise.resolve({
            data: [{ admin_feedback: "", file_path: "student-1/passport.pdf", id: "doc-1", status: "pending", student_id: "student-1", title: "Passeport" }],
            error: null,
          });
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }

    if (table === "student_document_requests") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [{ created_at: "2026-01-01T00:00:00.000Z", fulfilled_at: null, fulfilled_document_id: null, id: "request-1", status: "pending", student_id: "student-1", title: "Releve", updated_at: "2026-01-01T00:00:00.000Z" }],
              error: null,
            }),
          })),
        })),
      };
    }

    if (table === "leads") {
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ created_at: "2026-01-01T00:00:00.000Z", email: "student@example.com", id: "lead-1", name: "Amina Talla", payment_status: "paid", status: "completed", updated_at: "2026-01-02T00:00:00.000Z" }],
          error: null,
        }),
      };
    }

    if (table === "payment_transactions") {
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ amount: 15625, channel: "MOBILE_MONEY", created_at: "2026-01-01T00:00:00.000Z", currency: "XAF", id: "payment-1", local_status: "accepted", student_id: "student-1", transaction_id: "TX-1" }],
          error: null,
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });
};

describe("useAdminCRM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchStudentsMocks();
    mocks.functionsInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    mocks.logAdminStudentActivity.mockResolvedValue(undefined);
    mocks.readSupabaseFunctionError.mockResolvedValue({ message: "Edge function failed" });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/doc.pdf" } });
    mocks.storageFrom.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
    vi.stubGlobal("open", mocks.open);
  });

  it("loads and maps CRM students from applications, profiles, leads, documents, and payments", async () => {
    const { result } = renderCRM();

    await act(async () => {
      await result.current.fetchStudents();
    });

    expect(result.current.students).toHaveLength(1);
    expect(result.current.students[0]).toMatchObject({
      email: "student@example.com",
      id: "student-1",
      documentSummary: { pending: 1, total: 1 },
      paymentSummary: { accepted: 1, total: 1 },
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("updates application status and logs the status transition", async () => {
    const { result } = renderCRM();

    await act(async () => {
      await result.current.fetchStudents();
    });
    await act(async () => {
      await result.current.updateStatus("app-1", "profile_evaluation");
    });

    expect(mocks.toast).toHaveBeenCalledWith({ title: "Statut mis a jour" });
    expect(mocks.logAdminStudentActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "application_status_updated",
        applicationId: "app-1",
        details: {
          newStatus: "profile_evaluation",
          previousStatus: "consultation_paid",
        },
        studentId: "student-1",
      }),
    );
  });

  it("creates targeted document requests for the selected student", async () => {
    const { result } = renderCRM();

    act(() => {
      result.current.setSelectedStudent(student);
    });
    await act(async () => {
      await result.current.createDocumentRequest(" Passeport ", " Copie lisible ");
    });

    expect(mocks.functionsInvoke).toHaveBeenCalledWith("create-document-request", {
      body: {
        applicationId: "app-1",
        description: "Copie lisible",
        locale: "fr",
        studentId: "student-1",
        title: "Passeport",
      },
    });
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Demande creee" });
    expect(result.current.studentDocs).toHaveLength(1);
    expect(result.current.studentDocumentRequests).toHaveLength(1);
  });

  it("opens signed document URLs from storage", async () => {
    const { result } = renderCRM();

    await act(async () => {
      await result.current.getFileUrl("student-1/passport.pdf");
    });

    expect(mocks.storageFrom).toHaveBeenCalledWith("student-documents");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("student-1/passport.pdf", 60);
    expect(mocks.open).toHaveBeenCalledWith("https://signed.example/doc.pdf", "_blank");
  });
});
