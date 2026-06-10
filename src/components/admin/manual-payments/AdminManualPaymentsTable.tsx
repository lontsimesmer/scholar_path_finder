import { Loader2, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminManualPaymentsText,
  type ManualPaymentLeadRecord,
  type ManualPaymentStudentLite,
  type ManualPaymentSubmissionRecord,
  type ManualPaymentSubmissionStatus,
  getManualPaymentStudentLabel,
} from "@/lib/admin-manual-payments";
import { cn } from "@/lib/utils";

interface AdminManualPaymentsTableProps {
  amountFormatter: Intl.NumberFormat;
  dateFormatter: Intl.DateTimeFormat;
  isLoading: boolean;
  submissions: ManualPaymentSubmissionRecord[];
  leadById: Record<string, ManualPaymentLeadRecord>;
  profileById: Record<string, ManualPaymentStudentLite>;
  text: AdminManualPaymentsText;
  onReview: (submission: ManualPaymentSubmissionRecord) => void;
}

const statusToneClass = (status: ManualPaymentSubmissionStatus) => {
  switch (status) {
    case "approved":
      return "border-success/20 bg-success/5 text-success";
    case "pending_review":
      return "border-warning/30 bg-warning/10 text-warning";
    case "rejected":
      return "border-destructive/20 bg-destructive/5 text-destructive";
    case "cancelled":
      return "border-border/50 bg-secondary/40 text-muted-foreground";
    default:
      return "border-border/50 bg-secondary/40 text-muted-foreground";
  }
};

export const AdminManualPaymentsTable = ({
  amountFormatter,
  dateFormatter,
  isLoading,
  submissions,
  leadById,
  profileById,
  text,
  onReview,
}: AdminManualPaymentsTableProps) => (
  <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.columns.lead}</TableHead>
          <TableHead>{text.columns.student}</TableHead>
          <TableHead>{text.columns.amount}</TableHead>
          <TableHead>{text.columns.status}</TableHead>
          <TableHead>{text.columns.submittedAt}</TableHead>
          <TableHead className="text-right">{text.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : submissions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          submissions.map((submission) => {
            const profile = profileById[submission.student_id];
            const lead = leadById[submission.lead_id];
            const blocked = Boolean(lead?.manual_payment_blocked_at);
            const status = submission.status as ManualPaymentSubmissionStatus;

            return (
              <TableRow key={submission.id} className="align-top">
                <TableCell className="min-w-[220px]">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{lead?.name || text.noLead}</p>
                    <p className="text-xs text-muted-foreground">{lead?.email || "—"}</p>
                    {blocked ? (
                      <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
                        <ShieldOff size={12} />
                        {text.actions.block}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {getManualPaymentStudentLabel(profile, submission.sender_phone, text.noStudent)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.email || submission.sender_phone || "—"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">
                      {amountFormatter.format(submission.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{submission.currency}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      statusToneClass(status),
                    )}
                  >
                    {text.statuses[status] ?? status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(submission.created_at))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant={status === "pending_review" ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => onReview(submission)}
                    >
                      {text.actions.view}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  </div>
);
