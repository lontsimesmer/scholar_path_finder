import { BellOff, BellRing, Copy, Loader2, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  MAX_FOLLOW_UP_COUNT,
  canResendFollowUp,
  getAdminLeadPaymentBadgeClassName,
  getAdminLeadPaymentLabel,
  getAdminLeadPipelineLabel,
  isFollowUpPaused,
} from "@/lib/admin-leads";
import { cn } from "@/lib/utils";

type AdminLeadsTableProps = {
  isLoading: boolean;
  leads: LeadRecord[];
  text: AdminLeadsText;
  dateFormatter: Intl.DateTimeFormat;
  isResending: boolean;
  isTogglingPause: boolean;
  selectedIds: Set<string>;
  onCopyCheckoutLink: (lead: LeadRecord) => void;
  onResendFollowUp: (lead: LeadRecord) => void;
  onOpenNotes: (lead: LeadRecord) => void;
  onToggleFollowUpPause: (lead: LeadRecord) => void;
  onToggleSelect: (leadId: string) => void;
  onToggleSelectAll: () => void;
};

export function AdminLeadsTable({
  isLoading,
  leads,
  text,
  dateFormatter,
  isResending,
  isTogglingPause,
  selectedIds,
  onCopyCheckoutLink,
  onResendFollowUp,
  onOpenNotes,
  onToggleFollowUpPause,
  onToggleSelect,
  onToggleSelectAll,
}: AdminLeadsTableProps) {
  const selectableIds = leads.filter((lead) => canResendFollowUp(lead)).map((lead) => lead.id);
  const selectableCount = selectableIds.length;
  const selectedSelectableCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected =
    selectableCount > 0 && selectedSelectableCount === selectableCount;
  const someSelected = selectedSelectableCount > 0 && !allSelected;

  return (
    <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={() => onToggleSelectAll()}
                disabled={selectableCount === 0}
                aria-label={text.bulk.selectAllAria}
              />
            </TableHead>
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
              <TableCell colSpan={7} className="py-20 text-center">
                <Loader2 className="mx-auto animate-spin text-primary" size={32} />
              </TableCell>
            </TableRow>
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                {text.empty}
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id} className="align-top">
                <TableCell className="w-10">
                  <Checkbox
                    checked={selectedIds.has(lead.id)}
                    onCheckedChange={() => onToggleSelect(lead.id)}
                    disabled={!canResendFollowUp(lead)}
                    aria-label={text.bulk.selectRowAria}
                  />
                </TableCell>
                <TableCell className="min-w-[250px]">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone || text.noPhone}</p>
                    {isFollowUpPaused(lead) ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
                        <BellOff className="h-3 w-3" />
                        {text.followUpsPausedBadge}
                      </span>
                    ) : null}
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
                  <div className="flex flex-wrap justify-end gap-2">
                    {(() => {
                      const canResend = canResendFollowUp(lead);
                      const disabledReason = !canResend
                        ? lead.payment_status === "paid"
                          ? text.resendFollowUpTooltipPaid
                          : (lead.follow_up_count ?? 0) >= MAX_FOLLOW_UP_COUNT
                            ? text.resendFollowUpTooltipLimit
                            : undefined
                        : undefined;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={!canResend || isResending}
                          onClick={() => onResendFollowUp(lead)}
                          title={disabledReason}
                        >
                          <Send className="mr-2 h-3.5 w-3.5" />
                          {text.resendFollowUp}
                        </Button>
                      );
                    })()}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onOpenNotes(lead)}
                      title={text.notesButton}
                    >
                      <MessageSquare className="mr-2 h-3.5 w-3.5" />
                      {text.notesButton}
                    </Button>
                    {(() => {
                      const paused = isFollowUpPaused(lead);
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "rounded-xl",
                            paused ? "border-primary/30 text-primary hover:bg-primary/5" : "",
                          )}
                          disabled={isTogglingPause}
                          onClick={() => onToggleFollowUpPause(lead)}
                          title={paused ? text.followUpsResumeButton : text.followUpsPauseButton}
                        >
                          {paused ? (
                            <BellRing className="mr-2 h-3.5 w-3.5" />
                          ) : (
                            <BellOff className="mr-2 h-3.5 w-3.5" />
                          )}
                          {paused ? text.followUpsResumeButton : text.followUpsPauseButton}
                        </Button>
                      );
                    })()}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onCopyCheckoutLink(lead)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      {text.copyCheckoutLink}
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
