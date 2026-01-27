import { useState } from "react";
import { Smartphone } from "lucide-react";
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

const providers = [
  { id: "mtn", name: "MTN Mobile Money" },
  { id: "orange", name: "Orange Money" },
  { id: "airtel", name: "Airtel Money" },
];

export const MobileMoneyPayment = ({ leadId, onSuccess }: MobileMoneyPaymentProps) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("process-mobile-money", {
        body: {
          leadId,
          provider,
          phoneNumber,
          amount: 25.00,
        },
      });

      if (error) throw error;

      toast({
        title: "Payment Request Sent!",
        description: "Check your phone to approve the payment. You'll receive confirmation once complete.",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Mobile Money error:", err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+237 6XX XXX XXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing || !provider || !phoneNumber}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 mr-2" />
            Pay $25.00 with Mobile Money
          </>
        )}
      </Button>
    </form>
  );
};
