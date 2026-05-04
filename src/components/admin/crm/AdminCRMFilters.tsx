import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminCRMText,
  DocumentFilterValue,
  PaymentFilterValue,
  ProfileFilterValue,
  documentFilterValues,
  paymentFilterValues,
  profileFilterValues,
} from "@/lib/admin-crm";

interface AdminCRMFiltersProps {
  applicationStatusLabels: Record<string, string>;
  applicationStatuses: string[];
  countryFilter: string;
  documentFilter: DocumentFilterValue | "all";
  paymentFilter: PaymentFilterValue | "all";
  profileFilter: ProfileFilterValue | "all";
  searchQuery: string;
  setCountryFilter: (value: string) => void;
  setDocumentFilter: (value: DocumentFilterValue | "all") => void;
  setPaymentFilter: (value: PaymentFilterValue | "all") => void;
  setProfileFilter: (value: ProfileFilterValue | "all") => void;
  setSearchQuery: (value: string) => void;
  setStatusFilter: (value: string) => void;
  statusFilter: string;
  targetCountries: string[];
  text: AdminCRMText;
}

export const AdminCRMFilters = ({
  applicationStatusLabels,
  applicationStatuses,
  countryFilter,
  documentFilter,
  paymentFilter,
  profileFilter,
  searchQuery,
  setCountryFilter,
  setDocumentFilter,
  setPaymentFilter,
  setProfileFilter,
  setSearchQuery,
  setStatusFilter,
  statusFilter,
  targetCountries,
  text,
}: AdminCRMFiltersProps) => (
  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-6">
    <div className="space-y-2 xl:col-span-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.columns.student}
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={text.searchPlaceholder}
          className="h-12 rounded-xl border-border/40 bg-white pl-10"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.status}
      </p>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{text.filters.all}</SelectItem>
          {applicationStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {applicationStatusLabels[status] || status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.profile}
      </p>
      <Select value={profileFilter} onValueChange={(value) => setProfileFilter(value as ProfileFilterValue | "all")}>
        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {profileFilterValues.map((value) => (
            <SelectItem key={value} value={value}>
              {text.profileStates[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.payment}
      </p>
      <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilterValue | "all")}>
        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentFilterValues.map((value) => (
            <SelectItem key={value} value={value}>
              {text.paymentStates[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.documents}
      </p>
      <Select value={documentFilter} onValueChange={(value) => setDocumentFilter(value as DocumentFilterValue | "all")}>
        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {documentFilterValues.map((value) => (
            <SelectItem key={value} value={value}>
              {text.documentStates[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.filters.country}
      </p>
      <Select value={countryFilter} onValueChange={setCountryFilter}>
        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{text.filters.all}</SelectItem>
          {targetCountries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);
