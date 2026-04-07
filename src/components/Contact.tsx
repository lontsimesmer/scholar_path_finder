import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail, MapPin, Phone } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import SectionHeading from "@/components/SectionHeading";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  buildStudentFullName,
  ensureStudentProfile,
  hasValidatedProcedureProfile,
} from "@/lib/student-profile";
import {
  clearProcedureDraft,
  loadProcedureDraft,
  saveProcedureDraft,
} from "@/lib/procedure-draft";

type SubmitLeadResponse = {
  success?: boolean;
  leadId?: string;
  accountStatus?: "authenticated" | "created" | "existing_requires_sign_in" | "none";
  leadReused?: boolean;
  alreadyActive?: boolean;
};

interface ContactProps {
  standalone?: boolean;
}

const logger = createLogger("Contact");

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

const Contact = ({ standalone = false }: ContactProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const contactFormText = t.contact.form as typeof t.contact.form & {
    password: string;
    passwordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    createAccountHint: string;
    signedInHint: string;
    existingAccountTitle: string;
    existingAccountDescription: string;
    accountCreatedTitle: string;
    accountCreatedDescription: string;
    completeProfileTitle: string;
    completeProfileDescription: string;
    completeProfileAction: string;
    submitProcedure: string;
    createAccountAndSubmit: string;
    passwordMismatchTitle: string;
    passwordMismatchDescription: string;
    passwordRequiredTitle: string;
    passwordRequiredDescription: string;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [countryCode, setCountryCode] = useState("+237");
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [hasValidatedProfile, setHasValidatedProfile] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const contactInfo = [
    {
      icon: Mail,
      label: t.contact.info.email,
      value: "powerprestationint@gmail.com",
      href: "mailto:powerprestationint@gmail.com",
    },
    {
      icon: Phone,
      label: t.contact.info.phone,
      value: "+(237) 674 819 411",
      href: "tel:+237674819411",
    },
    {
      icon: MapPin,
      label: t.contact.info.office,
      value: t.contact.info.officeValue,
      href: "https://www.google.com/maps/search/?api=1&query=FOUDA%2C%20derriere%20le%20FNE-Yaounde",
    },
  ];

  useEffect(() => {
    let isActive = true;

    const applyDraft = (nextUserEmail?: string | null, nextProfileName?: string | null) => {
      const draft = loadProcedureDraft();
      if (!draft || !isActive) {
        return;
      }

      setCountryCode(draft.countryCode || "+237");
      setFormData((current) => ({
        ...current,
        name: nextProfileName || current.name || draft.name,
        email: nextUserEmail || current.email || draft.email,
        phone: draft.phone || current.phone,
        message: draft.message || current.message,
      }));
    };

    const syncSession = async (user: User | null) => {
      if (!isActive) {
        return;
      }

      setSessionUser(user);

      if (!user) {
        setHasValidatedProfile(false);
        applyDraft();
        setIsAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureStudentProfile(user);
        const validatedProfile = hasValidatedProcedureProfile(profile);
        const profileName = buildStudentFullName(profile.first_name, profile.last_name);

        if (!isActive) {
          return;
        }

        setHasValidatedProfile(validatedProfile);
        setFormData((current) => ({
          ...current,
          name: profileName || current.name,
          email: user.email ?? current.email,
        }));
        applyDraft(user.email ?? null, profileName);
      } catch (error: unknown) {
        logger.error("Failed to resolve profile state for the procedure form", {
          message: getErrorMessage(error),
        });
      } finally {
        if (isActive) {
          setIsAuthLoading(false);
        }
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => syncSession(session?.user ?? null))
      .catch((error: unknown) => {
        logger.error("Failed to load auth session for the procedure form", {
          message: getErrorMessage(error),
        });
        if (isActive) {
          setIsAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.user ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const persistDraft = () => {
    saveProcedureDraft({
      ...formData,
      countryCode,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = formData.email.trim();
    const formattedPhone = formData.phone ? `${countryCode}${formData.phone}` : undefined;

    if (!sessionUser) {
      if (!password || !confirmPassword) {
        toast({
          title: contactFormText.passwordRequiredTitle,
          description: contactFormText.passwordRequiredDescription,
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: contactFormText.passwordMismatchTitle,
          description: contactFormText.passwordMismatchDescription,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    logger.info("Submitting procedure form", {
      hasSessionUser: Boolean(sessionUser),
      hasValidatedProfile,
      hasPhone: Boolean(formattedPhone),
      hasPassword: Boolean(password),
    });

    try {
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: formData.name,
          email: normalizedEmail,
          phone: formattedPhone,
          message: formData.message,
          password: sessionUser ? undefined : password,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = (data as SubmitLeadResponse | null) ?? null;
      if (!response?.leadId) {
        throw new Error(contactFormText.errorMessage);
      }

      if (response.accountStatus === "created") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        clearProcedureDraft();
        toast({
          title: contactFormText.accountCreatedTitle,
          description: contactFormText.accountCreatedDescription,
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      if (response.accountStatus === "existing_requires_sign_in") {
        persistDraft();
        toast({
          title: contactFormText.existingAccountTitle,
          description: contactFormText.existingAccountDescription,
        });
        navigate(
          `/login?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent("/start-procedure")}`,
          { replace: true },
        );
        return;
      }

      clearProcedureDraft();
      toast({
        title: t.contact.form.successTitle,
        description: t.contact.form.successMessage,
      });
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      logger.error("Procedure submission failed", { message: getErrorMessage(error) });
      toast({
        title: t.contact.form.errorTitle,
        description: error instanceof Error ? error.message : t.contact.form.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const goToProfileCompletion = () => {
    navigate(`/dashboard?redirect=${encodeURIComponent("/start-procedure")}`);
  };

  const showProfileGate = sessionUser && !isAuthLoading && !hasValidatedProfile;
  const sectionClassName = standalone ? "section-padding bg-secondary/5 pt-32" : "section-padding bg-white";

  return (
    <section id={standalone ? undefined : "contact"} className={sectionClassName}>
      <div className="section-container">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="animate-in space-y-12 fade-in slide-in-from-left-4 duration-1000">
            <SectionHeading
              badge={t.contact.badge}
              title={t.contact.title}
              highlight={t.contact.titleHighlight}
              subtitle={t.contact.subtitle}
              align="left"
            />

            <div className="grid gap-6">
              {contactInfo.map((info) => (
                <a
                  key={info.label}
                  href={info.href}
                  className="group flex items-start gap-6 transition-transform hover:translate-x-1"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary transition-all group-hover:bg-primary group-hover:text-white">
                    <info.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {info.label}
                    </p>
                    <p className="text-base font-semibold text-foreground/80">{info.value}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="rounded-[2rem] border border-border/40 bg-secondary/30 p-8">
              <h4 className="font-display text-xl font-bold text-foreground">{t.hero.advisoryLabel}</h4>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80">{t.footer.ctaDescription}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
                <span>
                  {t.hero.stats.successRate} {t.contact.successRateSuffix}
                </span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

          <Card className="animate-in border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] fade-in slide-in-from-right-4 duration-1000 delay-200">
            <CardContent className="p-8 lg:p-16">
              <div className="mb-12">
                <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {t.contact.form.title}
                </h3>
                <div className="mt-2 h-0.5 w-10 bg-primary/20" />
              </div>

              {showProfileGate ? (
                <div className="space-y-8">
                  <div className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-6">
                    <p className="text-lg font-semibold text-foreground">
                      {contactFormText.completeProfileTitle}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-amber-900">
                      {contactFormText.completeProfileDescription}
                    </p>
                  </div>
                  <Button onClick={goToProfileCompletion} className="w-full">
                    {contactFormText.completeProfileAction}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="rounded-[1.2rem] border border-border/40 bg-secondary/20 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {sessionUser ? contactFormText.signedInHint : contactFormText.createAccountHint}
                  </div>

                  <div className="grid gap-10 sm:grid-cols-2">
                    <div className="group relative space-y-2">
                      <label
                        htmlFor="name"
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                      >
                        {t.contact.form.name}
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t.contact.form.namePlaceholder}
                        required
                        disabled={Boolean(sessionUser)}
                        className="h-10 rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>

                    <div className="group relative space-y-2">
                      <label
                        htmlFor="email"
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                      >
                        {t.contact.form.email}
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t.contact.form.emailPlaceholder}
                        required
                        disabled={Boolean(sessionUser)}
                        className="h-10 rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  {!sessionUser ? (
                    <div className="grid gap-10 sm:grid-cols-2">
                      <div className="group relative space-y-2">
                        <label
                          htmlFor="password"
                          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                        >
                          {contactFormText.password}
                        </label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={contactFormText.passwordPlaceholder}
                          required
                          minLength={8}
                          className="h-10 rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                        />
                      </div>
                      <div className="group relative space-y-2">
                        <label
                          htmlFor="confirm-password"
                          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                        >
                          {contactFormText.confirmPassword}
                        </label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder={contactFormText.confirmPasswordPlaceholder}
                          required
                          minLength={8}
                          className="h-10 rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="group relative space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                    >
                      {t.contact.form.phone}
                    </label>
                    <div className="flex items-center gap-4 border-b border-border/40 transition-all duration-500 group-focus-within:border-primary">
                      <CountryCodeSelect value={countryCode} onValueChange={setCountryCode} />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="674 819 411"
                        required
                        className="h-10 w-full rounded-none border-0 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="group relative space-y-2">
                    <label
                      htmlFor="message"
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
                    >
                      {t.contact.form.message}
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder={t.contact.form.messagePlaceholder}
                      required
                      rows={4}
                      className="resize-none rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="xl"
                      className="group relative w-full overflow-hidden bg-primary py-7 shadow-none transition-all duration-500 hover:bg-navy"
                      disabled={isSubmitting || isAuthLoading}
                    >
                      {isSubmitting || isAuthLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
                          {sessionUser ? contactFormText.submitProcedure : contactFormText.createAccountAndSubmit}
                          <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                        </span>
                      )}
                    </Button>

                    <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground/40">
                      {t.contact.form.privacyNote}
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
