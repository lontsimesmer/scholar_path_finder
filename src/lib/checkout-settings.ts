export type CheckoutPricingSettings = {
  amountXaf: number;
  currency: "XAF";
  usdReference: number;
  formattedAmount: string;
};

export const DEFAULT_CHECKOUT_PRICING: CheckoutPricingSettings = {
  amountXaf: 15625,
  currency: "XAF",
  usdReference: 25,
  formattedAmount: "15 625",
};

export const formatCheckoutAmountXaf = (amountXaf: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(amountXaf)
    .replace(/\u202f/g, " ");

export const parseCheckoutAmountInput = (value: string) => {
  const normalized = value.replace(/\s/g, "");

  if (!/^\d+$/.test(normalized)) {
    throw new Error("invalid_amount");
  }

  const amount = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount % 5 !== 0) {
    throw new Error("invalid_amount");
  }

  return amount;
};
