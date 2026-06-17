import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartProcedureText } from "@/lib/start-procedure";

interface ProcedureStatusCardProps {
  hasActiveProcedure: boolean;
  isLoading: boolean;
  paymentCheckoutPath: string | null;
  paymentIsPending: boolean;
  paymentRequiresAction: boolean;
  profileReadyForProcedure: boolean;
  onCompleteProfile: () => void;
  onGoToPayment: () => void;
  onReturnToDashboard: () => void;
  text: StartProcedureText;
}

export const ProcedureStatusCard = ({
  hasActiveProcedure,
  isLoading,
  paymentCheckoutPath,
  paymentIsPending,
  paymentRequiresAction,
  profileReadyForProcedure,
  onCompleteProfile,
  onGoToPayment,
  onReturnToDashboard,
  text,
}: ProcedureStatusCardProps) => {
  if (isLoading) {
    return (
      <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
        <CardContent className="flex min-h-[360px] items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">{text.loading}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileReadyForProcedure) {
    return (
      <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
        <CardHeader className="border-b border-border/40 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertCircle size={18} />
            </div>
            <CardTitle className="font-display text-xl">{text.profileRequiredTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <p className="text-sm leading-7 text-muted-foreground">{text.profileRequiredDescription}</p>
          <Button onClick={onCompleteProfile} className="w-full rounded-xl">
            {text.profileRequiredAction}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paymentRequiresAction && paymentCheckoutPath) {
    return (
      <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
        <CardHeader className="border-b border-border/40 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard size={18} />
            </div>
            <CardTitle className="font-display text-xl">{text.resumePaymentTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <p className="text-sm leading-7 text-muted-foreground">{text.resumePaymentDescription}</p>
          <Button onClick={onGoToPayment} className="w-full rounded-xl">
            {text.resumePaymentAction}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paymentIsPending) {
    return (
      <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
        <CardHeader className="border-b border-border/40 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={18} />
            </div>
            <CardTitle className="font-display text-xl">{text.pendingTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <p className="text-sm leading-7 text-muted-foreground">{text.pendingDescription}</p>
          <Button onClick={onReturnToDashboard} variant="outline" className="w-full rounded-xl">
            {text.backToDashboard}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (hasActiveProcedure) {
    return (
      <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
        <CardHeader className="border-b border-border/40 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 size={18} />
            </div>
            <CardTitle className="font-display text-xl">{text.activeTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <p className="text-sm leading-7 text-muted-foreground">{text.activeDescription}</p>
          <Button onClick={onReturnToDashboard} variant="outline" className="w-full rounded-xl">
            {text.backToDashboard}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};
