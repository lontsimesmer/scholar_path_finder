import { ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

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
  AdminPaymentsText,
  LeadRecord,
  PaymentTransactionRecord,
  StudentProfileLite,
  failedLocalStatuses,
  getPaymentStudentLabel,
  pendingLocalStatuses,
} from "@/lib/admin-payments";
import { cn } from "@/lib/utils";

interface AdminPaymentsTableProps {
  amountFormatter: Intl.NumberFormat;
  dateFormatter: Intl.DateTimeFormat;
  filteredTransactions: PaymentTransactionRecord[];
  isLoading: boolean;
  leadById: Record<string, LeadRecord>;
  noStudentLabel: string;
  onOpenPaymentUrl: (url: string) => void;
  profileById: Record<string, StudentProfileLite>;
  text: AdminPaymentsText;
}

export const AdminPaymentsTable = ({
  amountFormatter,
  dateFormatter,
  filteredTransactions,
  isLoading,
  leadById,
  noStudentLabel,
  onOpenPaymentUrl,
  profileById,
  text,
}: AdminPaymentsTableProps) => (
  <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.columns.transaction}</TableHead>
          <TableHead>{text.columns.student}</TableHead>
          <TableHead>{text.columns.amount}</TableHead>
          <TableHead>{text.columns.status}</TableHead>
          <TableHead>{text.columns.context}</TableHead>
          <TableHead>{text.columns.createdAt}</TableHead>
          <TableHead className="text-right">{text.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={7} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : filteredTransactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          filteredTransactions.map((transaction) => {
            const profile = profileById[transaction.student_id];
            const lead = leadById[transaction.lead_id];

            return (
              <TableRow key={transaction.id} className="align-top">
                <TableCell className="min-w-[220px]">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{transaction.transaction_id}</p>
                    <p className="text-xs text-muted-foreground">{transaction.provider_status || "—"}</p>
                  </div>
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {getPaymentStudentLabel(profile, transaction.customer_email, noStudentLabel)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.email || transaction.customer_email || text.noStudent}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">
                      {amountFormatter.format(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{transaction.currency}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                        transaction.local_status === "accepted"
                          ? "border-success/20 bg-success/5 text-success"
                          : pendingLocalStatuses.includes(transaction.local_status)
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : failedLocalStatuses.includes(transaction.local_status)
                              ? "border-destructive/20 bg-destructive/5 text-destructive"
                              : "border-border/50 bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {text.localStatuses[transaction.local_status] || transaction.local_status}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {text.channels[transaction.channel] || transaction.channel}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{lead?.name || text.noLead}</p>
                    <p>{lead?.email || "—"}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(transaction.created_at))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {lead ? (
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link
                          to={`/checkout?leadId=${encodeURIComponent(lead.id)}&email=${encodeURIComponent(lead.email)}`}
                        >
                          {text.openCheckout}
                        </Link>
                      </Button>
                    ) : null}
                    {transaction.payment_url ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onOpenPaymentUrl(transaction.payment_url!)}
                      >
                        <ExternalLink size={16} />
                      </Button>
                    ) : null}
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
