import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import {
  ContactFormData,
  ContactFormText,
  SubmitLeadResponse,
  initialContactFormData,
  mergeContactDraft,
} from "@/lib/contact";
import { buildVerifyContactUrl } from "@/lib/contact-verification";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { buildInternationalPhoneNumber } from "@/lib/phone-number";
import { clearProcedureDraft, loadProcedureDraft, saveProcedureDraft } from "@/lib/procedure-draft";
import { buildStudentFullName, ensureStudentProfile, hasValidatedProcedureProfile } from "@/lib/student-profile";
import { readSupabaseFunctionError } from "@/lib/supabase-function-errors";

const logger = createLogger("Contact");

export function useContactForm() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const contactFormText = t.contact.form as ContactFormText;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [countryCode, setCountryCode] = useState("+237");
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [hasValidatedProfile, setHasValidatedProfile] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialContactFormData);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let isActive = true;

    const applyDraft = (userEmail?: string | null, profileIdentity?: { firstName: string; lastName: string } | null) => {
      const draft = loadProcedureDraft();
      if (!draft || !isActive) {
        return;
      }

      setCountryCode(draft.countryCode || "+237");
      setFormData((current) =>
        mergeContactDraft({
          current,
          draft,
          userEmail,
          profileIdentity,
        }),
      );
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
        const profileIdentity = {
          firstName: profile.first_name?.trim() || "",
          lastName: profile.last_name?.trim() || "",
        };

        if (!isActive) {
          return;
        }

        setHasValidatedProfile(hasValidatedProcedureProfile(profile));
        setFormData((current) => ({
          ...current,
          firstName: profileIdentity.firstName || current.firstName,
          lastName: profileIdentity.lastName || current.lastName,
          email: user.email ?? current.email,
        }));
        applyDraft(user.email ?? null, profileIdentity);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const goToProfileCompletion = () => {
    navigate(`/dashboard?redirect=${encodeURIComponent("/start-procedure")}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = formData.email.trim();
    const normalizedFirstName = formData.firstName.trim();
    const normalizedLastName = formData.lastName.trim();
    const fullName = buildStudentFullName(normalizedFirstName, normalizedLastName);
    const formattedPhone = formData.phone ? buildInternationalPhoneNumber(countryCode, formData.phone) : undefined;

    if (!normalizedFirstName || !normalizedLastName || !fullName) {
      toast({
        title: t.contact.form.errorTitle,
        description: t.contact.form.errorMessage,
        variant: "destructive",
      });
      return;
    }

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
          name: fullName,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          phone: formattedPhone,
          message: formData.message,
          password: sessionUser ? undefined : password,
        },
      });

      if (error) {
        throw error;
      }

      const response = (data as SubmitLeadResponse | null) ?? null;
      if (!response?.leadId) {
        throw new Error(contactFormText.errorMessage);
      }

      if (response.accountStatus === "created") {
        if (response.verificationRequired && response.verificationAccessToken && response.verificationChannels?.length) {
          clearProcedureDraft();
          toast({
            title: contactFormText.verificationPendingTitle,
            description: contactFormText.verificationPendingDescription,
          });
          navigate(
            buildVerifyContactUrl({
              token: response.verificationAccessToken,
              email: response.verificationEmail ?? normalizedEmail,
              channels: response.verificationChannels,
              redirect: "/dashboard",
            }),
            { replace: true },
          );
          return;
        }

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
      const functionError = await readSupabaseFunctionError(error);
      const errorMessage = functionError.message || getErrorMessage(error);

      logger.error("Procedure submission failed", {
        code: functionError.code,
        message: errorMessage,
      });

      toast({
        title: functionError.code === "PHONE_ALREADY_USED" ? contactFormText.phoneAlreadyUsedTitle : t.contact.form.errorTitle,
        description:
          functionError.code === "PHONE_ALREADY_USED"
            ? contactFormText.phoneAlreadyUsedDescription
            : errorMessage || t.contact.form.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    t,
    contactFormText,
    countryCode,
    sessionUser,
    isSubmitting,
    isAuthLoading,
    hasValidatedProfile,
    formData,
    password,
    confirmPassword,
    showProfileGate: Boolean(sessionUser) && !isAuthLoading && !hasValidatedProfile,
    setCountryCode,
    setPassword,
    setConfirmPassword,
    handleChange,
    handleSubmit,
    goToProfileCompletion,
  };
}
