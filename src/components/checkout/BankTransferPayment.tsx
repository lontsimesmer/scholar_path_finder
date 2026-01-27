import { useState } from "react";
import { Building2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BankTransferPaymentProps {
  leadId: string | null;
  onSuccess: () => void;
}

const bankDetails = {
  bankName: "Power Prestation Bank",
  accountName: "Power Prestation Services",
  accountNumber: "1234567890",
  routingNumber: "987654321",
  swift: "PWRPUS33",
  reference: "", // Will be set dynamically
};

export const BankTransferPayment = ({ leadId, onSuccess }: BankTransferPaymentProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const reference = `PP-${leadId?.slice(0, 8).toUpperCase() || "XXXXXX"}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const handleConfirmTransfer = async () => {
    setIsConfirming(true);
    try {
      const { error } = await supabase.functions.invoke("process-bank-transfer", {
        body: {
          leadId,
          reference,
          amount: 25.00,
        },
      });

      if (error) throw error;

      toast({
        title: "Transfer Notification Received",
        description: "We'll verify your payment and send confirmation within 24 hours.",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Bank transfer error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to record transfer. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{value}</span>
        <button
          type="button"
          onClick={() => copyToClipboard(value, label)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {copied === label ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 space-y-1">
        <h4 className="font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Bank Transfer Details
        </h4>
        <p className="text-xs text-muted-foreground">
          Transfer exactly $25.00 USD to the account below
        </p>
      </div>

      <div className="border rounded-lg p-3">
        <DetailRow label="Bank Name" value={bankDetails.bankName} />
        <DetailRow label="Account Name" value={bankDetails.accountName} />
        <DetailRow label="Account Number" value={bankDetails.accountNumber} />
        <DetailRow label="Routing Number" value={bankDetails.routingNumber} />
        <DetailRow label="SWIFT Code" value={bankDetails.swift} />
        <DetailRow label="Reference" value={reference} />
      </div>

      <div className="bg-accent/20 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Important:</strong> Include the reference number in your transfer to help us identify your payment quickly.
        </p>
      </div>

      <Button
        onClick={handleConfirmTransfer}
        className="w-full"
        disabled={isConfirming}
      >
        {isConfirming ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Recording...
          </>
        ) : (
          "I've Made the Transfer"
        )}
      </Button>
    </div>
  );
};
