import { useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Loader2, MessageSquare, Plus, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminCRMText, StudentDocument, StudentDocumentRequest } from "@/lib/admin-crm";
import { cn } from "@/lib/utils";

interface AdminCRMDocumentsManagerProps {
  documents: StudentDocument[];
  documentRequests: StudentDocumentRequest[];
  isLoading: boolean;
  isRequestingDocument: boolean;
  onCreateDocumentRequest: (title: string, description: string) => Promise<void>;
  onGetFileUrl: (path: string) => Promise<void>;
  onSetDocuments: (documents: StudentDocument[]) => void;
  onUpdateDoc: (docId: string, updates: Partial<StudentDocument>) => Promise<void>;
  text: AdminCRMText;
}

const statusPriority: Record<StudentDocument["status"], number> = {
  pending: 0,
  rejected: 1,
  approved: 2,
};

export const AdminCRMDocumentsManager = ({
  documents,
  documentRequests,
  isLoading,
  isRequestingDocument,
  onCreateDocumentRequest,
  onGetFileUrl,
  onSetDocuments,
  onUpdateDoc,
  text,
}: AdminCRMDocumentsManagerProps) => {
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");

  const handleCreateRequest = async () => {
    await onCreateDocumentRequest(requestTitle, requestDescription);
    setRequestTitle("");
    setRequestDescription("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const sortedDocuments = [...documents].sort((left, right) => {
    const statusDiff = statusPriority[left.status] - statusPriority[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return left.title.localeCompare(right.title);
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{text.documentRequestNameLabel}</p>
            <Input
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder={text.documentRequestNamePlaceholder}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{text.documentRequestDetailsLabel}</p>
            <Input
              value={requestDescription}
              onChange={(event) => setRequestDescription(event.target.value)}
              placeholder={text.documentRequestDetailsPlaceholder}
              className="bg-white"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleCreateRequest()}
            disabled={isRequestingDocument || requestTitle.trim().length === 0}
            className="rounded-xl"
          >
            <Plus size={15} className="mr-2" />
            {isRequestingDocument ? text.documentRequestCreating : text.documentRequestCreate}
          </Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{text.documentRequestDescription}</p>
      </div>

      <div className="rounded-xl border border-border/40 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">{text.documentRequestTitle}</p>
        {documentRequests.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{text.documentRequestsEmpty}</p>
        ) : (
          <div className="grid gap-3">
            {documentRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{request.title}</p>
                    {request.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{request.description}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {text.documentRequestStatuses[request.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-warning">
            {text.sheet.documentsPending}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {documents.filter((document) => document.status === "pending").length}
          </p>
        </div>
        <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-success">
            {text.sheet.documentsApproved}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {documents.filter((document) => document.status === "approved").length}
          </p>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-destructive">
            {text.sheet.documentsRejected}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {documents.filter((document) => document.status === "rejected").length}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedDocuments.length === 0 ? (
          <p className="py-10 text-center italic text-muted-foreground">{text.noDocuments}</p>
        ) : sortedDocuments.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              "space-y-4 rounded-xl border p-5",
              doc.status === "pending"
                ? "border-warning/30 bg-warning/5"
                : doc.status === "approved"
                  ? "border-success/20 bg-success/5"
                  : "border-destructive/20 bg-destructive/5",
            )}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="space-y-2">
                    <Input
                      value={doc.title}
                      onChange={(event) => {
                        onSetDocuments(
                          documents.map((item) =>
                            item.id === doc.id ? { ...item, title: event.target.value } : item,
                          ),
                        );
                      }}
                      onBlur={(event) => void onUpdateDoc(doc.id, { title: event.target.value })}
                      className="h-8 border-none bg-transparent p-0 text-base font-semibold focus-visible:ring-0"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                          doc.status === "pending"
                            ? "border-warning/30 bg-white text-warning"
                            : doc.status === "approved"
                              ? "border-success/20 bg-white text-success"
                              : "border-destructive/20 bg-white text-destructive",
                        )}
                      >
                        {text.documentStates[doc.status]}
                      </Badge>
                      <button
                        onClick={() => void onGetFileUrl(doc.file_path)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                      >
                        {text.viewFile} <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button
                  variant={doc.status === "approved" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full text-[10px] font-bold uppercase tracking-widest",
                    doc.status === "approved"
                      ? "bg-success hover:bg-success/90"
                      : "border-success/20 text-success",
                  )}
                  onClick={() => void onUpdateDoc(doc.id, { status: "approved" })}
                >
                  <CheckCircle2 size={14} className="mr-1" /> {text.approve}
                </Button>
                <Button
                  variant={doc.status === "rejected" ? "destructive" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full text-[10px] font-bold uppercase tracking-widest",
                    doc.status === "rejected" ? "" : "border-destructive/20 text-destructive",
                  )}
                  onClick={() => void onUpdateDoc(doc.id, { status: "rejected" })}
                >
                  <XCircle size={14} className="mr-1" /> {text.reject}
                </Button>
              </div>
            </div>

            <div className="border-t border-border/20 pt-4">
              <div className="flex items-start gap-3">
                <MessageSquare size={14} className="mt-1 text-muted-foreground" />
                <Textarea
                  placeholder={text.feedbackPlaceholder}
                  value={doc.admin_feedback || ""}
                  onChange={(event) => {
                    onSetDocuments(
                      documents.map((item) =>
                        item.id === doc.id ? { ...item, admin_feedback: event.target.value } : item,
                      ),
                    );
                  }}
                  onBlur={(event) => void onUpdateDoc(doc.id, { admin_feedback: event.target.value })}
                  className="min-h-[88px] resize-none rounded-xl bg-white/80 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
