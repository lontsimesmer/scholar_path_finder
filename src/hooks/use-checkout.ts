import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { CheckoutIdentity, CheckoutViewModel, PaymentMethod } from "@/lib/checkout";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  ensureStudentProfile,
  hasValidatedProcedureProfile,
} from "@/lib/student-profile";

const logger = createLogger("useCheckout");

interface UseCheckoutOptions {
  navigate: (to: string, options?: { replace?: boolean }) => void;
  requestedEmail: string;
  requestedLeadId: string | null;
  searchQuery: string;
  text: {
    profileRequiredDescription: string;
    profileRequiredTitle: string;
    unavailableDescription: string;
    unavailableTitle: string;
  };
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

export const useCheckout = ({
  navigate,
  requestedEmail,
  requestedLeadId,
  searchQuery,
  text,
  toast,
}: UseCheckoutOptions) => {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [identity, setIdentity] = useState<CheckoutIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");

  const redirectTarget = useMemo(
    () => `/checkout${searchQuery ? `?${searchQuery}` : ""}`,
    [searchQuery],
  );

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
        title: text.unavailableTitle,
        description: text.unavailableDescription,
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
        title: text.profileRequiredTitle,
        description: text.profileRequiredDescription,
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
          title: text.unavailableTitle,
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

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info("Checkout auth state changed", { event, hasSession: Boolean(session) });

      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      if (session) {
        void validateProcedureProfile(session.user);
        return;
      }

      redirectToLogin();
    });

    return () => subscription.unsubscribe();
  }, [
    navigate,
    redirectTarget,
    requestedEmail,
    requestedLeadId,
    text.profileRequiredDescription,
    text.profileRequiredTitle,
    text.unavailableDescription,
    text.unavailableTitle,
    toast,
  ]);

  const handleSignOut = async () => {
    logger.info("Signing out from checkout", { leadId });
    await supabase.auth.signOut();
  };

  const viewModel: CheckoutViewModel = {
    identity,
    isLoading,
    leadId,
    paymentMethod,
    user,
  };

  return {
    actions: {
      handleSignOut,
      setPaymentMethod,
    },
    viewModel,
  };
};
