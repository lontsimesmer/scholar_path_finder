import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Maximize2, ShieldOff, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  type AdminManualPaymentsText,
  type ManualPaymentLeadRecord,
  type ManualPaymentStudentLite,
  type ManualPaymentSubmissionRecord,
  getManualPaymentReceiptSignedUrl,
  getManualPaymentStudentLabel,
} from "@/lib/admin-manual-payments";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AdminManualPaymentValidationDialog");

type ActionState = "idle" | "approve" | "reject";

interface AdminManualPaymentValidationDialogProps {
  open: boolean;
  submission: ManualPaymentSubmissionRecord | null;
  lead?: ManualPaymentLeadRecord;
  profile?: ManualPaymentStudentLite;
  amountFormatter: Intl.NumberFormat;
  dateFormatter: Intl.DateTimeFormat;
  text: AdminManualPaymentsText;
  onClose: () => void;
  onValidate: (
    submissionId: string,
    action: "approve" | "reject",
    comment?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  onBlockLead: (
    leadId: string,
    reason?: string,
    unblock?: boolean,
  ) => Promise<{ success: boolean; message?: string }>;
}

export const AdminManualPaymentValidationDialog = ({
  open,
  submission,
  lead,
  profile,
  amountFormatter,
  dateFormatter,
  text,
  onClose,
  onValidate,
  onBlockLead,
}: AdminManualPaymentValidationDialogProps) => {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [isBlockSaving, setIsBlockSaving] = useState(false);
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);

  useEffect(() => {
    if (!open || !submission) {
      setComment("");
      setActionState("idle");
      setReceiptUrl(null);
      setShowBlockConfirm(false);
      setBlockReason("");
      setIsReceiptFullscreen(false);
      return;
    }
  }, [open, submission]);

