import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminCRMDocumentsManager } from "@/components/admin/crm/AdminCRMDocumentsManager";
import type { AdminCRMText, StudentDocument, StudentDocumentRequest } from "@/lib/admin-crm";

const text = {
  approve: "Approuver",
  documentRequestCreate: "Demander",
  documentRequestCreating: "Demande en cours",
  documentRequestDescription: "La demande apparaitra dans le dashboard etudiant.",
  documentRequestDetailsLabel: "Consignes",
  documentRequestDetailsPlaceholder: "Details",
  documentRequestNameLabel: "Document demande",
  documentRequestNamePlaceholder: "Ex: passeport",
  documentRequestStatuses: {
    cancelled: "Annule",
    fulfilled: "Depose",
    pending: "En attente",
  },
  documentRequestsEmpty: "Aucune demande",
  documentRequestTitle: "Demandes de documents",
  documentStates: {
    all: "Tous",
    approved: "Approuve",
    none: "Aucun",
    pending: "En attente",
    rejected: "Refuse",
  },
  feedbackPlaceholder: "Retour admin",
  noDocuments: "Aucun document",
  reject: "Refuser",
  sheet: {
    documentsApproved: "Approuves",
    documentsPending: "En attente",
    documentsRejected: "Refuses",
  },
  viewFile: "Voir le fichier",
} as AdminCRMText;

const pendingDocument: StudentDocument = {
  id: "doc-1",
  title: "Passeport",
  file_path: "student-1/passport.pdf",
  status: "pending",
  student_id: "student-1",
  admin_feedback: "",
};

const documentRequest: StudentDocumentRequest = {
  id: "request-1",
  student_id: "student-1",
  application_id: "app-1",
  title: "Releve de notes",
  description: "Document recent",
  status: "pending",
  requested_by: "admin@example.com",
  fulfilled_document_id: null,
  fulfilled_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const renderManager = ({
  documents = [],
  documentRequests = [],
  onCreateDocumentRequest = vi.fn(async () => undefined),
  onUpdateDoc = vi.fn(async () => undefined),
}: {
  documents?: StudentDocument[];
  documentRequests?: StudentDocumentRequest[];
  onCreateDocumentRequest?: (title: string, description: string) => Promise<void>;
  onUpdateDoc?: (docId: string, updates: Partial<StudentDocument>) => Promise<void>;
} = {}) => {
  render(
    <AdminCRMDocumentsManager
      documents={documents}
      documentRequests={documentRequests}
      isLoading={false}
      isRequestingDocument={false}
      onCreateDocumentRequest={onCreateDocumentRequest}
      onGetFileUrl={vi.fn()}
      onSetDocuments={vi.fn()}
      onUpdateDoc={onUpdateDoc}
      text={text}
    />,
  );
};

describe("AdminCRMDocumentsManager", () => {
  it("creates a targeted document request from the admin form", async () => {
    const onCreateDocumentRequest = vi.fn(async () => undefined);
    renderManager({ onCreateDocumentRequest });

    expect(screen.getByRole("button", { name: /demander/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Ex: passeport"), {
      target: { value: "Passeport" },
    });
    fireEvent.change(screen.getByPlaceholderText("Details"), {
      target: { value: "Copie lisible" },
    });
    fireEvent.click(screen.getByRole("button", { name: /demander/i }));

    await waitFor(() => {
      expect(onCreateDocumentRequest).toHaveBeenCalledWith("Passeport", "Copie lisible");
    });
  });

  it("shows existing requests and lets the admin approve or reject documents", () => {
    const onUpdateDoc = vi.fn(async () => undefined);
    renderManager({
      documents: [pendingDocument],
      documentRequests: [documentRequest],
      onUpdateDoc,
    });

    expect(screen.getByText("Releve de notes")).toBeInTheDocument();
    expect(screen.getByText("Document recent")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /approuver/i }));
    expect(onUpdateDoc).toHaveBeenCalledWith("doc-1", { status: "approved" });

    fireEvent.click(screen.getByRole("button", { name: /refuser/i }));
    expect(onUpdateDoc).toHaveBeenCalledWith("doc-1", { status: "rejected" });
  });
});
