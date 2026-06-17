import { ChangeEvent } from "react";
import { FileText, Loader2, MessageSquare, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DashboardText, StudentDocument, StudentDocumentRequest } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface DashboardDocumentsCardProps {
  docTitle: string;
  documents: StudentDocument[];
  documentRequests: StudentDocumentRequest[];
  isUploadOpen: boolean;
  isUploading: boolean;
  onFileUpload: (file: File | null) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onReplaceDocument: (document: StudentDocument) => void;
  onRequestUpload: (requestId: string, title: string) => void;
  onTitleChange: (value: string) => void;
  text: DashboardText;
}

const statusStyles = {
  approved: {
    badge: "border-success/20 bg-success/5 text-success",
    dot: "bg-success",
  },
  rejected: {
    badge: "border-destructive/20 bg-destructive/5 text-destructive",
    dot: "bg-destructive",
  },
  pending: {
    badge: "border-amber-200 bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
  },
} as const;

export const DashboardDocumentsCard = ({
  docTitle,
  documents,
  documentRequests,
  isUploadOpen,
  isUploading,
  onFileUpload,
  onOpenChange,
  onReplaceDocument,
  onRequestUpload,
  onTitleChange,
  text,
}: DashboardDocumentsCardProps) => {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void onFileUpload(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  return (
    <Card className="overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
      <CardHeader className="flex flex-col gap-4 border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-8 pt-10 sm:flex-row sm:items-center sm:justify-between md:px-8 md:pb-8 md:pt-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <FileText size={20} />
          </div>
          <div className="flex items-center gap-3">
            <CardTitle className="font-display text-2xl tracking-tight">{text.documentsTitle}</CardTitle>
            {documents.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">
                {documents.length}
              </span>
            ) : null}
          </div>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl shadow-sm">
              <Upload size={16} />
              {text.uploadDoc}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader>
              <DialogTitle>{text.uploadDoc}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {text.docTitle}
                </label>
                <Input
                  value={docTitle}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder={text.docTitlePlaceholder}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="doc-file"
                  className="hidden"
                  onChange={handleInputChange}
                  disabled={isUploading || !docTitle}
                />
                <Button asChild className="w-full cursor-pointer rounded-xl py-6" disabled={isUploading || !docTitle}>
                  <label htmlFor="doc-file">
                    {isUploading ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Plus size={16} className="mr-2" />
                    )}
                    {text.selectFile}
                  </label>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-8 md:pt-8 lg:p-10 lg:pt-10">
        {documentRequests.filter((request) => request.status === "pending").length > 0 ? (
          <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5">
            <div className="mb-4">
              <p className="font-semibold text-foreground">{text.documentRequestsTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {text.documentRequestsDescription}
              </p>
            </div>
            <div className="grid gap-3">
              {documentRequests
                .filter((request) => request.status === "pending")
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{request.title}</p>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                          {text.documentRequestPendingBadge}
                        </span>
                      </div>
                      {request.description ? (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.description}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 rounded-xl"
                      onClick={() => onRequestUpload(request.id, request.title)}
                    >
                      <Upload size={15} className="mr-2" />
                      {text.documentRequestUploadAction}
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {documents.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-border/30 bg-gradient-to-br from-secondary/10 to-transparent py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/40 shadow-sm">
              <FileText size={28} className="text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground/70">{text.noDocs}</p>
          </div>
        ) : (
          <div className="grid gap-5 pt-2">
            {documents.map((doc, index) => {
              const displayName = doc.title || doc.name || text.untitledDocument;
              const style = statusStyles[doc.status] || statusStyles.pending;
              return (
                <div
                  key={doc.id}
                  className="group relative space-y-4 overflow-hidden rounded-[2rem] border border-border/30 bg-white p-6 transition-all duration-400 hover:border-primary/20 hover:shadow-medium"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Hover sweep */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-primary/[0.02] to-transparent transition-transform duration-500 group-hover:translate-x-0" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary transition-transform duration-300 group-hover:scale-105">
                        <FileText size={22} />
                      </div>
                      <div>
                        <p className="text-base font-bold tracking-tight text-foreground">{displayName}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1", style.badge)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {text.docStatus[doc.status] || doc.status}
                      </span>
                    </div>
                  </div>

                  {doc.admin_feedback ? (
                    <div
                      className={cn(
                        "relative mt-2 flex items-start gap-3 rounded-2xl border p-4 text-xs",
                        doc.status === "rejected"
                          ? "border-destructive/10 bg-destructive/5 text-destructive"
                          : "border-primary/10 bg-primary/5 text-primary",
                      )}
                    >
                      <MessageSquare size={16} className="mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                          {text.advisorFeedback}
                        </p>
                        <p className="text-sm font-medium italic leading-relaxed">{doc.admin_feedback}</p>
                      </div>
                    </div>
                  ) : null}

                  {doc.status === "rejected" ? (
                    <div className="relative flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
                        onClick={() => onReplaceDocument(doc)}
                      >
                        <Upload size={15} className="mr-2" />
                        {text.replaceDocumentAction}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
