import { useSearchParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CheckoutHero } from "@/components/checkout/CheckoutHero";
import { CheckoutLoadingState } from "@/components/checkout/CheckoutLoadingState";
import { CheckoutPackageSummary } from "@/components/checkout/CheckoutPackageSummary";
import { CheckoutPaymentPanel } from "@/components/checkout/CheckoutPaymentPanel";
import { useCheckout } from "@/hooks/use-checkout";
import { useCheckoutSettings } from "@/hooks/use-checkout-settings";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import {
  DEFAULT_MANUAL_ORANGE_MONEY,
  type CheckoutPaymentMode,
} from "@/lib/checkout-settings";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { settings: checkoutSettings } = useCheckoutSettings();
  const requestedLeadId = searchParams.get("leadId")?.trim() || null;
  const requestedEmail = searchParams.get("email")?.trim() || "";
  const searchQuery = searchParams.toString();
  const { actions, viewModel } = useCheckout({
    navigate,
    requestedEmail,
    requestedLeadId,
    searchQuery,
    text: {
      profileRequiredDescription: t.checkout.profileRequiredDescription,
      profileRequiredTitle: t.checkout.profileRequiredTitle,
      unavailableDescription: t.checkout.unavailableDescription,
      unavailableTitle: t.checkout.unavailableTitle,
    },
    toast,
  });

  if (viewModel.isLoading) {
    return <CheckoutLoadingState />;
  }

  return (
    <div className="page-shell px-4 py-8">
      <div className="section-container relative z-10 space-y-8">
        <CheckoutHero
          packageTitle={t.checkout.packageTitle}
          signedInAs={t.checkout.signedInAs}
          signOut={t.checkout.signOut}
          subtitle={t.checkout.subtitle}
          title={t.checkout.title}
          titleHighlight={t.checkout.titleHighlight}
          userEmail={viewModel.user?.email}
          onSignOut={actions.handleSignOut}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <CheckoutPackageSummary
            benefits={t.checkout.benefits}
            guaranteeDescription={t.checkout.guaranteeDescription}
            guaranteeTitle={t.checkout.guaranteeTitle}
            includedItems={t.checkout.includedItems}
            includedTitle={t.checkout.whatIncluded}
            packageCurrency={checkoutSettings?.currency ?? t.checkout.packageCurrency}
            packageDescription={t.checkout.packageDescription}
            packagePrice={checkoutSettings?.formattedAmount ?? t.checkout.packagePrice}
            packageTitle={t.checkout.packageTitle}
            questions={t.checkout.questions}
          />

          <CheckoutPaymentPanel
            identity={viewModel.identity}
            leadId={viewModel.leadId}
            paymentMethod={viewModel.paymentMethod}
            paymentMode={
              (checkoutSettings?.paymentMode ?? "manual_orange_money") as CheckoutPaymentMode
            }
            manualOrangeMoney={
              checkoutSettings?.manualOrangeMoney ?? DEFAULT_MANUAL_ORANGE_MONEY
            }
            text={{
              methods: t.checkout.methods,
              paymentDetails: t.checkout.paymentDetails,
              selectPayment: t.checkout.selectPayment,
              terms: t.checkout.terms,
            }}
            userEmail={viewModel.user?.email ?? null}
            onPaymentMethodChange={actions.setPaymentMethod}
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate("/dashboard")} className="rounded-2xl px-6">
            {t.checkout.backToDashboard}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            {t.checkout.backToHome}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
