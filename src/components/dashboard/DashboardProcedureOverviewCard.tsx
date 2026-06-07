import { ArrowRight, CheckCircle2, Clock, CreditCard, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Application, DashboardText } from "@/lib/dashboard";
import { ProcedureLeadSummary } from "@/lib/procedure-lead";

interface DashboardProcedureOverviewCardProps {
  application: Application | null;
  canResumePayment: boolean;
  hasPendingPaymentBeforeApplication: boolean;
  onNavigateToPayment: () => void;
  onNavigateToProcedureStart: () => void;
  procedureLead: ProcedureLeadSummary | null;
  text: DashboardText;
}

export const DashboardProcedureOverviewCard = ({
  application,
  canResumePayment,
  hasPendingPaymentBeforeApplication,
  onNavigateToPayment,
  onNavigateToProcedureStart,
  procedureLead,
  text,
}: DashboardProcedureOverviewCardProps) => {
  if (!procedureLead && !application) {
    return (
      <Card className="group overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <Globe size={20} />
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">{text.procedureStatusTitle}</CardTitle>
            </div>
            <div className="rounded-full border border-border/40 bg-secondary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.noActiveProcedureBadge}
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6 overflow-hidden p-8 md:pt-8">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/[0.03] blur-2xl" />
          <div className="relative rounded-[1.6rem] border border-border/30 bg-gradient-to-br from-secondary/20 to-transparent p-6">
            <p className="text-lg font-semibold text-foreground">{text.noActiveProcedureTitle}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground/80">
              {text.noActiveProcedureDescription}
            </p>
          </div>
          <p className="text-sm leading-7 text-muted-foreground/70">{text.noActiveProcedureHelper}</p>
          <Button onClick={onNavigateToProcedureStart} className="gap-2 rounded-xl shadow-sm">
            {text.startProcedure}
            <ArrowRight size={14} />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (canResumePayment && procedureLead) {
    return (
      <Card className="group overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-primary/[0.04] px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <CreditCard size={20} />
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">{text.procedureStatusTitle}</CardTitle>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {text.paymentRequiredBadge}
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6 overflow-hidden p-8 md:pt-8">
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/[0.04] blur-2xl" />
          <div className="relative rounded-[1.6rem] border border-primary/10 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-6">
            <p className="text-lg font-semibold text-foreground">{text.paymentRequiredTitle}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground/80">
              {text.paymentRequiredDescription}
            </p>
          </div>
          <Button onClick={onNavigateToPayment} className="gap-2 rounded-xl shadow-sm">
            {text.proceedToPayment}
            <ArrowRight size={14} />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (hasPendingPaymentBeforeApplication && procedureLead) {
    return (
      <Card className="overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-amber-50/50 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm">
                <Clock size={20} />
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">{text.procedureStatusTitle}</CardTitle>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              {text.paymentPendingBadge}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:pt-8">
          <div className="rounded-[1.6rem] border border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-50/30 p-6">
            <p className="text-lg font-semibold text-foreground">{text.paymentPendingTitle}</p>
            <p className="mt-3 text-sm leading-7 text-amber-900/80">{text.paymentPendingDescription}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (procedureLead && !application) {
    return (
      <Card className="overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-success/[0.04] px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">{text.procedureStatusTitle}</CardTitle>
            </div>
            <div className="rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-success">
              {text.procedureStartedBadge}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:pt-8">
          <div className="rounded-[1.6rem] border border-success/15 bg-gradient-to-br from-success/[0.06] to-success/[0.02] p-6">
            <p className="text-lg font-semibold text-foreground">{text.paymentConfirmedTitle}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground/80">
              {text.paymentConfirmedDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
