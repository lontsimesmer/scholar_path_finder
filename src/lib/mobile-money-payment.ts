import { buildInternationalPhoneNumber } from "@/lib/phone-number";

export interface MobileMoneyPaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

export interface CurrencyOption {
  code: string;
  rate: number;
  amount: string;
}

export interface MobileMoneyProviderConfig {
  id: "mtn" | "orange";
  name: string;
  account: string;
}

export type MobileMoneyProviderId = MobileMoneyProviderConfig["id"];
export type MobileMoneyProviderSelection = MobileMoneyProviderId | "";
export type MobileMoneyStatus = "idle" | "pending" | "success" | "failed";

export const MOBILE_MONEY_PROVIDERS: MobileMoneyProviderConfig[] = [
  { id: "mtn", name: "MTN Mobile Money", account: "651831709" },
  { id: "orange", name: "Orange Money", account: "690830651" },
];

export const DEFAULT_MOBILE_MONEY_CURRENCY = "XAF";
export const DEFAULT_MOBILE_MONEY_AMOUNT = "15625";

export const formatMobileMoneyPhoneNumber = (countryCode: string, phoneNumber: string) => {
  const trimmedPhoneNumber = phoneNumber.replace(/\s+/g, "").replace(/^0+/, "");
  return buildInternationalPhoneNumber(countryCode, trimmedPhoneNumber);
};

export const getCurrencyAmount = (currencies: CurrencyOption[], code: string) => {
  return currencies.find((item) => item.code === code)?.amount ?? DEFAULT_MOBILE_MONEY_AMOUNT;
};
