import { useEffect, useState } from "react";
import { CheckCircle, Clock, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface MobileMoneyPaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

interface Currency {
  code: string;
  rate: number;
  amount: string;
}

interface ProviderConfig {
  id: "mtn" | "orange";
  name: string;
  account: string;
}

const logger = createLogger("MobileMoneyPayment");

const formatInternationalPhone = (countryCode: string, phoneNumber: string) =>
  `${countryCode}${phoneNumber.replace(/\s+/g, "").replace(/^0+/, "")}`;

export const MobileMoneyPayment = ({ leadId, onSuccess }: MobileMoneyPaymentProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<ProviderConfig["id"] | "">("");
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [localAmount, setLocalAmount] = useState("15625");
  const [targetAccount, setTargetAccount] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manualVerification, setManualVerification] = useState(false);

  const providers: ProviderConfig[] = [
    { id: "mtn", name: "MTN Mobile Money", account: "651831709" },
    { id: "orange", name: "Orange Money", account: "690830651" },
  ];

  const selectedProvider = providers.find((item) => item.id === provider);
  const displayedAccount = targetAccount || selectedProvider?.account || null;

  useEffect(() => {
    const fetchCurrencies = async () => {
      logger.info("Loading MTN currency options");

      try {
        const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
          body: { action: "get_currencies" },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.currencies) {
          logger.warn("MTN currency request returned no currencies");
          return;
        }

        setCurrencies(data.currencies);
        logger.info("MTN currency options loaded", {
          count: data.currencies.length,
        });
        const xaf = data.currencies.find((item: Currency) => item.code === "XAF");
        if (xaf) {
          setLocalAmount(xaf.amount);
        }
      } catch (error) {
        logger.error("Failed to load MTN currencies", {
          message: getErrorMessage(error),
        });
      }
    };

    fetchCurrencies();
  }, []);

  useEffect(() => {
    const selectedCurrency = currencies.find((item) => item.code === currency);
    if (selectedCurrency) {
      setLocalAmount(selectedCurrency.amount);
    }
  }, [currency, currencies]);

  useEffect(() => {
    setPaymentStatus("idle");
    setTransactionRef(null);
    setTargetAccount(null);
    setStatusMessage(null);
    setManualVerification(false);

    if (provider) {
      logger.info("Mobile money provider selected", { provider });
    }
  }, [provider]);

  const ensureLead = () => {
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
  };

  const handleMTNPayment = async () => {
    if (!ensureLead()) {
      return;
    }

    if (!phoneNumber) {
      toast({
        title: t.checkout.payment.missingPhoneTitle,
        description: t.checkout.payment.missingPhoneDescription,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("pending");
    logger.info("Submitting MTN payment request", { leadId, currency });

    try {
      const fullPhoneNumber = formatInternationalPhone(countryCode, phoneNumber);
      const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
        body: {
          action: "request_payment",
          leadId,
          phoneNumber: fullPhoneNumber,
          currency,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || t.checkout.payment.requestFailed);
      }

      setTargetAccount(data.targetAccount || selectedProvider?.account || null);
      setStatusMessage(data.message || t.checkout.payment.pendingMessage);
      if (data.amount) {
        setLocalAmount(data.amount);
      }

      const isManualFlow = data.status === "pending_verification";
      setManualVerification(isManualFlow);
      setTransactionRef(isManualFlow ? null : (data.referenceId || null));
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
          (isManualFlow
            ? t.checkout.payment.manualInstructions
            : t.checkout.payment.mtnInstructions),
      });

      if (!isManualFlow && data.referenceId) {
        pollPaymentStatus(data.referenceId);
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
  };

  const handleOrangePayment = async () => {
    if (!ensureLead()) {
      return;
    }

    if (!phoneNumber) {
      toast({
        title: t.checkout.payment.missingPhoneTitle,
        description: t.checkout.payment.missingPhoneDescription,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    logger.info("Submitting Orange Money payment request", { leadId });

    try {
      const fullPhoneNumber = formatInternationalPhone(countryCode, phoneNumber);
      const { data, error } = await supabase.functions.invoke("process-mobile-money", {
        body: {
          leadId,
          provider: "orange",
          phoneNumber: fullPhoneNumber,
          amount: 25,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

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
  };

  const pollPaymentStatus = async (referenceId: string) => {
    let attempts = 0;
    const maxAttempts = 12;
    logger.info("Starting MTN payment status polling", { referenceId, leadId });

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        logger.warn("MTN payment status polling reached max attempts", { referenceId });
        setPaymentStatus("pending");
        setStatusMessage(t.checkout.payment.pollPending);
        toast({
          title: t.checkout.payment.pendingTitle,
          description: t.checkout.payment.pollPending,
        });
        return;
      }

      attempts += 1;
      setIsCheckingStatus(true);
      logger.debug("Polling MTN payment status", { referenceId, attempt: attempts });

      try {
        const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
          body: {
            action: "check_status",
            referenceId,
            leadId,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.status === "SUCCESSFUL") {
          logger.info("MTN payment confirmed", { referenceId, attempt: attempts });
          setPaymentStatus("success");
          setStatusMessage(t.checkout.payment.successMessage);
          toast({
            title: t.checkout.payment.successTitle,
            description: t.checkout.payment.successMessage,
          });
          onSuccess();
          return;
        }

        if (data?.status === "FAILED") {
          logger.warn("MTN payment failed", { referenceId, attempt: attempts });
          setPaymentStatus("failed");
          setStatusMessage(t.checkout.payment.pollFailed);
          toast({
            title: t.checkout.payment.errorTitle,
            description: t.checkout.payment.pollFailed,
            variant: "destructive",
          });
          return;
        }

        setStatusMessage(data?.message || t.checkout.payment.pendingMessage);
        setTimeout(checkStatus, 10000);
      } catch (error) {
        logger.error("MTN payment status polling failed", {
          referenceId,
          attempt: attempts,
          message: getErrorMessage(error),
        });
        setTimeout(checkStatus, 10000);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    setTimeout(checkStatus, 5000);
  };

  const handleCheckStatus = async () => {
    if (!transactionRef || !ensureLead()) {
      return;
    }

    setIsCheckingStatus(true);
    logger.info("Checking MTN payment status manually", { referenceId: transactionRef, leadId });

    try {
      const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
        body: {
          action: "check_status",
          referenceId: transactionRef,
          leadId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.status === "SUCCESSFUL") {
        logger.info("Manual MTN status check confirmed payment", { referenceId: transactionRef });
        setPaymentStatus("success");
        setStatusMessage(t.checkout.payment.successMessage);
        toast({
          title: t.checkout.payment.successTitle,
          description: t.checkout.payment.successMessage,
        });
        onSuccess();
        return;
      }

      if (data?.status === "FAILED") {
        logger.warn("Manual MTN status check returned failed", { referenceId: transactionRef });
        setPaymentStatus("failed");
        setStatusMessage(t.checkout.payment.pollFailed);
        toast({
          title: t.checkout.payment.errorTitle,
          description: t.checkout.payment.pollFailed,
          variant: "destructive",
        });
        return;
      }

      setStatusMessage(data?.message || t.checkout.payment.pendingMessage);
      logger.info("Manual MTN status check still pending", { referenceId: transactionRef });
      toast({
        title: t.checkout.payment.pendingTitle,
        description: data?.message || t.checkout.payment.pendingMessage,
      });
    } catch (error: unknown) {
      logger.error("Manual MTN status check failed", {
        referenceId: transactionRef,
        message: getErrorMessage(error),
      });
      toast({
        title: t.checkout.payment.errorTitle,
        description: error instanceof Error ? error.message : t.checkout.payment.errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">{t.checkout.payment.providerLabel}</Label>
        <div className="grid gap-3 md:grid-cols-2">
          {providers.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProvider(item.id)}
              className={cn(
                "rounded-[1.3rem] border p-4 text-left transition-all duration-300",
                provider === item.id
                  ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                  : "border-border/70 bg-white/72 shadow-soft hover:border-primary/18 hover:shadow-medium",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.id === "mtn" ? t.checkout.payment.mtnHelper : t.checkout.payment.orangeHelper}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {provider === "mtn" && currencies.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">{t.checkout.payment.currencyLabel}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder={t.checkout.payment.selectCurrency} />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.code} - {item.amount} (~$25 USD)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedProvider && (
        <div className="rounded-[1.3rem] border border-border/70 bg-white/72 p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t.checkout.payment.sendTo}
              </p>
              <p className="mt-2 font-medium text-foreground">{selectedProvider.name}</p>
            </div>
            <span className="w-fit rounded-full bg-primary/10 px-4 py-2 font-mono text-sm font-semibold text-primary">
              {displayedAccount}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t.checkout.payment.amount}: <strong>{localAmount} {currency}</strong> (~$25.00 USD)
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
          {t.checkout.payment.phoneLabel}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CountryCodeSelect value={countryCode} onValueChange={setCountryCode} />
          <Input
            id="phone"
            type="tel"
            placeholder={t.checkout.payment.phonePlaceholder}
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="h-12 flex-1"
          />
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          {t.checkout.payment.phoneHelper}
        </p>
      </div>

      {paymentStatus === "pending" && (
        <div className="flex flex-col items-start gap-3 rounded-[1.3rem] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <Clock className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t.checkout.payment.pendingTitle}</p>
            <p className="text-xs leading-6 text-muted-foreground">
              {statusMessage || t.checkout.payment.pendingMessage}
            </p>
          </div>
          {!manualVerification && transactionRef && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
            >
              {isCheckingStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                t.checkout.payment.checkStatus
              )}
            </Button>
          )}
        </div>
      )}

      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 rounded-[1.3rem] border border-success/20 bg-success/10 p-4">
          <CheckCircle className="h-5 w-5 text-success" />
          <p className="text-sm font-medium text-foreground">{t.checkout.payment.successTitle}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing || isCheckingStatus || !provider || !phoneNumber || paymentStatus === "pending" || paymentStatus === "success"}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            {t.checkout.payment.processing}
          </>
        ) : paymentStatus === "pending" ? (
          <>
            <Clock className="w-4 h-4 mr-2" />
            {manualVerification ? t.checkout.payment.awaitingVerification : t.checkout.payment.pendingMessage}
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 mr-2" />
            {provider === "mtn" ? t.checkout.payment.requestPayment : t.checkout.payment.confirmManual}
          </>
        )}
      </Button>
    </form>
  );
};
