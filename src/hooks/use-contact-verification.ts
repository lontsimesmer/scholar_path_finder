import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import {
  buildLoginFromVerificationUrl,
  type ContactVerificationStatus,
  type ContactVerificationText,
  parseVerificationChannels,
  sanitizeAppRedirect,
  selectNextPendingVerificationChannel,
  type SendContactVerificationCodeResponse,
  type VerificationChannel,
  type VerifyContactVerificationCodeResponse,
} from "@/lib/contact-verification";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { readSupabaseFunctionError } from "@/lib/supabase-function-errors";

const logger = createLogger("VerifyContact");

type VerificationTextBundle = typeof import("@/i18n/translations/en").en & {
  verification: ContactVerificationText;
};

type ChallengeState = {
  challengeId: string | null;
  expiresAt: string | null;
  maskedDestination: string | null;
  cooldownSeconds: number | null;
};

const EMPTY_CHALLENGE_STATE: ChallengeState = {
  challengeId: null,
  expiresAt: null,
  maskedDestination: null,
  cooldownSeconds: null,
};

const EMPTY_STATUS: ContactVerificationStatus = {
  enabled: false,
  verificationRequired: false,
  pendingChannels: [],
  completedChannels: [],
  channels: {
    email: { required: false, verified: false, maskedDestination: null },
    sms: { required: false, verified: false, maskedDestination: null },
  },
};

