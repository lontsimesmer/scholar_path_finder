import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { splitInternationalPhoneNumber } from "@/lib/country-codes";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { buildInternationalPhoneNumber } from "@/lib/phone-number";
import { clearProcedureDraft, loadProcedureDraft } from "@/lib/procedure-draft";
import {
  ProcedureLeadSummary,
  buildProcedureCheckoutPath,
  doesProcedurePaymentRequireAction,
  isProcedurePaymentPending,
} from "@/lib/procedure-lead";
import { StartProcedureText, SubmitLeadResponse } from "@/lib/start-procedure";
import {
  StudentProfileRecord,
  buildStudentFullName,
  ensureStudentProfile,
  getStudentDisplayName,
  hasValidatedProcedureProfile,
} from "@/lib/student-profile";
import { readSupabaseFunctionError } from "@/lib/supabase-function-errors";

const logger = createLogger("useStartProcedure");

interface UseStartProcedureOptions {
  language: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  notSpecified: string;
  text: StartProcedureText;
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

export const useStartProcedure = ({
  language,
  navigate,
  notSpecified,
  text,
  toast,
}: UseStartProcedureOptions) => {
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
        const draft = loadProcedureDraft();
        setCountryCode(draft?.countryCode || resolvedPhone.countryCode);
        setPhone(draft?.phone || resolvedPhone.localNumber);
        setMessage(draft?.message || "");

        const { data, error } = await supabase.functions.invoke("get-student-procedure-status", {
          body: {},
        });

        if (error) {
          logger.error("Procedure lead summary fetch failed on the procedure page", {
            userId: currentUser.id,
            message: error.message,
          });
          setProcedureLead(null);
        } else {
          setProcedureLead((data?.lead as ProcedureLeadSummary | null) ?? null);
        }
      } catch (error: unknown) {
        logger.error("Failed to load the private procedure page", {
          userId: currentUser.id,
          message: getErrorMessage(error),
        });
        toast({
          title: text.loadErrorTitle,
          description: text.loadErrorDescription,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [text.loadErrorDescription, text.loadErrorTitle, toast],
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }

      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      if (!session?.user || event === "SIGNED_OUT") {
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
      return notSpecified;
    }

    return new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString(
      language === "fr" ? "fr-FR" : "en-US",
    );
  }, [language, notSpecified, profile?.birth_date]);

  const handleCompleteProfile = useCallback(() => {
    navigate(`/dashboard?redirect=${encodeURIComponent("/start-procedure")}`);
  }, [navigate]);

  const handleReturnToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const handleGoToPayment = useCallback(() => {
    if (!paymentCheckoutPath) {
      return;
    }

    navigate(paymentCheckoutPath);
  }, [navigate, paymentCheckoutPath]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!user?.email || !profileReadyForProcedure) {
        return;
      }

      setIsSubmitting(true);

      try {
        const formattedPhone = buildInternationalPhoneNumber(countryCode, phone);
        const { data, error } = await supabase.functions.invoke("submit-lead", {
          body: {
            name: profileFullName,
            email: user.email,
            phone: formattedPhone,
            message: message.trim(),
          },
        });

        if (error) {
          throw error;
        }

        const response = (data as SubmitLeadResponse | null) ?? null;
        if (!response?.leadId) {
          throw new Error(text.submitErrorDescription);
        }

        toast({
          title: text.submitSuccessTitle,
          description: text.submitSuccessDescription,
        });
        clearProcedureDraft();

        navigate(
          `/checkout?leadId=${encodeURIComponent(response.leadId)}&email=${encodeURIComponent(user.email)}`,
          { replace: true },
        );
      } catch (error: unknown) {
        const functionError = await readSupabaseFunctionError(error);
        const errorMessage = functionError.message || getErrorMessage(error);

        logger.error("Failed to submit the authenticated procedure request", {
          userId: user.id,
          code: functionError.code,
          message: errorMessage,
        });
        toast({
          title:
            functionError.code === "PHONE_ALREADY_USED"
              ? text.phoneAlreadyUsedTitle
              : text.submitErrorTitle,
          description:
            functionError.code === "PHONE_ALREADY_USED"
              ? text.phoneAlreadyUsedDescription
              : errorMessage || text.submitErrorDescription,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      countryCode,
      message,
      navigate,
      phone,
      profileFullName,
      profileReadyForProcedure,
      text.phoneAlreadyUsedDescription,
      text.phoneAlreadyUsedTitle,
      text.submitErrorDescription,
      text.submitErrorTitle,
      text.submitSuccessDescription,
      text.submitSuccessTitle,
      toast,
      user,
    ],
  );

  return {
    actions: {
      handleCompleteProfile,
      handleGoToPayment,
      handleReturnToDashboard,
      handleSubmit,
    },
    state: {
      countryCode,
      formattedBirthDate,
      hasActiveProcedure,
      isLoading,
      isSubmitting,
      message,
      paymentCheckoutPath,
      paymentIsPending,
      paymentRequiresAction,
      phone,
      procedureLead,
      profile,
      profileDisplayName,
      profileFullName,
      profileReadyForProcedure,
      user,
    },
    setters: {
      setCountryCode,
      setMessage,
      setPhone,
    },
  };
};
