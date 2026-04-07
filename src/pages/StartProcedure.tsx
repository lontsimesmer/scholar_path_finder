import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SectionHeading from "@/components/SectionHeading";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { splitInternationalPhoneNumber } from "@/lib/country-codes";
import {
  buildStudentFullName,
  ensureStudentProfile,
  getStudentDisplayName,
  hasValidatedProcedureProfile,
  StudentProfileRecord,
} from "@/lib/student-profile";
import {
  buildProcedureCheckoutPath,
  doesProcedurePaymentRequireAction,
  isProcedurePaymentPending,
  ProcedureLeadSummary,
} from "@/lib/procedure-lead";

type SubmitLeadResponse = {
  success?: boolean;
  leadId?: string;
  leadReused?: boolean;
  alreadyActive?: boolean;
};

const logger = createLogger("StartProcedure");

const StartProcedure = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const procedureText = t.startProcedure as typeof t.startProcedure;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfileRecord | null>(null);
  const [procedureLead, setProcedureLead] = useState<ProcedureLeadSummary | null>(null);
  const [countryCode, setCountryCode] = useState("+237");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const loadProcedureContext = useCallback(
    async (currentUser: Pick<User, "id" | "email">) => {
      setIsLoading(true);

      try {
        const profileData = await ensureStudentProfile(currentUser);
        setProfile(profileData);
        const resolvedPhone = splitInternationalPhoneNumber(profileData.phone_number);
        setCountryCode(resolvedPhone.countryCode);
        setPhone(resolvedPhone.localNumber);

        const { data, error } = await supabase.functions.invoke("get-student-procedure-status", {
          body: {},
        });

        if (error) {
          throw new Error(error.message);
        }

        setProcedureLead((data?.lead as ProcedureLeadSummary | null) ?? null);
      } catch (error: unknown) {
        logger.error("Failed to load the private procedure page", {
          userId: currentUser.id,
          message: getErrorMessage(error),
        });
        toast({
          title: procedureText.loadErrorTitle,
          description: procedureText.loadErrorDescription,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [procedureText.loadErrorDescription, procedureText.loadErrorTitle, toast],
  );

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (!session?.user) {
        navigate("/login?redirect=/start-procedure", { replace: true });
        return;
      }

      setUser(session.user);
      await loadProcedureContext(session.user);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return;
      }

      if (!session?.user) {
        navigate("/login?redirect=/start-procedure", { replace: true });
        return;
      }

      setUser(session.user);
      void loadProcedureContext(session.user);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [loadProcedureContext, navigate]);

  const profileDisplayName = useMemo(
    () => getStudentDisplayName(profile, user?.email),
    [profile, user?.email],
  );
  const profileFullName = useMemo(
    () => buildStudentFullName(profile?.first_name, profile?.last_name) ?? profileDisplayName,
    [profile?.first_name, profile?.last_name, profileDisplayName],
  );
  const profileReadyForProcedure = useMemo(
    () => hasValidatedProcedureProfile(profile),
    [profile],
  );
  const paymentRequiresAction = useMemo(
    () => doesProcedurePaymentRequireAction(procedureLead?.paymentStatus),
    [procedureLead?.paymentStatus],
  );
  const paymentIsPending = useMemo(
    () => isProcedurePaymentPending(procedureLead?.paymentStatus),
    [procedureLead?.paymentStatus],
  );
  const paymentCheckoutPath = useMemo(
    () => buildProcedureCheckoutPath(procedureLead),
    [procedureLead],
  );
  const hasActiveProcedure = useMemo(
    () => Boolean(procedureLead) && !paymentRequiresAction && !paymentIsPending,
    [paymentIsPending, paymentRequiresAction, procedureLead],
  );
  const formattedBirthDate = useMemo(() => {
    if (!profile?.birth_date) {
      return t.dashboard.notSpecified;
    }

    return new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString(
      language === "fr" ? "fr-FR" : "en-US",
    );
  }, [language, profile?.birth_date, t.dashboard.notSpecified]);

  const handleCompleteProfile = () => {
    navigate(`/dashboard?redirect=${encodeURIComponent("/start-procedure")}`);
  };

  const handleReturnToDashboard = () => {
    navigate("/dashboard");
  };

  const handleGoToPayment = () => {
    if (!paymentCheckoutPath) {
      return;
    }

    navigate(paymentCheckoutPath);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!user?.email || !profileReadyForProcedure) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = `${countryCode}${phone.trim()}`;
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: profileFullName,
          email: user.email,
          phone: formattedPhone,
          message: message.trim(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = (data as SubmitLeadResponse | null) ?? null;
      if (!response?.leadId) {
        throw new Error(procedureText.submitErrorDescription);
      }

      toast({
        title: procedureText.submitSuccessTitle,
        description: procedureText.submitSuccessDescription,
      });

      navigate(
        `/checkout?leadId=${encodeURIComponent(response.leadId)}&email=${encodeURIComponent(user.email)}`,
        { replace: true },
      );
    } catch (error: unknown) {
      logger.error("Failed to submit the authenticated procedure request", {
        userId: user.id,
        message: getErrorMessage(error),
      });
      toast({
        title: procedureText.submitErrorTitle,
        description:
          error instanceof Error ? error.message : procedureText.submitErrorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/5">
      <Header />

      <main className="section-padding pt-32">
        <div className="section-container space-y-10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReturnToDashboard}
            className="gap-2 rounded-xl px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {procedureText.backToDashboard}
          </Button>

          <div className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <SectionHeading
                badge={procedureText.badge}
                title={procedureText.title}
                highlight={procedureText.titleHighlight}
                subtitle={procedureText.subtitle}
                align="left"
              />

              <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                <CardHeader className="border-b border-border/40 bg-white p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={18} />
                    </div>
                    <CardTitle className="font-display text-xl">{procedureText.profileSummaryTitle}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 p-8 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {procedureText.fullName}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <UserIcon size={14} className="text-primary/60" />
                      {profileFullName}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {procedureText.email}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground break-all">
                      <Mail size={14} className="text-primary/60" />
                      {user?.email || t.dashboard.notSpecified}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {t.dashboard.birthDate}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarDays size={14} className="text-primary/60" />
                      {formattedBirthDate}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {t.dashboard.currentDegree}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <GraduationCap size={14} className="text-primary/60" />
                      {profile?.current_degree || t.dashboard.notSpecified}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {t.dashboard.targetCountry}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.target_country || t.dashboard.notSpecified}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {t.dashboard.targetProgram}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {profile?.target_program || t.dashboard.notSpecified}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              {isLoading ? (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardContent className="flex min-h-[360px] items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      <p className="mt-4 text-sm text-muted-foreground">{procedureText.loading}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : !profileReadyForProcedure ? (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardHeader className="border-b border-border/40 bg-white p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <AlertCircle size={18} />
                      </div>
                      <CardTitle className="font-display text-xl">{procedureText.profileRequiredTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {procedureText.profileRequiredDescription}
                    </p>
                    <Button onClick={handleCompleteProfile} className="w-full rounded-xl">
                      {procedureText.profileRequiredAction}
                    </Button>
                  </CardContent>
                </Card>
              ) : paymentRequiresAction && paymentCheckoutPath ? (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardHeader className="border-b border-border/40 bg-white p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CreditCard size={18} />
                      </div>
                      <CardTitle className="font-display text-xl">{procedureText.resumePaymentTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {procedureText.resumePaymentDescription}
                    </p>
                    <Button onClick={handleGoToPayment} className="w-full rounded-xl">
                      {procedureText.resumePaymentAction}
                    </Button>
                  </CardContent>
                </Card>
              ) : paymentIsPending ? (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardHeader className="border-b border-border/40 bg-white p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Clock size={18} />
                      </div>
                      <CardTitle className="font-display text-xl">{procedureText.pendingTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {procedureText.pendingDescription}
                    </p>
                    <Button onClick={handleReturnToDashboard} variant="outline" className="w-full rounded-xl">
                      {procedureText.backToDashboard}
                    </Button>
                  </CardContent>
                </Card>
              ) : hasActiveProcedure ? (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardHeader className="border-b border-border/40 bg-white p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                        <CheckCircle2 size={18} />
                      </div>
                      <CardTitle className="font-display text-xl">{procedureText.activeTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {procedureText.activeDescription}
                    </p>
                    <Button onClick={handleReturnToDashboard} variant="outline" className="w-full rounded-xl">
                      {procedureText.backToDashboard}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
                  <CardHeader className="border-b border-border/40 bg-white p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText size={18} />
                      </div>
                      <CardTitle className="font-display text-xl">{procedureText.formTitle}</CardTitle>
                    </div>
                    <p className="pt-3 text-sm leading-7 text-muted-foreground">
                      {procedureText.formDescription}
                    </p>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="group relative space-y-2">
                        <label
                          htmlFor="start-procedure-phone"
                          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                        >
                          {procedureText.phone}
                        </label>
                        <div className="flex items-center gap-4 border-b border-border/40 transition-all duration-500 group-focus-within:border-primary">
                          <CountryCodeSelect value={countryCode} onValueChange={setCountryCode} />
                          <Input
                            id="start-procedure-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder={procedureText.phonePlaceholder}
                            required
                            className="h-10 w-full rounded-none border-0 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
                          />
                        </div>
                      </div>

                      <div className="group relative space-y-2">
                        <label
                          htmlFor="start-procedure-message"
                          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                        >
                          {procedureText.message}
                        </label>
                        <Textarea
                          id="start-procedure-message"
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder={procedureText.messagePlaceholder}
                          required
                          rows={5}
                          className="resize-none rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="xl"
                        className="group w-full rounded-xl bg-primary py-7 shadow-none transition-all duration-500 hover:bg-navy"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
                            {procedureText.submitAction}
                            <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[2.5rem] border-border/40 bg-white/90 shadow-soft">
                <CardContent className="space-y-4 p-8">
                  <p className="text-sm font-semibold text-foreground">{procedureText.nextStepsTitle}</p>
                  <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>1. {procedureText.nextStepsProfile}</p>
                    <p>2. {procedureText.nextStepsSubmit}</p>
                    <p>3. {procedureText.nextStepsPayment}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm leading-7 text-foreground">
                    <Phone size={16} className="mb-2 text-primary" />
                    {procedureText.supportHint}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartProcedure;
