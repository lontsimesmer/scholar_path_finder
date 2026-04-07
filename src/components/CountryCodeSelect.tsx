import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/lib/country-codes";

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const CountryCodeSelect = ({ value, onValueChange }: CountryCodeSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-12 w-full rounded-2xl sm:w-[116px]">
        <SelectValue placeholder="Code" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {country.country}
              </span>
              <span>{country.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
