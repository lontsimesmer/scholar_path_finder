import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_MANUAL_ORANGE_MONEY,
  type ManualOrangeMoneyInstructions,
} from "@/lib/checkout-settings";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("ManualPaymentStatus");

const PENDING_POLL_INTERVAL_MS = 15_000;

export type ManualPaymentStatusValue =
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type ManualPaymentLatestSubmission = {
  id: string;
  status: ManualPaymentStatusValue;
  amount: number;
  currency: string;
  receipt_path: string;
  reviewer_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ManualPaymentStatusResponse = {
  leadId: string;
  leadPaymentStatus: string | null;
  blocked: boolean;
  blockedReason: string | null;
  latestSubmission: ManualPaymentLatestSubmission | null;
  instructions: ManualOrangeMoneyInstructions;
};

type UseManualPaymentStatusParams = {
  leadId: string | null;
};

const isPendingSubmission = (
  submission: ManualPaymentLatestSubmission | null,
  leadPaymentStatus: string | null,
) => {
  if (submission?.status === "pending_review") return true;
  if (leadPaymentStatus === "bank_transfer_pending") return true;
  return false;
};

export function useManualPaymentStatus({ leadId }: UseManualPaymentStatusParams) {
  const [status, setStatus] = useState<ManualPaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(true);
  const intervalRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!leadId) {
      setStatus(null);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<
        ManualPaymentStatusResponse
      >("get-manual-payment-status", {
        body: { leadId },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (isActiveRef.current && data) {
        setStatus({
          ...data,
          instructions: data.instructions ?? DEFAULT_MANUAL_ORANGE_MONEY,
        });
        setError(null);
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      logger.warn("Failed to load manual payment status", { leadId, message });
      if (isActiveRef.current) {
        setError(message);
      }
    }
  }, [leadId]);

  useEffect(() => {
    isActiveRef.current = true;

    if (!leadId) {
      setStatus(null);
      setIsLoading(false);
      return () => {
        isActiveRef.current = false;
      };
    }

    setIsLoading(true);
    void refresh().finally(() => {
      if (isActiveRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      isActiveRef.current = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [leadId, refresh]);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!leadId) {
      return;
    }

    const shouldPoll =
      status === null ||
      isPendingSubmission(status.latestSubmission ?? null, status.leadPaymentStatus);

    if (!shouldPoll) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      void refresh();
    }, PENDING_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [leadId, refresh, status]);

  return {
    status,
    isLoading,
    error,
    refresh,
  };
}
