import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalPaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

export const PayPalPayment = ({ leadId, onSuccess }: PayPalPaymentProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayPalScript();
  }, []);

  const loadPayPalScript = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-paypal-client-id");

      if (error || !data?.clientId) {
        console.error("Failed to get PayPal client ID:", error);
        setError("PayPal is temporarily unavailable. Please try another payment method.");
        setIsLoading(false);
        return;
      }

      setIsSandbox(data.isSandbox || false);

      // Check if script already loaded
      if (window.paypal) {
        setIsLoading(false);
        initializePayPalButtons();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${data.clientId}&currency=USD`;
      script.async = true;
      script.onload = () => {
        setIsLoading(false);
        initializePayPalButtons();
      };
      script.onerror = () => {
        setError("Failed to load PayPal. Please try another payment method.");
        setIsLoading(false);
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error("Error loading PayPal:", err);
      setError("Failed to initialize PayPal.");
      setIsLoading(false);
    }
  };

  const initializePayPalButtons = () => {
    if (!window.paypal) return;

    const container = document.getElementById("paypal-button-container");
    if (!container) return;
    
    // Clear any existing buttons
    container.innerHTML = "";

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "pay",
        },
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              {
                description: "Power Prestation - Initial Consultation",
                amount: {
                  value: "25.00",
                  currency_code: "USD",
                },
              },
            ],
          });
        },
        onApprove: async (_data: any, actions: any) => {
          setIsProcessing(true);
          try {
            const details = await actions.order.capture();

            const { error } = await supabase.functions.invoke("process-payment", {
              body: {
                leadId: leadId,
                paypalOrderId: details.id,
                paymentDetails: details,
              },
            });

            if (error) {
              throw new Error(error.message);
            }

            toast({
              title: "Payment Successful!",
              description: "Check your email for confirmation and next steps.",
            });

            onSuccess();
          } catch (err: any) {
            console.error("Payment processing error:", err);
            toast({
              title: "Payment Error",
              description: err.message || "Failed to process payment. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          toast({
            title: "Payment Error",
            description: "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment. Feel free to try again when ready.",
          });
        },
      })
      .render("#paypal-button-container");
  };

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isSandbox && (
        <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-2 text-accent-foreground">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Test Mode Active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Use test credentials to simulate payments.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div id="paypal-button-container" className="min-h-[150px]"></div>

          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Processing your payment...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
