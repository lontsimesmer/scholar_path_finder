import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminManualPaymentsText } from "@/lib/admin-manual-payments";

interface AdminManualPaymentsFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  text: AdminManualPaymentsText;
}

const STATUS_OPTIONS = ["pending_review", "approved", "rejected", "cancelled"] as const;

export const AdminManualPaymentsFilters = ({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  text,
}: AdminManualPaymentsFiltersProps) => (
  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={text.filters.searchPlaceholder}
        className="pl-9"
      />
    </div>

    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
      <SelectTrigger>
        <SelectValue placeholder={text.filters.status} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{text.filters.all}</SelectItem>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {text.statuses[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
