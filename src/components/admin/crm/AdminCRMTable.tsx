import { ExternalLink, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminCRMStudent, AdminCRMText, getPaymentFilterState } from "@/lib/admin-crm";
import { getStudentDisplayName, getStudentProfileReviewStatus } from "@/lib/student-profile";
import { cn } from "@/lib/utils";

interface AdminCRMTableProps {
  applicationStatusLabels: Record<string, string>;
  applicationStatuses: string[];
  isLoading: boolean;
  onEdit: (student: AdminCRMStudent) => void;
  onOpenStudent: (student: AdminCRMStudent) => void;
  onUpdateStatus: (appId: string, newStatus: string) => void;
  students: AdminCRMStudent[];
  text: AdminCRMText;
}

type ProfileReviewStatus = "validated" | "correction_requested" | "pending";

const profileBadgeClass = (status: ProfileReviewStatus) =>
  status === "validated"
    ? "border-success/20 bg-success/5 text-success"
    : "border-warning/30 bg-warning/10 text-warning";

const profileBadgeLabel = (status: ProfileReviewStatus, text: AdminCRMText) =>
  status === "validated"
    ? text.profileValidated
    : status === "correction_requested"
      ? text.profileCorrectionRequested
      : text.profilePendingValidation;

const paymentBadgeClass = (state: ReturnType<typeof getPaymentFilterState>) => {
  if (state === "paid") return "border-success/20 bg-success/5 text-success";
  if (state === "pending") return "border-warning/30 bg-warning/10 text-warning";
  if (state === "refunded") return "border-secondary/40 bg-secondary/20 text-foreground";
  return "border-border/40 bg-secondary/20 text-muted-foreground";
};

export const AdminCRMTable = ({
  applicationStatusLabels,
  applicationStatuses,
  isLoading,
  onEdit,
  onOpenStudent,
  onUpdateStatus,
  students,
  text,
}: AdminCRMTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-white py-20 text-center shadow-soft">
        <Loader2 className="mx-auto animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-white py-20 text-center italic text-muted-foreground shadow-soft">
        {text.empty}
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="admin-table hidden overflow-hidden rounded-2xl border border-border/40 bg-white shadow-soft md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">{text.columns.student}</TableHead>
              <TableHead>{text.columns.target}</TableHead>
              <TableHead>{text.columns.currentStatus}</TableHead>
              <TableHead>{text.columns.payment}</TableHead>
              <TableHead>{text.columns.documents}</TableHead>
              <TableHead className="text-right">{text.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const displayName = getStudentDisplayName(student.profile, student.email);
              const profileReviewStatus = getStudentProfileReviewStatus(student.profile);
              const paymentState = getPaymentFilterState(student);
              const latestTransaction = student.paymentSummary.latestTransaction;

              return (
                <TableRow key={student.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {displayName.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{displayName || text.newStudent}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                        <p
                          className={cn(
                            "mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                            profileBadgeClass(profileReviewStatus),
                          )}
                        >
                          {profileBadgeLabel(profileReviewStatus, text)}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="text-sm font-medium">{student.profile?.target_country || "-"}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {student.profile?.target_program || "-"}
                    </p>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={student.application?.status}
                      onValueChange={(value) => {
                        if (student.application?.id) {
                          onUpdateStatus(student.application.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-[200px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {applicationStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {applicationStatusLabels[status] || status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <p
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                          paymentBadgeClass(paymentState),
                        )}
                      >
                        {text.paymentStates[paymentState]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.paymentSummary.total > 0
                          ? `${student.paymentSummary.total} ${text.sheet.transactionCount.toLowerCase()}`
                          : text.sheet.noTransactions}
                      </p>
                      {latestTransaction ? (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {latestTransaction.channel} · {latestTransaction.amount} {latestTransaction.currency}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {student.documentSummary.total} {text.sheet.totalDocuments.toLowerCase()}
                      </p>
                      <p>{`${student.documentSummary.pending} ${text.sheet.documentsPending.toLowerCase()}`}</p>
                      <p>{`${student.documentSummary.approved} ${text.sheet.documentsApproved.toLowerCase()}`}</p>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(student)} className="gap-2 text-primary">
                        <Pencil size={16} />
                        {text.edit}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onOpenStudent(student)} className="gap-2">
                        <ExternalLink size={16} />
                        {text.openStudent}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {students.map((student) => {
          const displayName = getStudentDisplayName(student.profile, student.email);
          const profileReviewStatus = getStudentProfileReviewStatus(student.profile);
          const paymentState = getPaymentFilterState(student);

          return (
            <div
              key={student.id}
              className="rounded-xl border border-border/40 bg-white p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {displayName.charAt(0).toUpperCase() || "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {displayName || text.newStudent}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    profileBadgeClass(profileReviewStatus),
                  )}
                >
                  {profileBadgeLabel(profileReviewStatus, text)}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    paymentBadgeClass(paymentState),
                  )}
                >
                  {text.paymentStates[paymentState]}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {text.columns.target}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {student.profile?.target_country || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {text.columns.documents}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {student.documentSummary.total} · {student.documentSummary.pending}{" "}
                    {text.sheet.documentsPending.toLowerCase()}
                  </dd>
                </div>
              </dl>

              <div className="mt-3">
                <Select
                  value={student.application?.status}
                  onValueChange={(value) => {
                    if (student.application?.id) {
                      onUpdateStatus(student.application.id, value);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {applicationStatusLabels[status] || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 flex gap-2 border-t border-border/30 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(student)}
                  className="h-8 flex-1 gap-1.5 text-primary"
                >
                  <Pencil size={14} />
                  {text.edit}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenStudent(student)}
                  className="h-8 flex-1 gap-1.5"
                >
                  <ExternalLink size={14} />
                  {text.openStudent}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
