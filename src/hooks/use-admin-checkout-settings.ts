import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckoutPricingSettings,
  DEFAULT_CHECKOUT_PRICING,
  formatCheckoutAmountXaf,
  parseCheckoutAmountInput,
} from "@/lib/checkout-settings";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("AdminCheckoutSettings");

type AdminCheckoutSettingsText = {
  invalidAmountTitle: string;
  invalidAmountDescription: string;
  updateSuccessTitle: string;
  updateSuccessDescription: string;
  updateErrorTitle: string;
  updateErrorDescription: string;
};

export function useAdminCheckoutSettings(text: AdminCheckoutSettingsText) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CheckoutPricingSettings>(DEFAULT_CHECKOUT_PRICING);
  const [amountInput, setAmountInput] = useState(DEFAULT_CHECKOUT_PRICING.formattedAmount);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke<CheckoutPricingSettings>(
          "get-checkout-settings",
        );

        if (error) {
          throw error;
        }

        if (isActive && data) {
          setSettings(data);
          setAmountInput(formatCheckoutAmountXaf(data.amountXaf));
        }
      } catch (error: unknown) {
        logger.error("Failed to load admin checkout settings", {
          message: getErrorMessage(error),
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const saveSettings = useCallback(async () => {
    let amountXaf: number;

    try {
      amountXaf = parseCheckoutAmountInput(amountInput);
    } catch {
      toast({
        title: text.invalidAmountTitle,
        description: text.invalidAmountDescription,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke<CheckoutPricingSettings>(
        "update-checkout-settings",
        {
          body: { amountXaf },
        },
      );

      if (error) {
        throw error;
      }

      if (data) {
        setSettings(data);
        setAmountInput(formatCheckoutAmountXaf(data.amountXaf));
      }

      toast({
        title: text.updateSuccessTitle,
        description: text.updateSuccessDescription,
      });
    } catch (error: unknown) {
      logger.error("Failed to update checkout settings", {
        message: getErrorMessage(error),
      });
      toast({
        title: text.updateErrorTitle,
        description: text.updateErrorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [amountInput, text, toast]);

  return {
    amountInput,
    isLoading,
    isSaving,
    settings,
    saveSettings,
    setAmountInput,
  };
}
