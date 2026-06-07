import * as React from "react";
import { CreditCard, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";

type PaymentMethod = "card" | "mobile_money";

type CheckoutIdentity = {
  firstName: string;
  lastName: string;
};

interface CinetpayPaymentProps {
  leadId: string | null;
  paymentMethod: PaymentMethod;
  userEmail?: string | null;
  identity: CheckoutIdentity | null;
}

type CardBillingDetails = {
  phoneNumber: string;
  address: string;
  city: string;
  zipCode: string;
};

const logger = createLogger("CinetpayPayment");

const initialCardBillingDetails: CardBillingDetails = {
  phoneNumber: "",
  address: "",
  city: "",
  zipCode: "",
};

export const CinetpayPayment = ({
  leadId,
  paymentMethod,
  userEmail,
  identity,
}: CinetpayPaymentProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const paymentText = t.checkout.payment as typeof t.checkout.payment & {
    cinetpayCardTitle: string;
    cinetpayCardSubtitle: string;
    cinetpayCardHelper: string;
    cinetpayMobileMoneyTitle: string;
    cinetpayMobileMoneySubtitle: string;
    cinetpayMobileMoneyHelper: string;
    billingTitle: string;
    billingDescription: string;
    cardRequirementsTitle: string;
    cardRequirementsDescription: string;
    cardPhoneLabel: string;
    cardPhonePlaceholder: string;
    cardAddressLabel: string;
    cardAddressPlaceholder: string;
    cardCityLabel: string;
    cardCityPlaceholder: string;
    cardZipCodeLabel: string;
    cardZipCodePlaceholder: string;
    payWithCinetpayCard: string;
    payWithCinetpayMobileMoney: string;
    redirectingToGateway: string;
  };
  const [isLoading, setIsLoading] = React.useState(false);
  const [cardBillingDetails, setCardBillingDetails] =
    React.useState<CardBillingDetails>(initialCardBillingDetails);

  const isCardPayment = paymentMethod === "card";

  const updateBillingField = (field: keyof CardBillingDetails, value: string) => {
    setCardBillingDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const missingCardFields = React.useMemo(
    () =>
      Object.entries(cardBillingDetails)
        .filter(([, value]) => value.trim().length === 0)
        .map(([field]) => field),
    [cardBillingDetails],
  );
  const hasInvalidCardFieldFormat = React.useMemo(() => {
    if (!isCardPayment) {
      return false;
    }

    const phoneDigits = cardBillingDetails.phoneNumber.replace(/\D/g, "");
    const hasInvalidPhone =
      cardBillingDetails.phoneNumber.trim().length > 0 &&
      (phoneDigits.length < 8 || phoneDigits.length > 15);
    const hasInvalidZipCode =
      cardBillingDetails.zipCode.trim().length > 0 && !/^\d{5}$/.test(cardBillingDetails.zipCode.trim());

    return hasInvalidPhone || hasInvalidZipCode;
  }, [cardBillingDetails, isCardPayment]);

  const handlePayment = async () => {
    if (!leadId) {
      logger.warn("CinetPay payment attempted without a lead identifier");
      toast({
        title: t.checkout.payment.missingLeadTitle,
        description: t.checkout.payment.missingLeadDescription,
        variant: "destructive",
      });
      return;
    }

    if (!identity?.firstName || !identity?.lastName || !userEmail) {
      logger.warn("CinetPay payment blocked because the validated profile is incomplete", {
        hasFirstName: Boolean(identity?.firstName),
        hasLastName: Boolean(identity?.lastName),
        hasEmail: Boolean(userEmail),
      });
      toast({
        title: t.checkout.profileRequiredTitle,
        description: t.checkout.profileRequiredDescription,
        variant: "destructive",
      });
      return;
    }

    if (isCardPayment && (missingCardFields.length > 0 || hasInvalidCardFieldFormat)) {
      logger.warn("CinetPay card payment blocked because billing fields are incomplete or invalid", {
        missingCardFields,
        hasInvalidCardFieldFormat,
      });
      toast({
        title: paymentText.cardRequirementsTitle,
        description: paymentText.cardRequirementsDescription,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    logger.info("Creating CinetPay payment", { leadId, paymentMethod });

    try {
      const { data, error } = await supabase.functions.invoke("create-cinetpay-payment", {
        body: {
          leadId,
          channel: isCardPayment ? "CREDIT_CARD" : "MOBILE_MONEY",
          lang: language,
          billingDetails: isCardPayment ? cardBillingDetails : undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.paymentUrl) {
        throw new Error(t.checkout.payment.noCheckoutUrlReceived);
      }

      logger.info("CinetPay payment created, redirecting", {
        leadId,
        paymentMethod,
        transactionId: data.transactionId,
      });

      window.location.assign(data.paymentUrl);
    } catch (error: unknown) {
      logger.error("CinetPay payment creation failed", {
        leadId,
        paymentMethod,
        message: getErrorMessage(error, t.checkout.payment.errorDescription),
      });
      toast({
        title: t.checkout.payment.errorTitle,
        description: error instanceof Error ? error.message : t.checkout.payment.errorDescription,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.25rem] border border-border/60 bg-white/75 p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary">
            {isCardPayment ? (
              <CreditCard className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isCardPayment
                ? paymentText.cinetpayCardTitle
                : paymentText.cinetpayMobileMoneyTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isCardPayment
                ? paymentText.cinetpayCardSubtitle
                : paymentText.cinetpayMobileMoneySubtitle}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(isCardPayment ? ["CinetPay", "Visa", "Mastercard"] : ["CinetPay", "MTN", "Orange", "Express Union"]).map(
            (brand) => (
              <span
                key={brand}
                className="rounded-full border border-border/60 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                {brand}
              </span>
            ),
          )}
        </div>
      </div>

      {isCardPayment ? (
        <div className="space-y-5 rounded-[1.35rem] border border-border/70 bg-secondary/35 p-5 shadow-soft">
          <div>
            <p className="font-semibold text-foreground">{paymentText.billingTitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {paymentText.billingDescription}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cinetpay-phone">{paymentText.cardPhoneLabel}</Label>
              <Input
                id="cinetpay-phone"
                value={cardBillingDetails.phoneNumber}
                onChange={(event) => updateBillingField("phoneNumber", event.target.value)}
                placeholder={paymentText.cardPhonePlaceholder}
                autoComplete="tel"
                inputMode="tel"
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cinetpay-city">{paymentText.cardCityLabel}</Label>
              <Input
                id="cinetpay-city"
                value={cardBillingDetails.city}
                onChange={(event) => updateBillingField("city", event.target.value)}
                placeholder={paymentText.cardCityPlaceholder}
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cinetpay-address">{paymentText.cardAddressLabel}</Label>
            <Input
              id="cinetpay-address"
              value={cardBillingDetails.address}
              onChange={(event) => updateBillingField("address", event.target.value)}
              placeholder={paymentText.cardAddressPlaceholder}
              autoComplete="street-address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cinetpay-zip">{paymentText.cardZipCodeLabel}</Label>
            <Input
              id="cinetpay-zip"
              value={cardBillingDetails.zipCode}
              onChange={(event) => updateBillingField("zipCode", event.target.value)}
              placeholder={paymentText.cardZipCodePlaceholder}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
            <strong className="text-foreground">{userEmail}</strong>
            <span className="mx-2 text-border">•</span>
            {identity.firstName} {identity.lastName}
          </div>
        </div>
      ) : null}

      <Button onClick={handlePayment} disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" size={18} />
            {paymentText.redirectingToGateway}
          </>
        ) : (
          <>
            {isCardPayment ? (
              <CreditCard className="mr-2" size={18} />
            ) : (
              <Smartphone className="mr-2" size={18} />
            )}
            {isCardPayment
              ? paymentText.payWithCinetpayCard
              : paymentText.payWithCinetpayMobileMoney}
          </>
        )}
      </Button>
    </div>
  );
};
