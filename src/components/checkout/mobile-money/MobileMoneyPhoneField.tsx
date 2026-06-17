import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MobileMoneyPhoneFieldProps = {
  countryCode: string;
  phoneNumber: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHelper: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
};

export function MobileMoneyPhoneField({
  countryCode,
  phoneNumber,
  phoneLabel,
  phonePlaceholder,
  phoneHelper,
  onCountryCodeChange,
  onPhoneNumberChange,
}: MobileMoneyPhoneFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
        {phoneLabel}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CountryCodeSelect value={countryCode} onValueChange={onCountryCodeChange} />
        <Input
          id="phone"
          type="tel"
          placeholder={phonePlaceholder}
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value)}
          className="h-12 flex-1"
        />
      </div>
      <p className="text-xs leading-6 text-muted-foreground">{phoneHelper}</p>
    </div>
  );
}
