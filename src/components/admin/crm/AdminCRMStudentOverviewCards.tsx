import { CircleCheckBig, FileCheck2, GraduationCap, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AdminCRMStudent, AdminCRMText, getPaymentFilterState } from "@/lib/admin-crm";
import { getStudentDisplayName, getStudentProfileReviewStatus } from "@/lib/student-profile";
import { cn } from "@/lib/utils";

interface AdminCRMStudentOverviewCardsProps {
  applicationStatusLabels: Record<string, string>;
  student: AdminCRMStudent;
  text: AdminCRMText;
}

export const AdminCRMStudentOverviewCards = ({
  applicationStatusLabels,
  student,
  text,
}: AdminCRMStudentOverviewCardsProps) => {
  const profileReviewStatus = getStudentProfileReviewStatus(student.profile);
  const paymentState = getPaymentFilterState(student);
  const applicationStatus = student.application?.status
    ? applicationStatusLabels[student.application.status] || student.application.status
    : "-";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              {text.sheet.profileSummary}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {getStudentDisplayName(student.profile, student.email)}
            </p>
            <p className="text-sm text-muted-foreground">
              {student.profile?.current_degree || text.sheet.noCurrentDegree}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CircleCheckBig className="h-5 w-5" />
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "mt-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
            profileReviewStatus === "validated"
              ? "border-success/20 bg-success/5 text-success"
              : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          {profileReviewStatus === "validated"
            ? text.profileValidated
            : profileReviewStatus === "correction_requested"
              ? text.profileCorrectionRequested
              : text.profilePendingValidation}
        </Badge>
      </div>

      <div className="rounded-xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              {text.sheet.procedureSummary}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {student.profile?.target_country || text.sheet.noTargetCountry}
            </p>
            <p className="text-sm text-muted-foreground">
              {student.profile?.target_program || text.sheet.noTargetProgram}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {applicationStatus}
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              {text.sheet.paymentSummary}
            </p>
            <p className="text-lg font-semibold text-foreground">{text.paymentStates[paymentState]}</p>
            <p className="text-sm text-muted-foreground">
              {student.lead?.payment_status || student.lead?.status || text.sheet.noTransactions}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
        </div>
        {student.paymentSummary.latestTransaction ? (
          <div className="mt-4 min-w-0 rounded-2xl bg-secondary/35 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {text.sheet.latestTransaction}
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-5 text-foreground/80">
              {student.paymentSummary.latestTransaction.transaction_id}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">{text.sheet.noTransactions}</p>
        )}
      </div>

      <div className="rounded-xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              {text.sheet.documentSummary}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {`${student.documentSummary.total} ${text.sheet.totalDocuments.toLowerCase()}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {`${student.documentSummary.pending} ${text.sheet.documentsPending.toLowerCase()} / ${student.documentSummary.approved} ${text.sheet.documentsApproved.toLowerCase()}`}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {`${student.documentSummary.rejected} ${text.sheet.documentsRejected.toLowerCase()}`}
        </p>
      </div>
    </div>
  );
};
