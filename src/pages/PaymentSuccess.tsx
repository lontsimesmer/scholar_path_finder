import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Calendar, Check, Clock, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandMark from "@/components/BrandMark";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { cn } from "@/lib/utils";

type PaymentState = "loading" | "success" | "pending" | "error";

type PaymentContent = {
  title: string;
  description: string;
  tone: string;
  steps: Array<{
    icon: typeof Mail;
    title: string;
    description: string;
  }>;
};

const logger = createLogger("PaymentSuccess");

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const paymentSuccessText = t.paymentSuccess as typeof t.paymentSuccess & {
    cinetpayPendingDetails: string;
  };
  const [paymentState, setPaymentState] = useState<PaymentState>("loading");
  const [details, setDetails] = useState<string | null>(null);
  const leadId = searchParams.get("leadId");
  const transactionId = searchParams.get("transaction_id");

  const paymentContent: Record<Exclude<PaymentState, "loading">, PaymentContent> = {
    success: {
      title: t.paymentSuccess.success.title,
      description: t.paymentSuccess.success.description,
      tone: "border-success/20 bg-success/10 text-success",
      steps: [
        {
          icon: Mail,
          title: t.paymentSuccess.success.steps.email.title,
          description: t.paymentSuccess.success.steps.email.description,
        },
        {
          icon: Calendar,
          title: t.paymentSuccess.success.steps.invite.title,
          description: t.paymentSuccess.success.steps.invite.description,
        },
        {
          icon: MessageCircle,
          title: t.paymentSuccess.success.steps.questions.title,
          description: t.paymentSuccess.success.steps.questions.description,
        },
      ],
    },
    pending: {
      title: t.paymentSuccess.pending.title,
      description: t.paymentSuccess.pending.description,
      tone: "border-amber-200 bg-amber-50 text-primary",
      steps: [
        {
          icon: Clock,
          title: t.paymentSuccess.pending.steps.proof.title,
          description: t.paymentSuccess.pending.steps.proof.description,
        },
        {
          icon: Mail,
          title: t.paymentSuccess.pending.steps.inbox.title,
          description: t.paymentSuccess.pending.steps.inbox.description,
        },
        {
          icon: MessageCircle,
          title: t.paymentSuccess.pending.steps.help.title,
          description: t.paymentSuccess.pending.steps.help.description,
        },
      ],
    },
    error: {
      title: t.paymentSuccess.error.title,
      description: t.paymentSuccess.error.description,
      tone: "border-destructive/20 bg-destructive/10 text-destructive",
      steps: [
        {
          icon: Mail,
          title: t.paymentSuccess.error.steps.support.title,
          description: t.paymentSuccess.error.steps.support.description,
        },
        {
          icon: Clock,
          title: t.paymentSuccess.error.steps.retry.title,
          description: t.paymentSuccess.error.steps.retry.description,
        },
        {
          icon: Calendar,
          title: t.paymentSuccess.error.steps.checkout.title,
          description: t.paymentSuccess.error.steps.checkout.description,
        },
      ],
    },
  };

  const returnToCheckout = () => {
    logger.info("Returning from payment status page to checkout", { leadId });

    if (leadId) {
      navigate(`/checkout?leadId=${leadId}`);
      return;
    }

    navigate("/");
  };

  useEffect(() => {
    let isCancelled = false;
    let retryTimeout: number | null = null;

    const verifyCinetpayPayment = async (attempt = 1) => {
      if (!leadId) {
        logger.warn("CinetPay payment success page is missing verification parameters");
        setPaymentState("error");
        setDetails(t.paymentSuccess.missingDetails);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-cinetpay-payment-status", {
          body: { leadId, transactionId },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (isCancelled) {
          return;
        }

        if (data?.paymentStatus === "accepted" || data?.paymentStatus === "paid") {
          logger.info("CinetPay payment verified successfully", {
            leadId,
            transactionId: data?.transactionId || transactionId,
          });
          setPaymentState("success");
          setDetails(null);
          return;
        }

        if (data?.paymentStatus === "pending" || data?.paymentStatus === "initialized") {
          logger.info("CinetPay payment is still pending", {
            leadId,
            transactionId: data?.transactionId || transactionId,
            attempt,
          });
          setPaymentState("pending");
          setDetails(paymentSuccessText.cinetpayPendingDetails);

          if (attempt < 6) {
            retryTimeout = window.setTimeout(() => {
              void verifyCinetpayPayment(attempt + 1);
            }, 4000);
          }
          return;
        }

        logger.warn("CinetPay payment verification returned a non-success terminal state", {
          leadId,
          transactionId: data?.transactionId || transactionId,
          paymentStatus: data?.paymentStatus,
          providerStatus: data?.providerStatus,
        });
        setPaymentState("error");
        setDetails(data?.providerStatus || t.paymentSuccess.verificationFailedDetails);
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        logger.error("CinetPay payment verification failed", {
          leadId,
          transactionId,
          message: getErrorMessage(error),
        });
        setPaymentState("error");
        setDetails(error instanceof Error ? error.message : t.paymentSuccess.verificationFailedDetails);
      }
    };

    if (leadId || transactionId) {
      void verifyCinetpayPayment();
    } else {
      logger.warn("Payment success page is missing verification parameters");
      setPaymentState("error");
      setDetails(t.paymentSuccess.missingDetails);
    }

    return () => {
      isCancelled = true;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [leadId, paymentSuccessText, t, transactionId]);

  const content = paymentState === "loading" ? null : paymentContent[paymentState];

  if (paymentState === "loading") {
    return (
      <div className="page-shell flex items-center justify-center px-4 py-8">
        <div className="relative z-10 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <BrandMark size="lg" className="mx-auto mt-5" />
          <h1 className="mt-5 font-display text-3xl font-bold text-foreground">
            {t.paymentSuccess.loadingTitle}
          </h1>
          <p className="mt-2 text-muted-foreground">{t.paymentSuccess.loadingDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center px-4 py-8">
      <div className="section-container relative z-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="overflow-hidden border-white/70 bg-white/94 shadow-strong">
            <CardContent className="px-6 py-8 md:px-8 md:py-10">
              <div className="text-center">
                <div
                  className={cn(
                    "mx-auto flex h-24 w-24 items-center justify-center rounded-full border",
                    content?.tone,
                  )}
                >
                  {paymentState === "success" && <Check className="h-12 w-12" />}
                  {paymentState === "pending" && <Clock className="h-12 w-12" />}
                  {paymentState === "error" && <AlertCircle className="h-12 w-12" />}
                </div>
                <BrandMark size="lg" className="mx-auto mt-6" />
                <h1 className="mt-6 font-display text-4xl font-bold text-foreground md:text-5xl">
                  {content?.title}
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {details || content?.description}
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(content?.steps ?? []).map((step) => (
                  <div
                    key={step.title}
                    className="rounded-[1.4rem] border border-border/70 bg-secondary/40 p-5 text-left shadow-soft"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">{step.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-[1.5rem] border border-white/70 bg-white/82 p-6 text-center shadow-medium">
            <p className="text-sm text-muted-foreground">{t.paymentSuccess.contactPrompt}</p>
            <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
              <a
                href="mailto:powerprestationint@gmail.com"
                className="break-all font-medium text-primary hover:underline"
              >
                powerprestationint@gmail.com
              </a>
              <span className="hidden text-muted-foreground sm:inline">|</span>
              <a href="tel:+237674819411" className="font-medium text-primary hover:underline">
                +(237)674819411
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {(paymentState === "pending" || paymentState === "error") && (
              <Button variant="outline" onClick={returnToCheckout} size="lg">
                {t.paymentSuccess.returnToCheckout}
              </Button>
            )}
            <Button onClick={() => navigate("/")} size="lg">
              {t.paymentSuccess.backHome}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