  useEffect(() => {
    if (!isReceiptFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsReceiptFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [isReceiptFullscreen]);

  useEffect(() => {
    if (!open || !submission) return;

    let cancelled = false;
    setIsReceiptLoading(true);
    setReceiptUrl(null);

    getManualPaymentReceiptSignedUrl(submission.receipt_path)
      .then((url) => {
        if (!cancelled) setReceiptUrl(url);
      })
      .catch((error) => {
        logger.warn("Failed to load receipt signed URL", {
          submissionId: submission.id,
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (!cancelled) setIsReceiptLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, submission]);

  const handleApprove = useCallback(async () => {
    if (!submission) return;
    setActionState("approve");
    const result = await onValidate(submission.id, "approve", comment.trim() || undefined);
    setActionState("idle");
    if (result.success) {
      toast({ title: text.dialog.successApproveTitle });
      onClose();
    } else {
      toast({
        title: text.dialog.errorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [comment, onClose, onValidate, submission, text.dialog.errorTitle, text.dialog.successApproveTitle, toast]);

  const handleReject = useCallback(async () => {
    if (!submission) return;
    const trimmed = comment.trim();
    if (!trimmed) {
      toast({
        title: text.dialog.requireCommentTitle,
        description: text.dialog.requireCommentDescription,
        variant: "destructive",
      });
      return;
    }
    setActionState("reject");
    const result = await onValidate(submission.id, "reject", trimmed);
    setActionState("idle");
    if (result.success) {
      toast({ title: text.dialog.successRejectTitle });
      onClose();
    } else {
      toast({
        title: text.dialog.errorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [
    comment,
    onClose,
    onValidate,
    submission,
    text.dialog.errorTitle,
    text.dialog.requireCommentDescription,
    text.dialog.requireCommentTitle,
    text.dialog.successRejectTitle,
    toast,
  ]);

  const handleConfirmBlock = useCallback(async () => {
    if (!lead) return;
    const alreadyBlocked = Boolean(lead.manual_payment_blocked_at);
    setIsBlockSaving(true);
    const result = await onBlockLead(lead.id, blockReason.trim() || undefined, alreadyBlocked);
    setIsBlockSaving(false);
    if (result.success) {
      toast({
        title: alreadyBlocked ? text.dialog.successUnblockTitle : text.dialog.successBlockTitle,
      });
      setShowBlockConfirm(false);
      onClose();
    } else {
      toast({
        title: text.dialog.errorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [
    blockReason,
    lead,
    onBlockLead,
    onClose,
    text.dialog.errorTitle,
    text.dialog.successBlockTitle,
    text.dialog.successUnblockTitle,
    toast,
  ]);

  if (!submission) return null;

  const blocked = Boolean(lead?.manual_payment_blocked_at);
  const isPending = submission.status === "pending_review";
  const isBusy = actionState !== "idle";

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{text.dialog.title}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {text.dialog.receiptTitle}
              </p>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
                {isReceiptLoading ? (
                  <div className="flex h-72 items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={28} />
                  </div>
                ) : receiptUrl ? (
                  submission.receipt_mime_type === "application/pdf" ? (
                    <object
                      data={receiptUrl}
                      type="application/pdf"
                      className="h-72 w-full"
                      aria-label={text.dialog.receiptTitle}
                    >
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 text-sm text-primary underline"
                      >
                        {text.dialog.receiptTitle}
                      </a>
                    </object>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsReceiptFullscreen(true)}
                      className="group relative block w-full cursor-zoom-in"
                      aria-label={text.dialog.receiptZoom}
                    >
                      <img
                        src={receiptUrl}
                        alt={text.dialog.receiptTitle}
                        className="max-h-72 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Maximize2 size={12} />
                        {text.dialog.receiptZoom}
                      </span>
                    </button>
                  )
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {text.dialog.receiptUnavailable}
                  </div>
                )}
              </div>
              {receiptUrl && submission.receipt_mime_type !== "application/pdf" ? (
                <button
                  type="button"
                  onClick={() => setIsReceiptFullscreen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Maximize2 size={12} />
                  {text.dialog.receiptZoom}
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {text.dialog.leadSection}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-semibold text-foreground">{lead?.name ?? text.noLead}</p>
                  <p className="text-muted-foreground">{lead?.email ?? "—"}</p>
                  {blocked ? (
                    <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-destructive">
                      <ShieldOff size={12} />
                      {text.actions.block}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {text.dialog.submissionSection}
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{text.columns.student}</dt>
                    <dd className="text-right text-foreground">
                      {getManualPaymentStudentLabel(profile, profile?.email, text.noStudent)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{text.columns.amount}</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {amountFormatter.format(submission.amount)} {submission.currency}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{text.columns.submittedAt}</dt>
                    <dd className="text-right text-foreground">
                      {dateFormatter.format(new Date(submission.created_at))}
                    </dd>
                  </div>
                  {submission.sender_name ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{text.dialog.senderNameLabel}</dt>
                      <dd className="text-right text-foreground">{submission.sender_name}</dd>
                    </div>
                  ) : null}
                  {submission.sender_phone ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{text.dialog.senderPhoneLabel}</dt>
                      <dd className="text-right text-foreground">{submission.sender_phone}</dd>
                    </div>
                  ) : null}
                  {submission.provider_reference ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{text.dialog.providerReferenceLabel}</dt>
                      <dd className="text-right text-foreground">{submission.provider_reference}</dd>
                    </div>
                  ) : null}
                  {submission.notes ? (
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">{text.dialog.notesLabel}</dt>
                      <dd className="text-foreground">{submission.notes}</dd>
                    </div>
                  ) : null}
                  {submission.reviewer_comment ? (
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">{text.dialog.commentLabel}</dt>
                      <dd className="text-foreground">{submission.reviewer_comment}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {isPending ? (
                <div className="space-y-2">
                  <Label htmlFor="manual-payment-validation-comment">
                    {text.dialog.commentLabel}
                  </Label>
                  <Textarea
                    id="manual-payment-validation-comment"
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={text.dialog.commentPlaceholder}
                    disabled={isBusy}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBlockConfirm(true)}
              disabled={!lead || isBusy}
            >
              {blocked ? text.actions.unblock : text.actions.block}
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={onClose} disabled={isBusy}>
                {text.dialog.closeButton}
              </Button>
              {isPending ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isBusy}
                  >
                    {actionState === "reject" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {text.dialog.rejectButton}
                  </Button>
                  <Button onClick={handleApprove} disabled={isBusy}>
                    {actionState === "approve" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {text.dialog.approveButton}
                  </Button>
                </>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showBlockConfirm}
        onOpenChange={(value) => (!value ? setShowBlockConfirm(false) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blocked ? text.actions.unblock : text.dialog.blockConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.dialog.blockConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!blocked ? (
            <div className="space-y-2">
              <Label htmlFor="manual-payment-block-reason">{text.dialog.blockReasonLabel}</Label>
              <Input
                id="manual-payment-block-reason"
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                disabled={isBlockSaving}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlockSaving}>{text.dialog.blockCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock} disabled={isBlockSaving}>
              {isBlockSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {blocked ? text.actions.unblock : text.dialog.blockConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isReceiptFullscreen && receiptUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text.dialog.receiptTitle}
          className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
          onClick={() => setIsReceiptFullscreen(false)}
        >
          <div className="flex items-center justify-between gap-3 px-6 py-4 text-white">
            <p className="text-sm font-semibold uppercase tracking-widest">
              {text.dialog.receiptTitle}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/30 px-3 text-xs font-semibold uppercase tracking-widest text-white/90 transition-colors hover:bg-white/10"
              >
                <ExternalLink size={14} />
                {text.dialog.receiptOpenNewTab}
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsReceiptFullscreen(false);
                }}
                aria-label={text.dialog.closeButton}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-auto px-4 pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={receiptUrl}
              alt={text.dialog.receiptTitle}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
