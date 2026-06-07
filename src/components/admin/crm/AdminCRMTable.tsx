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

export const AdminCRMTable = ({
  applicationStatusLabels,
  applicationStatuses,
  isLoading,
  onEdit,
  onOpenStudent,
  onUpdateStatus,
  students,
  text,
}: AdminCRMTableProps) => (
  <div className="overflow-hidden rounded-[2rem] border border-border/40 bg-white shadow-strong">
    <Table>
      <TableHeader className="bg-secondary/30">
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
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-20 text-center italic text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          students.map((student) => {
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
                      {profileReviewStatus === "validated" ? (
                        <p className="mt-2 inline-flex rounded-full border border-success/20 bg-success/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                          {text.profileValidated}
                        </p>
                      ) : profileReviewStatus === "correction_requested" ? (
                        <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                          {text.profileCorrectionRequested}
                        </p>
                      ) : (
                        <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                          {text.profilePendingValidation}
                        </p>
                      )}
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
                        paymentState === "paid"
                          ? "border-success/20 bg-success/5 text-success"
                          : paymentState === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : paymentState === "refunded"
                              ? "border-secondary/40 bg-secondary/20 text-foreground"
                              : "border-border/40 bg-secondary/20 text-muted-foreground",
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
          })
        )}
      </TableBody>
    </Table>
  </div>
);
