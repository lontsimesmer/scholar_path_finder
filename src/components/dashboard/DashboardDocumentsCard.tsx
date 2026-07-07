import { ChangeEvent, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Upload,
  XCircle,
} from "lucide-react";

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
import {
  DashboardText,
  DocumentChecklistItem,
  DocumentChecklistItemStatus,
  StudentDocument,
  StudentDocumentRequest,
  buildDocumentChecklist,
} from "@/lib/dashboard";
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

const statusStyles: Record<
  DocumentChecklistItemStatus,
  { badge: string; dot: string; icon: typeof CheckCircle2 }
> = {
  requested: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    icon: Clock,
  },
  waiting_review: {
    badge: "border-primary/20 bg-primary/5 text-primary",
    dot: "bg-primary",
    icon: Clock,
  },
  approved: {
    badge: "border-success/20 bg-success/5 text-success",
    dot: "bg-success",
    icon: CheckCircle2,
  },
  rejected: {
    badge: "border-destructive/20 bg-destructive/5 text-destructive",
    dot: "bg-destructive",
    icon: XCircle,
  },
};

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

  const checklist = useMemo(
    () => buildDocumentChecklist(documentRequests, documents),
    [documents, documentRequests],
  );

  const pendingRequestsCount = useMemo(
    () => checklist.filter((item) => item.status === "requested").length,
    [checklist],
  );

  return (
    <Card className="overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
      <CardHeader className="flex flex-col gap-4 border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-5 pb-5 pt-6 sm:flex-row sm:items-center sm:justify-between md:px-8 md:pb-8 md:pt-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <FileText size={20} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="font-display text-2xl tracking-tight">
              {text.documentsTitle}
            </CardTitle>
            {checklist.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">
                {checklist.length}
              </span>
            ) : null}
            {pendingRequestsCount > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                {text.checklistPendingSummary.replace(
                  "{count}",
                  String(pendingRequestsCount),
                )}
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
                <Button
                  asChild
                  className="w-full cursor-pointer rounded-xl py-6"
                  disabled={isUploading || !docTitle}
                >
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
      <CardContent className="p-5 md:p-8 md:pt-8 lg:p-10 lg:pt-10">
        {checklist.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-border/30 bg-gradient-to-br from-secondary/10 to-transparent py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/40 shadow-sm">
              <FileText size={28} className="text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground/70">{text.noDocs}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {checklist.map((item, index) => (
              <ChecklistRow
                key={item.key}
                item={item}
                text={text}
                animationDelay={`${index * 60}ms`}
                onReplaceDocument={onReplaceDocument}
                onRequestUpload={onRequestUpload}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ChecklistRowProps {
  item: DocumentChecklistItem;
  text: DashboardText;
  animationDelay: string;
  onReplaceDocument: (document: StudentDocument) => void;
  onRequestUpload: (requestId: string, title: string) => void;
}

const ChecklistRow = ({
  item,
  text,
  animationDelay,
  onReplaceDocument,
  onRequestUpload,
}: ChecklistRowProps) => {
  const style = statusStyles[item.status];
  const Icon = style.icon;
  const document = item.document;

  const badgeLabel =
    item.status === "requested"
      ? text.checklistStatusRequested
      : item.status === "waiting_review"
        ? text.checklistStatusWaiting
        : item.status === "approved"
          ? text.checklistStatusApproved
          : text.checklistStatusRejected;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-soft sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        item.status === "requested"
          ? "border-amber-200 bg-amber-50/40"
          : "border-border/30 bg-white",
      )}
      style={{ animationDelay }}
    >
      <div className="flex min-w-0 gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            item.status === "approved"
              ? "bg-success/10 text-success"
              : item.status === "rejected"
                ? "bg-destructive/10 text-destructive"
                : item.status === "waiting_review"
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-100 text-amber-700",
          )}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{item.title}</p>
            {item.isRequested ? (
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                {text.checklistRequestedBadge}
              </span>
            ) : (
              <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {text.checklistSpontaneousBadge}
              </span>
            )}
          </div>
          {item.description ? (
            <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
          ) : null}
          {document ? (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {new Date(document.created_at).toLocaleDateString()}
            </p>
          ) : null}
          {document?.admin_feedback ? (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 rounded-xl border p-3 text-xs",
                item.status === "rejected"
                  ? "border-destructive/10 bg-destructive/5 text-destructive"
                  : "border-primary/10 bg-primary/5 text-primary",
              )}
            >
              <MessageSquare size={14} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                  {text.advisorFeedback}
                </p>
                <p className="text-sm font-medium italic leading-relaxed">
                  {document.admin_feedback}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1", style.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {badgeLabel}
          </span>
        </div>
        {item.status === "requested" && item.requestId ? (
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            onClick={() => onRequestUpload(item.requestId!, item.title)}
          >
            <Upload size={14} className="mr-2" />
            {text.documentRequestUploadAction}
          </Button>
        ) : null}
        {item.status === "rejected" && document ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => onReplaceDocument(document)}
          >
            <Upload size={14} className="mr-2" />
            {text.replaceDocumentAction}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
