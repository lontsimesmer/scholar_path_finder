import * as React from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";

interface StripePaymentProps {
  leadId: string | null;
}

const logger = createLogger("StripePayment");

export const StripePayment = ({ leadId }: StripePaymentProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePayment = async () => {
    if (!leadId) {
      logger.warn("Card payment attempted without a lead identifier");
      toast({
        title: t.checkout.payment.missingLeadTitle,
        description: t.checkout.payment.missingLeadDescription,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    logger.info("Creating Stripe checkout session", { leadId });

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { leadId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error(t.checkout.payment.noCheckoutUrlReceived);
      }

      logger.info("Stripe checkout session created, redirecting", { leadId });
      window.location.assign(data.url);
    } catch (error: unknown) {
      logger.error("Stripe checkout creation failed", {
        leadId,
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
    <div className="space-y-5">
      <div className="rounded-[1.35rem] border border-border/70 bg-white/72 p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t.checkout.payment.stripeTitle}</p>
            <p className="text-sm text-muted-foreground">{t.checkout.payment.stripeSubtitle}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["Visa", "Mastercard", "Amex"].map((brand) => (
            <span
              key={brand}
              className="rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {brand}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-primary/10 bg-primary/6 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            {t.checkout.payment.stripeHelper}
          </p>
        </div>
      </div>

      <Button onClick={handlePayment} disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            {t.checkout.payment.redirecting}
          </>
        ) : (
          <>
            <CreditCard className="mr-2" size={18} />
            {t.checkout.payment.payWithCard}
          </>
        )}
      </Button>
    </div>
  );
};
