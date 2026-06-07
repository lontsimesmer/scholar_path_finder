import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLeadsText } from "@/lib/admin-leads";

type AdminLeadsFiltersProps = {
  searchQuery: string;
  paymentFilter: string;
  pipelineFilter: string;
  text: AdminLeadsText;
  onSearchQueryChange: (query: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onPipelineFilterChange: (value: string) => void;
};

export function AdminLeadsFilters({
  searchQuery,
  paymentFilter,
  pipelineFilter,
  text,
  onSearchQueryChange,
  onPaymentFilterChange,
  onPipelineFilterChange,
}: AdminLeadsFiltersProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={text.searchPlaceholder}
          className="h-12 rounded-xl border-border/40 bg-white pl-10"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{text.filters.payment}</p>
        <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{text.filters.all}</SelectItem>
            <SelectItem value="unpaid">{text.paymentStatuses.unpaid}</SelectItem>
            <SelectItem value="pending">{text.paymentStatuses.pending}</SelectItem>
            <SelectItem value="mobile_money_pending">{text.paymentStatuses.mobile_money_pending}</SelectItem>
            <SelectItem value="bank_transfer_pending">{text.paymentStatuses.bank_transfer_pending}</SelectItem>
            <SelectItem value="paid">{text.paymentStatuses.paid}</SelectItem>
            <SelectItem value="refunded">{text.paymentStatuses.refunded}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{text.filters.pipeline}</p>
        <Select value={pipelineFilter} onValueChange={onPipelineFilterChange}>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{text.filters.all}</SelectItem>
            <SelectItem value="pending">{text.pipelineStatuses.pending}</SelectItem>
            <SelectItem value="paid">{text.pipelineStatuses.paid}</SelectItem>
            <SelectItem value="follow_up">{text.pipelineStatuses.follow_up}</SelectItem>
            <SelectItem value="completed">{text.pipelineStatuses.completed}</SelectItem>
            <SelectItem value="expired">{text.pipelineStatuses.expired}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