export function useContactVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const verificationText = (t as VerificationTextBundle).verification;

  const token = searchParams.get("token")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";
  const redirectTo = sanitizeAppRedirect(searchParams.get("redirect"), "/dashboard");
  const preferredChannels = useMemo(
    () => parseVerificationChannels(searchParams.get("channels")),
    [searchParams],
  );
  const hasPublicVerificationToken = Boolean(token);

  const [status, setStatus] = useState<ContactVerificationStatus>(EMPTY_STATUS);
  const [currentChannel, setCurrentChannel] = useState<VerificationChannel | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const [challenges, setChallenges] = useState<Record<VerificationChannel, ChallengeState>>({
    email: EMPTY_CHALLENGE_STATE,
    sms: EMPTY_CHALLENGE_STATE,
  });

  const goToNextStep = useCallback(
    (options?: { title?: string; description?: string }) => {
      if (options?.title || options?.description) {
        toast({
          title: options.title,
          description: options.description,
        });
      }

      if (hasPublicVerificationToken) {
        navigate(
          buildLoginFromVerificationUrl({
            email,
            redirect: redirectTo,
          }),
          { replace: true },
        );
        return;
      }

      navigate(redirectTo, { replace: true });
    },
    [email, hasPublicVerificationToken, navigate, redirectTo, toast],
  );

  const applyStatus = useCallback(
    (nextStatus: ContactVerificationStatus) => {
      setStatus(nextStatus);

      if (!nextStatus.enabled || !nextStatus.verificationRequired || nextStatus.pendingChannels.length === 0) {
        goToNextStep({
          title: verificationText.alreadyVerifiedTitle,
          description: verificationText.alreadyVerifiedDescription,
        });
        return null;
      }

      const nextChannel = selectNextPendingVerificationChannel(nextStatus.pendingChannels, preferredChannels);
      setCurrentChannel(nextChannel);
      return nextChannel;
    },
    [goToNextStep, preferredChannels, verificationText.alreadyVerifiedDescription, verificationText.alreadyVerifiedTitle],
  );

  const loadStatus = useCallback(async () => {
    if (!hasPublicVerificationToken) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setIsInvalidLink(true);
        setIsLoading(false);
        return null;
      }
    }

    if (!hasPublicVerificationToken) {
      try {
        const { data, error } = await supabase.functions.invoke("get-contact-verification-status", {
          body: {},
        });

        if (error) {
          throw error;
        }

        const nextStatus = (data as ContactVerificationStatus | null) ?? EMPTY_STATUS;
        return applyStatus(nextStatus);
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.error("Failed to load authenticated verification status", { message });
        toast({
          title: verificationText.invalidLinkTitle,
          description: verificationText.invalidLinkDescription,
          variant: "destructive",
        });
        setIsInvalidLink(true);
        return null;
      } finally {
        setIsLoading(false);
      }
    }

    if (!token) {
      setIsInvalidLink(true);
      setIsLoading(false);
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-contact-verification-status", {
        body: { token },
      });

      if (error) {
        throw error;
      }

      const nextStatus = (data as ContactVerificationStatus | null) ?? EMPTY_STATUS;
      return applyStatus(nextStatus);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to load verification status", { message, hasPublicVerificationToken });
      toast({
        title: verificationText.invalidLinkTitle,
        description: verificationText.invalidLinkDescription,
        variant: "destructive",
      });
      setIsInvalidLink(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyStatus,
    hasPublicVerificationToken,
    token,
    toast,
    verificationText.invalidLinkDescription,
    verificationText.invalidLinkTitle,
  ]);

  const sendCode = useCallback(
    async (channel: VerificationChannel) => {
      if (!hasPublicVerificationToken && !(await supabase.auth.getSession()).data.session) {
        return;
      }

      setIsSending(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-contact-verification-code", {
          body: {
            token: token || undefined,
            channel,
            requestedChannels: preferredChannels,
            locale: language,
          },
        });

        if (error) {
          throw error;
        }

        const response = (data as SendContactVerificationCodeResponse | null) ?? null;
        if (!response?.enabled || response.skipped || !response.verificationRequired) {
          goToNextStep({
            title: verificationText.alreadyVerifiedTitle,
            description: verificationText.alreadyVerifiedDescription,
          });
          return;
        }

        setChallenges((current) => ({
          ...current,
          [channel]: {
            challengeId: response.challengeId ?? null,
            expiresAt: response.expiresAt ?? null,
            maskedDestination: response.maskedDestination ?? status.channels[channel].maskedDestination ?? null,
            cooldownSeconds: response.cooldownSeconds ?? null,
          },
        }));

        toast({
          title: verificationText.sentTitle,
          description: verificationText.sentDescription.replace("{channel}", verificationText[`${channel}ChannelLabel`]),
        });
      } catch (error: unknown) {
        const functionError = await readSupabaseFunctionError(error);
        logger.error("Failed to send verification code", {
          channel,
          code: functionError.code,
          message: functionError.message,
        });
        toast({
          title: verificationText.invalidLinkTitle,
          description: functionError.message,
          variant: "destructive",
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      goToNextStep,
      hasPublicVerificationToken,
      language,
      preferredChannels,
      status.channels,
      token,
      toast,
      verificationText,
    ],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (isLoading || !currentChannel) {
      return;
    }

    if (!status.pendingChannels.includes(currentChannel)) {
      return;
    }

    if (challenges[currentChannel].challengeId) {
      return;
    }

    void sendCode(currentChannel);
  }, [challenges, currentChannel, isLoading, sendCode, status.pendingChannels]);

  const handleSelectChannel = async (channel: VerificationChannel) => {
    setCurrentChannel(channel);

    if (!challenges[channel].challengeId) {
      await sendCode(channel);
    }
  };

  const handleVerify = async () => {
    if (!currentChannel) {
      return;
    }

    const challengeId = challenges[currentChannel].challengeId;
    if (!challengeId || code.length !== 6) {
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-contact-verification-code", {
        body: {
          challengeId,
          code,
          token: token || undefined,
        },
      });

      if (error) {
        throw error;
      }

      const response = (data as VerifyContactVerificationCodeResponse | null) ?? null;
      if (!response?.success) {
        throw new Error("Verification failed");
      }

      setCode("");
      setChallenges((current) => ({
        ...current,
        [currentChannel]: EMPTY_CHALLENGE_STATE,
      }));

      if (response.fullyVerified) {
        goToNextStep({
          title: verificationText.verifiedTitle,
          description: verificationText.verifiedDescription,
        });
        return;
      }

      const nextChannel = await loadStatus();
      if (nextChannel) {
        await sendCode(nextChannel);
      }
    } catch (error: unknown) {
      const functionError = await readSupabaseFunctionError(error);
        logger.error("Failed to verify contact code", {
          channel: currentChannel,
          code: functionError.code,
          message: functionError.message,
      });
      toast({
        title: verificationText.invalidLinkTitle,
        description: functionError.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!currentChannel) {
      return;
    }

    setChallenges((current) => ({
      ...current,
      [currentChannel]: EMPTY_CHALLENGE_STATE,
    }));
    await sendCode(currentChannel);
  };

  const currentChallenge = currentChannel ? challenges[currentChannel] : EMPTY_CHALLENGE_STATE;
  const currentDestination =
    currentChallenge.maskedDestination ||
    (currentChannel ? status.channels[currentChannel].maskedDestination : null);

  return {
    verificationText,
    email,
    redirectTo,
    status,
    currentChannel,
    code,
    setCode,
    isLoading,
    isSending,
    isVerifying,
    isInvalidLink,
    currentDestination,
    currentChallenge,
    handleSelectChannel,
    handleVerify,
    handleResend,
    goToLogin: goToNextStep,
  };
}
