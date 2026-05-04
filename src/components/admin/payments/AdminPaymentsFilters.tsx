import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPaymentsText } from "@/lib/admin-payments";

interface AdminPaymentsFiltersProps {
  channelFilter: string;
  onChannelFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  searchQuery: string;
  statusFilter: string;
  text: AdminPaymentsText;
}

export const AdminPaymentsFilters = ({
  channelFilter,
  onChannelFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
  searchQuery,
  statusFilter,
  text,
}: AdminPaymentsFiltersProps) => (
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.status}
      </p>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{text.filters.all}</SelectItem>
          <SelectItem value="initialized">{text.localStatuses.initialized}</SelectItem>
          <SelectItem value="pending">{text.localStatuses.pending}</SelectItem>
          <SelectItem value="accepted">{text.localStatuses.accepted}</SelectItem>
          <SelectItem value="refused">{text.localStatuses.refused}</SelectItem>
          <SelectItem value="failed">{text.localStatuses.failed}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.channel}
      </p>
      <Select value={channelFilter} onValueChange={onChannelFilterChange}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{text.filters.all}</SelectItem>
          <SelectItem value="ALL">{text.channels.ALL}</SelectItem>
          <SelectItem value="MOBILE_MONEY">{text.channels.MOBILE_MONEY}</SelectItem>
          <SelectItem value="CREDIT_CARD">{text.channels.CREDIT_CARD}</SelectItem>
          <SelectItem value="WALLET">{text.channels.WALLET}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);
