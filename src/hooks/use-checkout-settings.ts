import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { CheckoutPricingSettings } from "@/lib/checkout-settings";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("CheckoutSettings");

export function useCheckoutSettings() {
  const [settings, setSettings] = useState<CheckoutPricingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        }
      } catch (error: unknown) {
        logger.warn("Failed to load checkout settings", {
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

  return {
    settings,
    isLoading,
  };
}
