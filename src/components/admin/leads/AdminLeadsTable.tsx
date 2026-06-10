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
  AdminLeadsText,
  LeadRecord,
  getAdminLeadPaymentBadgeClassName,
  getAdminLeadPaymentLabel,
  getAdminLeadPipelineLabel,
} from "@/lib/admin-leads";
import { cn } from "@/lib/utils";

type AdminLeadsTableProps = {
  isLoading: boolean;
  leads: LeadRecord[];
  text: AdminLeadsText;
  dateFormatter: Intl.DateTimeFormat;
};

export function AdminLeadsTable({ isLoading, leads, text, dateFormatter }: AdminLeadsTableProps) {
  return (
    <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{text.columns.contact}</TableHead>
            <TableHead>{text.columns.message}</TableHead>
            <TableHead>{text.columns.payment}</TableHead>
            <TableHead>{text.columns.pipeline}</TableHead>
            <TableHead>{text.columns.createdAt}</TableHead>
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
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                {text.empty}
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id} className="align-top">
                <TableCell className="min-w-[250px]">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone || text.noPhone}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{lead.message || text.noMessage}</p>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                        getAdminLeadPaymentBadgeClassName(lead.payment_status),
                      )}
                    >
                      {getAdminLeadPaymentLabel(text, lead.payment_status)}
                    </span>
                    <p className="text-xs text-muted-foreground">{lead.payment_id || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-foreground">
                    {getAdminLeadPipelineLabel(text, lead.status)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(lead.created_at))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link to={`/checkout?leadId=${encodeURIComponent(lead.id)}&email=${encodeURIComponent(lead.email)}`}>
                        {text.openCheckout}
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
