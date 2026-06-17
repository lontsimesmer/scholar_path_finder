import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useManualPaymentStatus,
  type ManualPaymentLatestSubmission,
} from "@/hooks/use-manual-payment-status";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import {
  type ManualOrangeMoneyInstructions,
  formatCheckoutAmountXaf,
} from "@/lib/checkout-settings";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { cn } from "@/lib/utils";

const logger = createLogger("ManualOrangeMoneyPayment");

const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_RECEIPT_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

type ManualOrangeMoneyPaymentProps = {
  leadId: string | null;
  userEmail: string | null;
  instructions: ManualOrangeMoneyInstructions;
};

const ManualOrangeMoneyPayment = ({
  leadId,
  instructions,
}: ManualOrangeMoneyPaymentProps) => {
  const { t, language } = useLanguage();
  const labels = t.checkout.manualOrangeMoney;
  const { toast } = useToast();
  const navigate = useNavigate();
  const { status, isLoading: isStatusLoading, refresh } = useManualPaymentStatus({ leadId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [notes, setNotes] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setSenderName("");
    setSenderPhone("");
    setProviderReference("");
    setNotes("");
    setResetSignal((value) => value + 1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      toast({
        title: labels.submitErrorTitle,
        description: labels.submitErrorTooLarge,
        variant: "destructive",
      });
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    const mime = file.type?.toLowerCase() ?? "";
    if (!ACCEPTED_RECEIPT_TYPES.includes(mime)) {
      toast({
        title: labels.submitErrorTitle,
        description: labels.submitErrorWrongFormat,
        variant: "destructive",
      });
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId) {
      toast({
        title: labels.submitErrorTitle,
        description: labels.submitErrorMissingLead,
        variant: "destructive",
      });
      return;
    }
    if (!selectedFile) {
      toast({
        title: labels.submitErrorTitle,
        description: labels.submitErrorMissingReceipt,
        variant: "destructive",
      });
      return;
    }

    const trimmedSenderName = senderName.trim();
    const trimmedSenderPhone = senderPhone.trim();
    if (!trimmedSenderName || !trimmedSenderPhone) {
      toast({
        title: labels.submitErrorTitle,
        description: labels.submitErrorMissingSenderIdentity,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("receipt", selectedFile);
    formData.set("senderName", trimmedSenderName);
    formData.set("senderPhone", trimmedSenderPhone);
    if (providerReference.trim()) formData.set("providerReference", providerReference.trim());
    if (notes.trim()) formData.set("notes", notes.trim());

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-manual-payment", {
        body: formData,
      });

      if (error) {
        throw error;
      }

      toast({
        title: labels.submitSuccessTitle,
        description: labels.submitSuccessDescription,
      });
      resetForm();
      await refresh();
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      logger.warn("Failed to submit manual payment", { leadId, message });
      let description = labels.submitErrorGeneric;
      if (message.includes("Lead is blocked")) {
        description = labels.submitErrorLeadBlocked;
      } else if (message.includes("already pending")) {
        description = labels.submitErrorAlreadyPending;
      } else if (message.includes("already paid")) {
        description = labels.submitErrorAlreadyPaid;
      } else if (message.includes("Receipt file size")) {
        description = labels.submitErrorTooLarge;
      } else if (message.includes("Unsupported receipt")) {
        description = labels.submitErrorWrongFormat;
      } else if (message.includes("senderName") || message.includes("senderPhone")) {
        description = labels.submitErrorMissingSenderIdentity;
      }
      toast({
        title: labels.submitErrorTitle,
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const latest = status?.latestSubmission ?? null;
  const isBlocked = Boolean(status?.blocked);
  const isApproved = latest?.status === "approved";
  const isPending = latest?.status === "pending_review";
  const isRejected = latest?.status === "rejected";

  const showForm = !isBlocked && !isApproved && !isPending;

  return (
    <div className="space-y-5" key={resetSignal}>
      <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {labels.cardTitle}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{labels.cardSubtitle}</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/40 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {labels.accountLabel}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">{instructions.accountNumber}</p>
            <p className="text-xs text-muted-foreground">{instructions.accountName}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {labels.amountLabel}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatCheckoutAmountXaf(instructions.amount)} {instructions.currency}
            </p>
          </div>
        </div>

        <ol className="mt-4 list-inside list-decimal space-y-1 text-sm text-foreground">
          <li>{labels.step1}</li>
          <li>{labels.step2}</li>
          <li>{labels.step3}</li>
        </ol>

        <p className="mt-3 text-xs text-muted-foreground">
          {language === "fr" ? instructions.instructionsFr : instructions.instructionsEn}
        </p>
      </div>

      {isStatusLoading && status === null ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/40 bg-secondary/30 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {labels.statusLoading}
        </div>
      ) : null}

      {isBlocked ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">{labels.statusBlockedTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status?.blockedReason ?? labels.statusBlockedDescription}
          </p>
        </div>
      ) : null}

      {isApproved ? (
        <ApprovedBanner
          submission={latest}
          title={labels.statusApprovedTitle}
          description={labels.statusApprovedDescription}
          ctaLabel={labels.goToDashboard}
          onCtaClick={() => navigate("/dashboard")}
        />
      ) : null}

      {isPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{labels.statusPendingTitle}</p>
          <p className="mt-1 text-sm text-amber-800">{labels.statusPendingDescription}</p>
        </div>
      ) : null}

      {isRejected && latest?.reviewer_comment ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">{labels.statusRejectedTitle}</p>
          <p className="mt-1 text-sm text-foreground">{latest.reviewer_comment}</p>
          <p className="mt-2 text-xs text-muted-foreground">{labels.statusRejectedRetryHint}</p>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-white p-5">
          <div className="space-y-2">
            <Label htmlFor="manual-receipt">{labels.uploadTitle}</Label>
            <Input
              ref={fileInputRef}
              id="manual-receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{labels.uploadHelper}</p>
            {selectedFile ? (
              <p className="flex items-center gap-2 text-xs font-medium text-primary">
                <Upload size={14} />
                {selectedFile.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="manual-sender-name">
                {labels.senderNameLabel}
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="manual-sender-name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                disabled={isSubmitting}
                placeholder={labels.senderNamePlaceholder}
                required
                aria-required="true"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-sender-phone">
                {labels.senderPhoneLabel}
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="manual-sender-phone"
                type="tel"
                value={senderPhone}
                onChange={(event) => setSenderPhone(event.target.value)}
                disabled={isSubmitting}
                placeholder={labels.senderPhonePlaceholder}
                required
                aria-required="true"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="manual-provider-reference">{labels.providerReferenceLabel}</Label>
            <Input
              id="manual-provider-reference"
              value={providerReference}
              onChange={(event) => setProviderReference(event.target.value)}
              disabled={isSubmitting}
              placeholder={labels.providerReferencePlaceholder}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="manual-notes">{labels.notesLabel}</Label>
            <Textarea
              id="manual-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSubmitting}
              placeholder={labels.notesPlaceholder}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 text-primary" />
            <p>{labels.privacyNote}</p>
          </div>

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedFile ||
              !leadId ||
              !senderName.trim() ||
              !senderPhone.trim()
            }
            className={cn("w-full rounded-2xl", isSubmitting ? "opacity-90" : "")}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.submittingLabel}
              </span>
            ) : (
              labels.submitButton
            )}
          </Button>
        </form>
      ) : null}
    </div>
  );
};

type ApprovedBannerProps = {
  submission: ManualPaymentLatestSubmission | null;
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
};

const ApprovedBanner = ({
  submission: _submission,
  title,
  description,
  ctaLabel,
  onCtaClick,
}: ApprovedBannerProps) => (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="text-sm font-semibold text-emerald-900">{title}</p>
    <p className="mt-1 text-sm text-emerald-800">{description}</p>
    <Button onClick={onCtaClick} className="mt-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
      {ctaLabel}
    </Button>
  </div>
);

export default ManualOrangeMoneyPayment;
