import { Check, CreditCard, Smartphone } from "lucide-react";

import { CinetpayPayment } from "@/components/checkout/CinetpayPayment";
import ManualOrangeMoneyPayment from "@/components/checkout/ManualOrangeMoneyPayment";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckoutIdentity, PaymentMethod } from "@/lib/checkout";
import type {
  CheckoutPaymentMode,
  ManualOrangeMoneyInstructions,
} from "@/lib/checkout-settings";

interface CheckoutPaymentPanelProps {
  identity: CheckoutIdentity | null;
  leadId: string | null;
  paymentMethod: PaymentMethod;
  paymentMode: CheckoutPaymentMode;
  manualOrangeMoney: ManualOrangeMoneyInstructions;
  text: {
    methods: {
      mobileMoney: { title: string };
      card: { title: string };
    };
    paymentDetails: {
      card: { title: string };
      mobileMoney: { title: string };
    };
    selectPayment: string;
    terms: string;
  };
  userEmail: string | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;
}

export const CheckoutPaymentPanel = ({
  identity,
  leadId,
  paymentMethod,
  paymentMode,
  manualOrangeMoney,
  text,
  userEmail,
  onPaymentMethodChange,
}: CheckoutPaymentPanelProps) => {
  if (paymentMode === "manual_orange_money") {
    return (
      <Card className="border-white/70 bg-white/94 shadow-strong">
        <CardContent className="space-y-5 p-6 pt-6 md:pt-6">
          <ManualOrangeMoneyPayment
            leadId={leadId}
            userEmail={userEmail}
            instructions={manualOrangeMoney}
          />
          <p className="text-center text-xs leading-6 text-muted-foreground">{text.terms}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/70 bg-white/94 shadow-strong">
      <CardContent className="space-y-5 p-6 pt-6 md:pt-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {text.selectPayment}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("mobile_money")}
              className={cn(
                "rounded-[1.35rem] border p-4 text-left transition-all duration-300",
                paymentMethod === "mobile_money"
                  ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                  : "border-border/70 bg-white/68 shadow-soft hover:border-primary/18 hover:shadow-medium",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{text.methods.mobileMoney.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">CinetPay · MTN · Orange</p>
                  </div>
                </div>
                {paymentMethod === "mobile_money" ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPaymentMethodChange("card")}
              className={cn(
                "rounded-[1.35rem] border p-4 text-left transition-all duration-300",
                paymentMethod === "card"
                  ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                  : "border-border/70 bg-white/68 shadow-soft hover:border-primary/18 hover:shadow-medium",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{text.methods.card.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">CinetPay · Visa · Mastercard</p>
                  </div>
                </div>
                {paymentMethod === "card" ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4 md:p-5">
          {paymentMethod === "card" ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">{text.paymentDetails.card.title}</h3>
              <CinetpayPayment
                leadId={leadId}
                paymentMethod="card"
                userEmail={userEmail}
                identity={{
                  firstName: identity?.first_name || "",
                  lastName: identity?.last_name || "",
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">{text.paymentDetails.mobileMoney.title}</h3>
              <CinetpayPayment
                leadId={leadId}
                paymentMethod="mobile_money"
                userEmail={userEmail}
                identity={{
                  firstName: identity?.first_name || "",
                  lastName: identity?.last_name || "",
                }}
              />
            </div>
          )}
        </div>

        <p className="text-center text-xs leading-6 text-muted-foreground">{text.terms}</p>
      </CardContent>
    </Card>
  );
};
