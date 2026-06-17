import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import type { CinetPayCheckoutSettings } from "./cinetpay.ts";

export type CheckoutPricing = {
  amountXaf: number;
  currency: "XAF";
  usdReference: number;
  formattedAmount: string;
};

type CheckoutPriceSettingValue = {
  amount_xaf?: unknown;
  currency?: unknown;
  usd_reference?: unknown;
};

const CONSULTATION_PRICE_KEY = "checkout.consultation_price";
const XAF_AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const parsePositiveInteger = (value: unknown, label: string) => {
  const normalized = typeof value === "number" ? String(value) : String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer`);
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
};

export const parseCheckoutAmountXaf = (value: unknown) => {
  const amount = parsePositiveInteger(value, "Consultation amount");
  if (amount % 5 !== 0) {
    throw new Error("Consultation amount must be a multiple of 5 XAF");
  }

  return amount;
};

export const formatCheckoutAmountXaf = (amountXaf: number) =>
  XAF_AMOUNT_FORMATTER.format(amountXaf).replace(/\u202f/g, " ");

const parseStoredPricing = (
  value: CheckoutPriceSettingValue | null | undefined,
  fallback: CinetPayCheckoutSettings,
): CheckoutPricing => {
  const amountXaf = value?.amount_xaf === undefined
    ? fallback.consultationAmountXaf
    : parseCheckoutAmountXaf(value.amount_xaf);
  const usdReference = value?.usd_reference === undefined
    ? fallback.usdReference
    : parsePositiveInteger(value.usd_reference, "USD reference");

  return {
    amountXaf,
    currency: "XAF",
    usdReference,
    formattedAmount: formatCheckoutAmountXaf(amountXaf),
  };
};

export const getFallbackCheckoutPricing = (fallback: CinetPayCheckoutSettings): CheckoutPricing =>
  parseStoredPricing(null, fallback);

export const getCheckoutPricing = async (
  supabase: SupabaseClient,
  fallback: CinetPayCheckoutSettings,
): Promise<CheckoutPricing> => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", CONSULTATION_PRICE_KEY)
    .maybeSingle();

  if (error || !data) {
    return getFallbackCheckoutPricing(fallback);
  }

  return parseStoredPricing(data.value as CheckoutPriceSettingValue, fallback);
};

export const saveCheckoutPricing = async (
  supabase: SupabaseClient,
  amountXaf: unknown,
  fallback: CinetPayCheckoutSettings,
  updatedBy: string,
): Promise<CheckoutPricing> => {
  const parsedAmountXaf = parseCheckoutAmountXaf(amountXaf);
  const pricing: CheckoutPricing = {
    amountXaf: parsedAmountXaf,
    currency: "XAF",
    usdReference: fallback.usdReference,
    formattedAmount: formatCheckoutAmountXaf(parsedAmountXaf),
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: CONSULTATION_PRICE_KEY,
        value: {
          amount_xaf: pricing.amountXaf,
          currency: pricing.currency,
          usd_reference: pricing.usdReference,
        },
        description: "Consultation checkout price used by CinetPay.",
        updated_by: updatedBy,
      },
      { onConflict: "key" },
    );

  if (error) {
    throw new Error(`Failed to update consultation price: ${error.message}`);
  }

  return pricing;
};
