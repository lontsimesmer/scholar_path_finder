import { CreditCard, Smartphone, Building2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type PaymentMethod = "card" | "mobile_money" | "bank_transfer";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

const paymentMethods = [
  {
    id: "card" as PaymentMethod,
    name: "Credit/Debit Card",
    description: "Pay securely with Visa, Mastercard, or any major card",
    icon: CreditCard,
  },
  {
    id: "mobile_money" as PaymentMethod,
    name: "Mobile Money",
    description: "MTN, Orange, Airtel Money",
    icon: Smartphone,
  },
  {
    id: "bank_transfer" as PaymentMethod,
    name: "Bank Transfer",
    description: "Direct bank transfer (manual confirmation)",
    icon: Building2,
  },
];

export const PaymentMethodSelector = ({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Select Payment Method</Label>
      <RadioGroup
        value={selectedMethod}
        onValueChange={(value) => onMethodChange(value as PaymentMethod)}
        className="space-y-3"
      >
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedMethod === method.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => onMethodChange(method.id)}
          >
            <RadioGroupItem value={method.id} id={method.id} />
            <method.icon className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label htmlFor={method.id} className="cursor-pointer font-medium">
                {method.name}
              </Label>
              <p className="text-xs text-muted-foreground">{method.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
