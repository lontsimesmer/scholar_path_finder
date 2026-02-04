import { useState, useEffect } from "react";
import { Smartphone, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MobileMoneyPaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

interface Currency {
  code: string;
  rate: number;
  amount: string;
}

const providers = [
  { id: "mtn", name: "MTN Mobile Money", account: "651831709", hasApi: true },
  { id: "orange", name: "Orange Money", account: "690830651", hasApi: false },
];

export const MobileMoneyPayment = ({ leadId, onSuccess }: MobileMoneyPaymentProps) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [localAmount, setLocalAmount] = useState<string>("15625"); // Default XAF amount

  // Fetch available currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
          body: { action: "get_currencies" },
        });
        
        if (!error && data?.currencies) {
          setCurrencies(data.currencies);
          const xaf = data.currencies.find((c: Currency) => c.code === "XAF");
          if (xaf) setLocalAmount(xaf.amount);
        }
      } catch (err) {
        console.error("Failed to fetch currencies:", err);
      }
    };
    
    fetchCurrencies();
  }, []);

  // Update local amount when currency changes
  useEffect(() => {
    const curr = currencies.find(c => c.code === currency);
    if (curr) {
      setLocalAmount(curr.amount);
    }
  }, [currency, currencies]);

  const handleMTNPayment = async () => {
    if (!phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter your MTN phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("pending");
    
    try {
      const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
        body: {
          action: "request_payment",
          leadId,
          phoneNumber,
          currency,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTransactionRef(data.referenceId || data.transactionId);
        
        if (data.status === "pending_verification") {
          // Manual verification flow
          toast({
            title: "Payment Instructions",
            description: data.message,
          });
        } else {
          // API flow - payment request sent
          toast({
            title: "Payment Request Sent!",
            description: "Check your phone to approve the MTN Mobile Money payment.",
          });
          
          // Start polling for status
          pollPaymentStatus(data.referenceId);
        }
      } else {
        throw new Error(data?.error || "Payment request failed");
      }
    } catch (err: any) {
      console.error("MTN MoMo error:", err);
      setPaymentStatus("failed");
      toast({
        title: "Payment Error",
        description: err.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrangePayment = async () => {
    if (!phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter your Orange phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { error } = await supabase.functions.invoke("process-mobile-money", {
        body: {
          leadId,
          provider: "orange",
          phoneNumber,
          amount: 25.00,
        },
      });

      if (error) throw error;

      setPaymentStatus("pending");
      toast({
        title: "Payment Confirmation Received!",
        description: "Please send the payment to Orange Money 690830651. We'll verify and contact you shortly.",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Orange Money error:", err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (referenceId: string) => {
    let attempts = 0;
    const maxAttempts = 12; // 2 minutes with 10-second intervals
    
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus("pending");
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. We'll notify you once confirmed.",
        });
        return;
      }
      
      attempts++;
      setIsCheckingStatus(true);
      
      try {
        const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
          body: {
            action: "check_status",
            referenceId,
            leadId,
          },
        });

        if (error) throw error;

        if (data?.status === "SUCCESSFUL") {
          setPaymentStatus("success");
          toast({
            title: "Payment Successful!",
            description: "Your payment has been confirmed. Thank you!",
          });
          onSuccess();
          return;
        } else if (data?.status === "FAILED") {
          setPaymentStatus("failed");
          toast({
            title: "Payment Failed",
            description: "The payment was not completed. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Continue polling
        setTimeout(checkStatus, 10000);
      } catch (err) {
        console.error("Status check error:", err);
        setTimeout(checkStatus, 10000);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    setTimeout(checkStatus, 5000);
  };

  const handleCheckStatus = async () => {
    if (!transactionRef) return;
    
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
        body: {
          action: "check_status",
          referenceId: transactionRef,
          leadId,
        },
      });

      if (error) throw error;

      if (data?.status === "SUCCESSFUL") {
        setPaymentStatus("success");
        toast({
          title: "Payment Confirmed!",
          description: "Your payment has been verified.",
        });
        onSuccess();
      } else if (data?.status === "FAILED") {
        setPaymentStatus("failed");
        toast({
          title: "Payment Failed",
          description: "The payment was not completed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Pending",
          description: data?.message || "Still waiting for confirmation.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to check status.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider) {
      toast({
        title: "Select Provider",
        description: "Please select a mobile money provider.",
        variant: "destructive",
      });
      return;
    }

    if (provider === "mtn") {
      await handleMTNPayment();
    } else {
      await handleOrangePayment();
    }
  };

  const selectedProvider = providers.find(p => p.id === provider);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Mobile Money Provider</Label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} {p.hasApi && "(Automated)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {provider === "mtn" && currencies.length > 0 && (
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} - {c.amount} (≈$25 USD)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedProvider && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">
            {provider === "mtn" ? "Payment will be requested from your phone" : "Send payment to:"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{selectedProvider.name} Account:</span>
            <span className="font-mono font-semibold text-primary">{selectedProvider.account}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Amount: <strong>{localAmount} {currency}</strong> (≈$25.00 USD)
          </p>
          {provider === "mtn" && (
            <p className="text-xs text-primary mt-1">
              ✓ Automated payment request - approve on your phone
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Your Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+237 6XX XXX XXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {provider === "mtn" 
            ? "You will receive a payment request on this number"
            : "We'll contact you on this number for confirmation"
          }
        </p>
      </div>

      {paymentStatus === "pending" && transactionRef && (
        <div className="bg-accent/50 rounded-lg p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Payment Pending
            </p>
            <p className="text-xs text-muted-foreground">
              Waiting for confirmation...
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              "Check Status"
            )}
          </Button>
        </div>
      )}

      {paymentStatus === "success" && (
        <div className="bg-primary/10 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Payment Confirmed!
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing || !provider || !phoneNumber || paymentStatus === "success"}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Processing...
          </>
        ) : paymentStatus === "pending" ? (
          <>
            <Clock className="w-4 h-4 mr-2" />
            Waiting for Confirmation...
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 mr-2" />
            {provider === "mtn" ? "Request Payment" : "I've Sent Payment - Confirm"}
          </>
        )}
      </Button>
    </form>
  );
};
