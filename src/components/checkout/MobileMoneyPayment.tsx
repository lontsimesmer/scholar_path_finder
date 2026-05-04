import { Clock, Smartphone } from "lucide-react";

import { MobileMoneyCurrencyField } from "@/components/checkout/mobile-money/MobileMoneyCurrencyField";
import { MobileMoneyPhoneField } from "@/components/checkout/mobile-money/MobileMoneyPhoneField";
import { MobileMoneyProviderSelector } from "@/components/checkout/mobile-money/MobileMoneyProviderSelector";
import { MobileMoneyStatusAlert } from "@/components/checkout/mobile-money/MobileMoneyStatusAlert";
import { MobileMoneySummaryCard } from "@/components/checkout/mobile-money/MobileMoneySummaryCard";
import { Button } from "@/components/ui/button";
import { useMobileMoneyPayment } from "@/hooks/use-mobile-money-payment";
import { MobileMoneyPaymentProps } from "@/lib/mobile-money-payment";

export const MobileMoneyPayment = ({ leadId, onSuccess }: MobileMoneyPaymentProps) => {
  const {
    t,
    provider,
    countryCode,
    phoneNumber,
    currency,
    currencies,
    selectedProvider,
    displayedAccount,
    paymentStatus,
    localAmount,
    statusMessage,
    manualVerification,
    transactionRef,
    isProcessing,
    isCheckingStatus,
    canSubmit,
    setProvider,
    setCountryCode,
    setPhoneNumber,
    setCurrency,
    handleSubmit,
    handleCheckStatus,
  } = useMobileMoneyPayment({ leadId, onSuccess });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <MobileMoneyProviderSelector
        provider={provider}
        providerLabel={t.checkout.payment.providerLabel}
        mtnHelper={t.checkout.payment.mtnHelper}
        orangeHelper={t.checkout.payment.orangeHelper}
        onProviderChange={setProvider}
      />

      {provider === "mtn" ? (
        <MobileMoneyCurrencyField
          currency={currency}
          currencies={currencies}
          currencyLabel={t.checkout.payment.currencyLabel}
          selectCurrencyLabel={t.checkout.payment.selectCurrency}
          onCurrencyChange={setCurrency}
        />
      ) : null}

      {selectedProvider ? (
        <MobileMoneySummaryCard
          provider={selectedProvider}
          displayedAccount={displayedAccount}
          sendToLabel={t.checkout.payment.sendTo}
          amountLabel={t.checkout.payment.amount}
          localAmount={localAmount}
          currency={currency}
        />
      ) : null}

      <MobileMoneyPhoneField
        countryCode={countryCode}
        phoneNumber={phoneNumber}
        phoneLabel={t.checkout.payment.phoneLabel}
        phonePlaceholder={t.checkout.payment.phonePlaceholder}
        phoneHelper={t.checkout.payment.phoneHelper}
        onCountryCodeChange={setCountryCode}
        onPhoneNumberChange={setPhoneNumber}
      />

      <MobileMoneyStatusAlert
        paymentStatus={paymentStatus}
        statusMessage={statusMessage}
        manualVerification={manualVerification}
        transactionRef={transactionRef}
        isCheckingStatus={isCheckingStatus}
        pendingTitle={t.checkout.payment.pendingTitle}
        pendingMessage={t.checkout.payment.pendingMessage}
        successTitle={t.checkout.payment.successTitle}
        checkStatusLabel={t.checkout.payment.checkStatus}
        onCheckStatus={handleCheckStatus}
      />

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isProcessing ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            {t.checkout.payment.processing}
          </>
        ) : paymentStatus === "pending" ? (
          <>
            <Clock className="mr-2 h-4 w-4" />
            {manualVerification ? t.checkout.payment.awaitingVerification : t.checkout.payment.pendingMessage}
          </>
        ) : (
          <>
            <Smartphone className="mr-2 h-4 w-4" />
            {provider === "mtn" ? t.checkout.payment.requestPayment : t.checkout.payment.confirmManual}
          </>
        )}
      </Button>
    </form>
  );
};
