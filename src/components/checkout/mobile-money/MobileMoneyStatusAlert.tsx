import { CheckCircle, Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MobileMoneyStatus } from "@/lib/mobile-money-payment";

type MobileMoneyStatusAlertProps = {
  paymentStatus: MobileMoneyStatus;
  statusMessage: string | null;
  manualVerification: boolean;
  transactionRef: string | null;
  isCheckingStatus: boolean;
  pendingTitle: string;
  pendingMessage: string;
  successTitle: string;
  checkStatusLabel: string;
  onCheckStatus: () => void;
};

export function MobileMoneyStatusAlert({
  paymentStatus,
  statusMessage,
  manualVerification,
  transactionRef,
  isCheckingStatus,
  pendingTitle,
  pendingMessage,
  successTitle,
  checkStatusLabel,
  onCheckStatus,
}: MobileMoneyStatusAlertProps) {
  if (paymentStatus === "success") {
    return (
      <div className="flex items-center gap-3 rounded-[1.3rem] border border-success/20 bg-success/10 p-4">
        <CheckCircle className="h-5 w-5 text-success" />
        <p className="text-sm font-medium text-foreground">{successTitle}</p>
      </div>
    );
  }

  if (paymentStatus !== "pending") {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-[1.3rem] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <Clock className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{pendingTitle}</p>
        <p className="text-xs leading-6 text-muted-foreground">{statusMessage || pendingMessage}</p>
      </div>
      {!manualVerification && transactionRef ? (
        <Button type="button" variant="outline" size="sm" onClick={onCheckStatus} disabled={isCheckingStatus}>
          {isCheckingStatus ? <RefreshCw className="h-4 w-4 animate-spin" /> : checkStatusLabel}
        </Button>
      ) : null}
    </div>
  );
}
