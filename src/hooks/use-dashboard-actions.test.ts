import { act, renderHook } from "@testing-library/react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import type { DashboardText } from "@/lib/dashboard";

const mocks = vi.hoisted(() => ({
  documentInsert: vi.fn(),
  documentRequestUpdate: vi.fn(),
  documentUpdate: vi.fn(),
  from: vi.fn(),
  remove: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  lastDocumentRequestChain: null as { eq: ReturnType<typeof vi.fn> } | null,
  lastDocumentUpdateChain: null as { eq: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const dashboardText = {
  uploadError: "Upload failed",
  uploadSuccess: "Document uploaded",
} as DashboardText;

const user = {
  id: "student-1",
  email: "student@example.com",
} as unknown as SupabaseUser;

const createSingleResultChain = (response: unknown) => {
  const chain = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => ({
      single: vi.fn(async () => response),
    })),
  };

  return chain;
};

const createAwaitableUpdateChain = (response: unknown) => {
  const chain = {
    eq: vi.fn(() => chain),
    then: vi.fn((resolve, reject) => Promise.resolve(response).then(resolve, reject)),
  };

  return chain;
};

const renderDashboardActions = ({
  docTitle = "Passport",
  selectedDocumentRequestId = null,
  selectedReplacementDocumentId = null,
  selectedReplacementDocumentPath = null,
}: {
  docTitle?: string;
  selectedDocumentRequestId?: string | null;
  selectedReplacementDocumentId?: string | null;
  selectedReplacementDocumentPath?: string | null;
}) => {
  const fetchData = vi.fn(async () => undefined);
  const setDocTitle = vi.fn();
  const setIsUploadOpen = vi.fn();
  const toast = vi.fn();

  const hook = renderHook(() =>
    useDashboardActions({
      buildLockedProfilePayload: vi.fn(),
      completionRedirectTarget: null,
      dashboardText,
      docTitle,
      fetchData,
      navigate: vi.fn(),
      profileIsLocked: false,
      selectedDocumentRequestId,
      selectedReplacementDocumentId,
      selectedReplacementDocumentPath,
      setDocTitle,
      setIsConfirmDialogOpen: vi.fn(),
      setIsUploadOpen,
      toast,
      user,
    }),
  );

  return {
    ...hook,
    fetchData,
    setDocTitle,
    setIsUploadOpen,
    toast,
  };
};

describe("useDashboardActions document upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lastDocumentRequestChain = null;
    mocks.lastDocumentUpdateChain = null;

    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.storageFrom.mockReturnValue({
      remove: mocks.remove,
      upload: mocks.upload,
    });

    mocks.documentInsert.mockImplementation(() => createSingleResultChain({ data: { id: "new-doc" }, error: null }));
    mocks.documentUpdate.mockImplementation(() => {
      const chain = createSingleResultChain({ data: { id: "existing-doc" }, error: null });
      mocks.lastDocumentUpdateChain = chain;
      return chain;
    });
    mocks.documentRequestUpdate.mockImplementation(() => {
      const chain = createAwaitableUpdateChain({ error: null });
      mocks.lastDocumentRequestChain = chain;
      return chain;
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === "student_documents") {
        return {
          insert: mocks.documentInsert,
          update: mocks.documentUpdate,
        };
      }

      if (table === "student_document_requests") {
        return {
          update: mocks.documentRequestUpdate,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });
  });

  it("replaces a rejected document in place instead of creating a duplicate", async () => {
    const { fetchData, result, setDocTitle, setIsUploadOpen, toast } = renderDashboardActions({
      docTitle: " Passport ",
      selectedReplacementDocumentId: "existing-doc",
      selectedReplacementDocumentPath: "student-1/old-passport.pdf",
    });
    const file = new File(["content"], "passport.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.actions.handleFileUpload(file);
    });

    const uploadedPath = mocks.upload.mock.calls[0][0] as string;
    expect(uploadedPath).toMatch(/^student-1\/.+\.pdf$/);
    expect(mocks.documentInsert).not.toHaveBeenCalled();
    expect(mocks.documentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_feedback: null,
        file_path: uploadedPath,
        file_type: "application/pdf",
        status: "pending",
        title: "Passport",
      }),
    );
    expect(mocks.lastDocumentUpdateChain?.eq).toHaveBeenCalledWith("id", "existing-doc");
    expect(mocks.lastDocumentUpdateChain?.eq).toHaveBeenCalledWith("student_id", "student-1");
    expect(mocks.lastDocumentUpdateChain?.eq).toHaveBeenCalledWith("status", "rejected");
    expect(mocks.remove).toHaveBeenCalledWith(["student-1/old-passport.pdf"]);
    expect(fetchData).toHaveBeenCalledWith(user);
    expect(setDocTitle).toHaveBeenCalledWith("");
    expect(setIsUploadOpen).toHaveBeenCalledWith(false);
    expect(toast).toHaveBeenCalledWith({ title: "Document uploaded" });
  });

  it("marks a targeted document request as fulfilled after upload", async () => {
    const { result } = renderDashboardActions({
      selectedDocumentRequestId: "request-1",
    });
    const file = new File(["content"], "transcript.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.actions.handleFileUpload(file);
    });

    expect(mocks.documentInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        file_type: "application/pdf",
        status: "pending",
        student_id: "student-1",
        title: "Passport",
      }),
    ]);
    expect(mocks.documentRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fulfilled_document_id: "new-doc",
        status: "fulfilled",
      }),
    );
    expect(mocks.lastDocumentRequestChain?.eq).toHaveBeenCalledWith("id", "request-1");
    expect(mocks.lastDocumentRequestChain?.eq).toHaveBeenCalledWith("student_id", "student-1");
  });
});
