import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+237", country: "CM", flag: "🇨🇲" },
  { code: "+234", country: "NG", flag: "🇳🇬" },
  { code: "+254", country: "KE", flag: "🇰🇪" },
  { code: "+27", country: "ZA", flag: "🇿🇦" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+52", country: "MX", flag: "🇲🇽" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+32", country: "BE", flag: "🇧🇪" },
  { code: "+41", country: "CH", flag: "🇨🇭" },
  { code: "+43", country: "AT", flag: "🇦🇹" },
  { code: "+48", country: "PL", flag: "🇵🇱" },
  { code: "+46", country: "SE", flag: "🇸🇪" },
  { code: "+47", country: "NO", flag: "🇳🇴" },
  { code: "+45", country: "DK", flag: "🇩🇰" },
  { code: "+358", country: "FI", flag: "🇫🇮" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+90", country: "TR", flag: "🇹🇷" },
  { code: "+966", country: "SA", flag: "🇸🇦" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+20", country: "EG", flag: "🇪🇬" },
  { code: "+212", country: "MA", flag: "🇲🇦" },
  { code: "+225", country: "CI", flag: "🇨🇮" },
  { code: "+221", country: "SN", flag: "🇸🇳" },
];

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const CountryCodeSelect = ({ value, onValueChange }: CountryCodeSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[100px] h-12">
        <SelectValue placeholder="Code" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{country.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
