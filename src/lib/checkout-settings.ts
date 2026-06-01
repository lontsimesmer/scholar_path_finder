export type CheckoutPaymentMode = "cinetpay" | "manual_orange_money";

export type ManualOrangeMoneyInstructions = {
  accountName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  instructionsFr: string;
  instructionsEn: string;
};

export type CheckoutPricingSettings = {
  amountXaf: number;
  currency: "XAF";
  usdReference: number;
  formattedAmount: string;
  paymentMode: CheckoutPaymentMode;
  manualOrangeMoney: ManualOrangeMoneyInstructions;
};

export const DEFAULT_MANUAL_ORANGE_MONEY: ManualOrangeMoneyInstructions = {
  accountName: "PETNJI",
  accountNumber: "+237 698 090 6123",
  amount: 15625,
  currency: "XAF",
  instructionsFr:
    "Composez #150# ou ouvrez l'application Orange Money, envoyez 15 625 XAF au +237 698 090 6123 (PETNJI), puis téléversez la capture du SMS de confirmation.",
  instructionsEn:
    "Dial #150# or open the Orange Money app, send 15,625 XAF to +237 698 090 6123 (PETNJI), then upload the confirmation SMS screenshot.",
};

export const DEFAULT_CHECKOUT_PRICING: CheckoutPricingSettings = {
  amountXaf: 15625,
  currency: "XAF",
  usdReference: 25,
  formattedAmount: "15 625",
  paymentMode: "manual_orange_money",
  manualOrangeMoney: DEFAULT_MANUAL_ORANGE_MONEY,
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
