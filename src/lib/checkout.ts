export type PaymentMethod = "card" | "mobile_money";

export type CheckoutIdentity = {
  first_name: string | null;
  last_name: string | null;
};

export interface CheckoutPaymentText {
  cinetpayCardSubtitle: string;
  cinetpayCardHelper: string;
  cinetpayMobileMoneySubtitle: string;
  cinetpayMobileMoneyHelper: string;
}

export interface CheckoutViewModel {
  identity: CheckoutIdentity | null;
  isLoading: boolean;
  leadId: string | null;
  paymentMethod: PaymentMethod;
  user: { email?: string } | null;
}
