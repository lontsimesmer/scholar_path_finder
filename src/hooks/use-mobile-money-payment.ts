import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import {
  CurrencyOption,
  DEFAULT_MOBILE_MONEY_AMOUNT,
  DEFAULT_MOBILE_MONEY_CURRENCY,
  MOBILE_MONEY_PROVIDERS,
  MobileMoneyProviderSelection,
  MobileMoneyStatus,
  formatMobileMoneyPhoneNumber,
  getCurrencyAmount,
} from "@/lib/mobile-money-payment";
import {
  checkMTNPaymentStatus,
  fetchMTNCurrencies,
  requestMTNPayment,
  requestOrangePayment,
} from "@/lib/mobile-money-payment-service";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("MobileMoneyPayment");

const MTN_POLL_DELAY_MS = 10000;
const MTN_INITIAL_POLL_DELAY_MS = 5000;
const MTN_MAX_POLL_ATTEMPTS = 12;

type UseMobileMoneyPaymentParams = {
  leadId: string | null;
  onSuccess: () => void;
};

export function useMobileMoneyPayment({ leadId, onSuccess }: UseMobileMoneyPaymentParams) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<MobileMoneyProviderSelection>("");
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_MOBILE_MONEY_CURRENCY);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<MobileMoneyStatus>("idle");
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [localAmount, setLocalAmount] = useState(DEFAULT_MOBILE_MONEY_AMOUNT);
  const [targetAccount, setTargetAccount] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manualVerification, setManualVerification] = useState(false);

  const pollTimeoutRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);

  const selectedProvider = useMemo(
    () => MOBILE_MONEY_PROVIDERS.find((item) => item.id === provider),
    [provider],
  );
  const displayedAccount = targetAccount || selectedProvider?.account || null;

  const clearPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const resetPaymentState = useCallback(() => {
    clearPollTimeout();
    pollAttemptsRef.current = 0;
    setPaymentStatus("idle");
    setTransactionRef(null);
    setTargetAccount(null);
    setStatusMessage(null);
    setManualVerification(false);
  }, [clearPollTimeout]);
  useEffect(() => {
    const fetchCurrencies = async () => {
      logger.info("Loading MTN currency options");

      try {
        const data = await fetchMTNCurrencies();

        if (!data?.currencies) {
          logger.warn("MTN currency request returned no currencies");
          return;
        }

        setCurrencies(data.currencies);
        setLocalAmount(getCurrencyAmount(data.currencies, DEFAULT_MOBILE_MONEY_CURRENCY));
        logger.info("MTN currency options loaded", { count: data.currencies.length });
      } catch (error: unknown) {
        logger.error("Failed to load MTN currencies", {
          message: getErrorMessage(error),
        });
      }
    };

    void fetchCurrencies();
  }, []);
  useEffect(() => {
    setLocalAmount(getCurrencyAmount(currencies, currency));
  }, [currencies, currency]);

  useEffect(() => {
    resetPaymentState();

    if (provider) {
      logger.info("Mobile money provider selected", { provider });
    }
  }, [provider, resetPaymentState]);
  useEffect(() => {
    return () => clearPollTimeout();
  }, [clearPollTimeout]);

  const ensureLead = useCallback(() => {
    if (leadId) {
      return true;
    }

    logger.warn("Payment action blocked because leadId is missing");
    toast({
      title: t.checkout.payment.missingLeadTitle,
      description: t.checkout.payment.missingLeadDescription,
      variant: "destructive",
    });
    return false;
  }, [leadId, t.checkout.payment.missingLeadDescription, t.checkout.payment.missingLeadTitle, toast]);

  const ensurePhoneNumber = useCallback(() => {
    if (phoneNumber.trim()) {
      return true;
    }

    toast({
      title: t.checkout.payment.missingPhoneTitle,
      description: t.checkout.payment.missingPhoneDescription,
      variant: "destructive",
    });
    return false;
  }, [phoneNumber, t.checkout.payment.missingPhoneDescription, t.checkout.payment.missingPhoneTitle, toast]);

  const handlePaymentSuccess = useCallback(() => {
    setPaymentStatus("success");
    setStatusMessage(t.checkout.payment.successMessage);
    toast({
      title: t.checkout.payment.successTitle,
      description: t.checkout.payment.successMessage,
    });
    onSuccess();
  }, [onSuccess, t.checkout.payment.successMessage, t.checkout.payment.successTitle, toast]);

  const handlePaymentFailure = useCallback(() => {
    setPaymentStatus("failed");
    setStatusMessage(t.checkout.payment.pollFailed);
    toast({
      title: t.checkout.payment.errorTitle,
      description: t.checkout.payment.pollFailed,
      variant: "destructive",
    });
  }, [t.checkout.payment.errorTitle, t.checkout.payment.pollFailed, toast]);

  const scheduleStatusCheck = useCallback(
    (callback: () => Promise<void>, delayMs: number) => {
      clearPollTimeout();
      pollTimeoutRef.current = window.setTimeout(() => {
        void callback();
      }, delayMs);
    },
    [clearPollTimeout],
  );

  const checkMTNStatus = useCallback(
    async (referenceId: string) => {
      if (!leadId) {
        return;
      }

      setIsCheckingStatus(true);
      pollAttemptsRef.current += 1;
      logger.debug("Polling MTN payment status", { referenceId, attempt: pollAttemptsRef.current });

      try {
        const data = await checkMTNPaymentStatus({ referenceId, leadId });

        if (data?.status === "SUCCESSFUL") {
          logger.info("MTN payment confirmed", {
            referenceId,
            attempt: pollAttemptsRef.current,
          });
          handlePaymentSuccess();
          return;
        }

        if (data?.status === "FAILED") {
          logger.warn("MTN payment failed", {
            referenceId,
            attempt: pollAttemptsRef.current,
          });
          handlePaymentFailure();
          return;
        }

        setStatusMessage(data?.message || t.checkout.payment.pendingMessage);

        if (pollAttemptsRef.current >= MTN_MAX_POLL_ATTEMPTS) {
          logger.warn("MTN payment status polling reached max attempts", { referenceId });
          setPaymentStatus("pending");
          setStatusMessage(t.checkout.payment.pollPending);
          toast({
            title: t.checkout.payment.pendingTitle,
            description: t.checkout.payment.pollPending,
          });
          return;
        }

        scheduleStatusCheck(() => checkMTNStatus(referenceId), MTN_POLL_DELAY_MS);
      } catch (error: unknown) {
        logger.error("MTN payment status polling failed", {
          referenceId,
          attempt: pollAttemptsRef.current,
          message: getErrorMessage(error),
        });
        scheduleStatusCheck(() => checkMTNStatus(referenceId), MTN_POLL_DELAY_MS);
      } finally {
        setIsCheckingStatus(false);
      }
    },
    [
      handlePaymentFailure,
      handlePaymentSuccess,
      leadId,
      scheduleStatusCheck,
      t.checkout.payment.pendingMessage,
      t.checkout.payment.pendingTitle,
      t.checkout.payment.pollPending,
      toast,
    ],
  );

  const handleMTNPayment = useCallback(async () => {
    if (!ensureLead() || !ensurePhoneNumber()) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("pending");
    logger.info("Submitting MTN payment request", { leadId, currency });

    try {
      const fullPhoneNumber = formatMobileMoneyPhoneNumber(countryCode, phoneNumber);
      const data = await requestMTNPayment({
        leadId,
        phoneNumber: fullPhoneNumber,
        currency,
      });

      if (!data?.success) {
        throw new Error(data?.error || t.checkout.payment.requestFailed);
      }

      const isManualFlow = data.status === "pending_verification";
      setTargetAccount(data.targetAccount || selectedProvider?.account || null);
      setStatusMessage(data.message || t.checkout.payment.pendingMessage);
      setManualVerification(isManualFlow);
      setTransactionRef(isManualFlow ? null : (data.referenceId || null));

      if (data.amount) {
        setLocalAmount(data.amount);
      }

      logger.info("MTN payment request accepted", {
        leadId,
        currency,
        manualVerification: isManualFlow,
        hasReferenceId: Boolean(data.referenceId),
      });

      toast({
        title: isManualFlow ? t.checkout.payment.manualInstructions : t.checkout.payment.mtnRequestSent,
        description:
          data.message ||
          (isManualFlow ? t.checkout.payment.manualInstructions : t.checkout.payment.mtnInstructions),
      });

      if (!isManualFlow && data.referenceId) {
        pollAttemptsRef.current = 0;
        scheduleStatusCheck(() => checkMTNStatus(data.referenceId), MTN_INITIAL_POLL_DELAY_MS);
      }
    } catch (error: unknown) {
      logger.error("MTN payment request failed", {
        leadId,
        message: getErrorMessage(error),
      });
      setPaymentStatus("failed");
      toast({
        title: t.checkout.payment.errorTitle,
        description: error instanceof Error ? error.message : t.checkout.payment.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    checkMTNStatus,
    countryCode,
    currency,
    ensureLead,
    ensurePhoneNumber,
    leadId,
    phoneNumber,
    scheduleStatusCheck,
    selectedProvider?.account,
    t.checkout.payment.errorDescription,
    t.checkout.payment.errorTitle,
    t.checkout.payment.manualInstructions,
    t.checkout.payment.mtnInstructions,
    t.checkout.payment.mtnRequestSent,
    t.checkout.payment.pendingMessage,
    t.checkout.payment.requestFailed,
    toast,
  ]);

  const handleOrangePayment = useCallback(async () => {
    if (!ensureLead() || !ensurePhoneNumber()) {
      return;
    }

    setIsProcessing(true);
    logger.info("Submitting Orange Money payment request", { leadId });

    try {
      const fullPhoneNumber = formatMobileMoneyPhoneNumber(countryCode, phoneNumber);
      const data = await requestOrangePayment({
        leadId,
        phoneNumber: fullPhoneNumber,
      });

      setPaymentStatus("pending");
      setTransactionRef(null);
      setTargetAccount(data?.targetAccount || selectedProvider?.account || null);
      setStatusMessage(data?.message || t.checkout.payment.pendingMessage);
      setManualVerification(true);
      logger.info("Orange Money request recorded", { leadId });

      toast({
        title: t.checkout.payment.pendingTitle,
        description: data?.message || t.checkout.payment.pendingMessage,
      });
    } catch (error: unknown) {
      logger.error("Orange Money payment request failed", {
        leadId,
        message: getErrorMessage(error),
      });
      setPaymentStatus("failed");
      toast({
        title: t.checkout.payment.errorTitle,
        description: error instanceof Error ? error.message : t.checkout.payment.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    countryCode,
    ensureLead,
    ensurePhoneNumber,
    leadId,
    phoneNumber,
    selectedProvider?.account,
    t.checkout.payment.errorDescription,
    t.checkout.payment.errorTitle,
    t.checkout.payment.pendingMessage,
    t.checkout.payment.pendingTitle,
    toast,
  ]);

  const handleCheckStatus = useCallback(async () => {
    if (!transactionRef || !ensureLead()) {
      return;
    }

      logger.info("Checking MTN payment status manually", {
        referenceId: transactionRef,
        leadId,
      });
      pollAttemptsRef.current = 0;
      await checkMTNStatus(transactionRef);
  }, [checkMTNStatus, ensureLead, leadId, transactionRef]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!provider) {
        logger.warn("Mobile money submit blocked because no provider is selected");
        toast({
          title: t.checkout.payment.providerLabel,
          description: t.checkout.selectPayment,
          variant: "destructive",
        });
        return;
      }

      logger.info("Submitting mobile money form", { provider, leadId });

      if (provider === "mtn") {
        await handleMTNPayment();
        return;
      }

      await handleOrangePayment();
    },
    [handleMTNPayment, handleOrangePayment, leadId, provider, t.checkout.payment.providerLabel, t.checkout.selectPayment, toast],
  );

  return {
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
    canSubmit:
      !isProcessing &&
      !isCheckingStatus &&
      Boolean(provider) &&
      Boolean(phoneNumber.trim()) &&
      paymentStatus !== "pending" &&
      paymentStatus !== "success",
    setProvider,
    setCountryCode,
    setPhoneNumber,
    setCurrency,
    handleSubmit,
    handleCheckStatus,
  };
}
