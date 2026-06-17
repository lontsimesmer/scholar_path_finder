import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyOption } from "@/lib/mobile-money-payment";

type MobileMoneyCurrencyFieldProps = {
  currency: string;
  currencies: CurrencyOption[];
  currencyLabel: string;
  selectCurrencyLabel: string;
  onCurrencyChange: (currency: string) => void;
};

export function MobileMoneyCurrencyField({
  currency,
  currencies,
  currencyLabel,
  selectCurrencyLabel,
  onCurrencyChange,
}: MobileMoneyCurrencyFieldProps) {
  if (currencies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{currencyLabel}</Label>
      <Select value={currency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder={selectCurrencyLabel} />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.code} - {item.amount} (~$25 USD)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
