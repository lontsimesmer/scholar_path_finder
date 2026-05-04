import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardDocumentsCard } from "@/components/dashboard/DashboardDocumentsCard";
import type { DashboardText, StudentDocument, StudentDocumentRequest } from "@/lib/dashboard";

const text = {
  advisorFeedback: "Retour du conseiller",
  docStatus: {
    approved: "Valide",
    pending: "En attente",
    rejected: "A refaire",
  },
  docTitle: "Titre du document",
  docTitlePlaceholder: "Ex: passeport",
  documentsTitle: "Documents",
  documentRequestsTitle: "Documents demandes",
  documentRequestsDescription: "Deposez les documents demandes.",
  documentRequestPendingBadge: "Demande",
  documentRequestUploadAction: "Deposer",
  noDocs: "Aucun document",
  replaceDocumentAction: "Remplacer le document",
  selectFile: "Choisir le fichier",
  untitledDocument: "Document sans titre",
  uploadDoc: "Deposer un document",
} as DashboardText;

const rejectedDocument: StudentDocument = {
  id: "doc-1",
  title: "Passeport",
  status: "rejected",
  created_at: "2026-01-01T00:00:00.000Z",
  file_path: "student-1/passport.pdf",
  admin_feedback: "Document illisible.",
};

const pendingRequest: StudentDocumentRequest = {
  id: "request-1",
  title: "Releve de notes",
  description: "Ajoutez le releve le plus recent.",
  status: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
  fulfilled_document_id: null,
};

const renderCard = ({
  documents = [],
  documentRequests = [],
  onReplaceDocument = vi.fn(),
  onRequestUpload = vi.fn(),
}: {
  documents?: StudentDocument[];
  documentRequests?: StudentDocumentRequest[];
  onReplaceDocument?: (document: StudentDocument) => void;
  onRequestUpload?: (requestId: string, title: string) => void;
} = {}) => {
  render(
    <DashboardDocumentsCard
      docTitle=""
      documents={documents}
      documentRequests={documentRequests}
      isUploadOpen={false}
      isUploading={false}
      onFileUpload={vi.fn()}
      onOpenChange={vi.fn()}
      onReplaceDocument={onReplaceDocument}
      onRequestUpload={onRequestUpload}
      onTitleChange={vi.fn()}
      text={text}
    />,
  );
};

describe("DashboardDocumentsCard", () => {
  it("shows pending document requests and starts upload with the requested title", () => {
    const onRequestUpload = vi.fn();
    renderCard({ documentRequests: [pendingRequest], onRequestUpload });

    expect(screen.getByText("Documents demandes")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez le releve le plus recent.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^deposer$/i }));

    expect(onRequestUpload).toHaveBeenCalledWith("request-1", "Releve de notes");
  });

  it("lets the student replace a rejected document directly", () => {
    const onReplaceDocument = vi.fn();
    renderCard({ documents: [rejectedDocument], onReplaceDocument });

    expect(screen.getByText("Document illisible.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remplacer le document/i }));

    expect(onReplaceDocument).toHaveBeenCalledWith(rejectedDocument);
  });

  it("renders an empty state when no document has been uploaded", () => {
    renderCard();

    expect(screen.getByText("Aucun document")).toBeInTheDocument();
  });
});
