import { useState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StripePaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

export const StripePayment = ({ leadId, onSuccess }: StripePaymentProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [leadEmail, setLeadEmail] = useState<string | null>(null);

  // Fetch lead email if leadId is provided
  useEffect(() => {
    const fetchLeadEmail = async () => {
      if (leadId) {
        // We'll pass the leadId to the edge function which will look up the email
        setLeadEmail(null); // Email will be fetched server-side
      }
    };
    fetchLeadEmail();
  }, [leadId]);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { leadId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Open Stripe Checkout in a new tab
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      toast({
        title: "Payment Error",
        description: err instanceof Error ? err.message : "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="font-medium">Secure Card Payment</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Pay securely with Visa, Mastercard, American Express, or any major credit/debit card.
        </p>
        <div className="flex gap-2 mb-4">
          <img src="https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg" alt="Visa" className="h-8" />
          <img src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg" alt="Mastercard" className="h-8" />
          <img src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg" alt="American Express" className="h-8" />
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Redirecting to Checkout...
          </>
        ) : (
          <>
            <CreditCard className="mr-2" size={18} />
            Pay $25.00 with Card
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        You will be redirected to Stripe's secure checkout page
      </p>
    </div>
  );
};
