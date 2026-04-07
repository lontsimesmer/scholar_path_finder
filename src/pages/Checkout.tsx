import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  CreditCard,
  LogOut,
  Shield,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BrandMark from "@/components/BrandMark";
import { CinetpayPayment } from "@/components/checkout/CinetpayPayment";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  ensureStudentProfile,
  hasValidatedProcedureProfile,
  type StudentProfileRecord,
} from "@/lib/student-profile";
import { cn } from "@/lib/utils";

type PaymentMethod = "card" | "mobile_money";

const logger = createLogger("Checkout");

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const paymentText = t.checkout.payment as typeof t.checkout.payment & {
    cinetpayCardSubtitle: string;
    cinetpayCardHelper: string;
    cinetpayMobileMoneySubtitle: string;
    cinetpayMobileMoneyHelper: string;
  };
  const [leadId, setLeadId] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [identity, setIdentity] = useState<Pick<StudentProfileRecord, "first_name" | "last_name"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");

  const requestedLeadId = searchParams.get("leadId")?.trim() || null;
  const requestedEmail = searchParams.get("email")?.trim() || "";
  const searchQuery = searchParams.toString();
  const redirectTarget = `/checkout${searchQuery ? `?${searchQuery}` : ""}`;

  useEffect(() => {
    let hasRedirected = false;

    logger.info("Initializing checkout", {
      hasLeadId: Boolean(requestedLeadId),
      hasRequestedEmail: Boolean(requestedEmail),
    });

    setLeadId(requestedLeadId);

    if (!requestedLeadId) {
      logger.warn("Checkout opened without a lead identifier");
      toast({
        title: t.checkout.unavailableTitle,
        description: t.checkout.unavailableDescription,
        variant: "destructive",
      });
      navigate("/", { replace: true });
      return;
    }

    const redirectToLogin = () => {
      if (hasRedirected) {
        return;
      }

      hasRedirected = true;
      logger.info("Redirecting checkout visitor to login", {
        hasRequestedEmail: Boolean(requestedEmail),
      });

      const loginSearchParams = new URLSearchParams({
        redirect: redirectTarget,
      });

      if (requestedEmail) {
        loginSearchParams.set("email", requestedEmail);
      }

      navigate(`/login?${loginSearchParams.toString()}`, { replace: true });
    };

    const redirectToProfileCompletion = () => {
      if (hasRedirected) {
        return;
      }

      hasRedirected = true;
      logger.warn("Checkout blocked until required profile details are completed", {
        redirectTarget,
      });
      toast({
        title: t.checkout.profileRequiredTitle,
        description: t.checkout.profileRequiredDescription,
      });
      navigate(`/dashboard?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
    };

    const validateProcedureProfile = async (sessionUser: { id: string; email?: string | null }) => {
      try {
        const profile = await ensureStudentProfile(sessionUser);

        if (!hasValidatedProcedureProfile(profile)) {
          redirectToProfileCompletion();
          return;
        }

        logger.info("Checkout profile requirement satisfied", { userId: sessionUser.id });
        setUser({ email: sessionUser.email ?? undefined });
        setIdentity({
          first_name: profile.first_name,
          last_name: profile.last_name,
        });
        setIsLoading(false);
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.error("Failed to verify checkout profile requirements", {
          userId: sessionUser.id,
          message,
        });
        toast({
          title: t.checkout.unavailableTitle,
          description: message,
          variant: "destructive",
        });
        navigate("/dashboard", { replace: true });
      }
    };

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          logger.info("Checkout session validated", { userId: session.user.id });
          await validateProcedureProfile(session.user);
          return;
        }

        logger.info("Checkout requires authentication");
        redirectToLogin();
      } catch (error: unknown) {
        logger.error("Failed to resolve checkout auth session", {
          message: getErrorMessage(error),
        });
        redirectToLogin();
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info("Checkout auth state changed", { event, hasSession: Boolean(session) });

      if (session) {
        void validateProcedureProfile(session.user);
        return;
      }

      redirectToLogin();
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTarget, requestedEmail, requestedLeadId, toast, t]);

  const handleSignOut = async () => {
    logger.info("Signing out from checkout", { leadId });
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return (
      <div className="page-shell px-4 py-8">
        <div className="section-container relative z-10 space-y-8">
          <div className="surface-panel overflow-hidden px-6 py-6 md:px-8 md:py-7">
            <div className="flex items-center gap-6">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <Skeleton className="h-10 w-3/4 md:w-1/2" />
              <Skeleton className="h-20 w-full md:w-2/3" />
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-[500px] w-full rounded-3xl" />
            <Skeleton className="h-[500px] w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell px-4 py-8">
      <div className="section-container relative z-10 space-y-8">
        <div className="surface-panel overflow-hidden px-6 py-6 md:px-8 md:py-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <BrandMark size="lg" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/55">
                    Power Prestation
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.checkout.packageTitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                <span className="section-kicker border-primary/10 bg-white/70 text-secondary-foreground shadow-soft">
                  <span className="eyebrow-dot" />
                  {t.checkout.subtitle.split('.')[0]}
                </span>
                <h1 className="font-display text-3xl font-bold text-foreground md:text-5xl">
                  {t.checkout.title.replace(t.checkout.titleHighlight, "")}
                  <span className="text-primary">{t.checkout.titleHighlight}</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  {t.checkout.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 rounded-[1.4rem] border border-border/70 bg-white/68 px-5 py-4 shadow-soft lg:items-end">
              {user?.email && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t.checkout.signedInAs}
                  </p>
                  <p className="break-all text-sm font-medium text-foreground">{user.email}</p>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                {t.checkout.signOut}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <Card className="overflow-hidden border-white/70 shadow-strong">
              <div className="bg-[radial-gradient(circle_at_top_left,_rgba(62,96,210,0.15),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(239,244,255,0.98))] px-7 py-7">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t.checkout.packageTitle}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold text-primary">{t.checkout.packagePrice}</span>
                  <span className="pb-2 text-muted-foreground">{t.checkout.packageCurrency}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t.checkout.packageDescription}
                </p>
              </div>
              <CardContent className="space-y-7 pt-7">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {t.checkout.whatIncluded}
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {t.checkout.includedItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/12">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="leading-7 text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-border/70 bg-white/62 px-4 py-4 shadow-soft">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm leading-6 text-foreground">{t.checkout.benefits.expert}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border/70 bg-white/62 px-4 py-4 shadow-soft">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm leading-6 text-foreground">{t.checkout.benefits.session}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border/70 bg-white/62 px-4 py-4 shadow-soft">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm leading-6 text-foreground">{t.checkout.benefits.secure}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border/70 bg-white/62 px-4 py-4 shadow-soft">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm leading-6 text-foreground">{t.checkout.benefits.tailored}</p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-primary/10 bg-primary/6 p-5">
                  <div className="flex items-start gap-4">
                    <Shield className="mt-1 h-7 w-7 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{t.checkout.guaranteeTitle}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t.checkout.guaranteeDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-[1.5rem] border border-border/70 bg-white/68 p-5 shadow-soft">
              <p className="text-sm text-muted-foreground">{t.checkout.questions}</p>
              <div className="mt-3 flex flex-col gap-2 text-sm font-medium">
                <a href="mailto:powerprestationint@gmail.com" className="break-all text-primary hover:underline">
                  powerprestationint@gmail.com
                </a>
                <a href="tel:+237674819411" className="text-primary hover:underline">
                  +(237)674819411
                </a>
              </div>
            </div>
          </div>

          <Card className="border-white/70 bg-white/94 shadow-strong">
            <CardContent className="space-y-7 pt-7">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t.checkout.selectPayment}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    className={cn(
                      "rounded-[1.35rem] border p-5 text-left transition-all duration-300",
                      paymentMethod === "mobile_money"
                        ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                        : "border-border/70 bg-white/68 shadow-soft hover:border-primary/18 hover:shadow-medium",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{t.checkout.methods.mobileMoney.title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {paymentText.cinetpayMobileMoneySubtitle}
                          </p>
                        </div>
                      </div>
                      {paymentMethod === "mobile_money" && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "rounded-[1.35rem] border p-5 text-left transition-all duration-300",
                      paymentMethod === "card"
                        ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                        : "border-border/70 bg-white/68 shadow-soft hover:border-primary/18 hover:shadow-medium",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{t.checkout.methods.card.title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {paymentText.cinetpayCardSubtitle}
                          </p>
                        </div>
                      </div>
                      {paymentMethod === "card" && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/70 bg-secondary/40 p-5">
                {paymentMethod === "card" ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{t.checkout.paymentDetails.card.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {paymentText.cinetpayCardHelper}
                      </p>
                    </div>
                    <CinetpayPayment
                      leadId={leadId}
                      paymentMethod="card"
                      userEmail={user?.email ?? null}
                      identity={{
                        firstName: identity?.first_name || "",
                        lastName: identity?.last_name || "",
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{t.checkout.paymentDetails.mobileMoney.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {paymentText.cinetpayMobileMoneyHelper}
                      </p>
                    </div>
                    <CinetpayPayment
                      leadId={leadId}
                      paymentMethod="mobile_money"
                      userEmail={user?.email ?? null}
                      identity={{
                        firstName: identity?.first_name || "",
                        lastName: identity?.last_name || "",
                      }}
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-center leading-6 text-muted-foreground">
                {t.checkout.terms}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            {t.checkout.backToHome}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
