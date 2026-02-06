import { useState, useEffect } from "react";
import { X, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CardPaymentData) => void;
  isProcessing?: boolean;
}

export interface CardPaymentData {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  country: string;
}

const cardBrands = [
  { name: "Visa", color: "#1A1F71", textColor: "#FFFFFF" },
  { name: "Mastercard", color: "#EB001B", textColor: "#FFFFFF" },
  { name: "Amex", color: "#006FCF", textColor: "#FFFFFF" },
  { name: "Discover", color: "#FF6600", textColor: "#FFFFFF" },
];

const countries = [
  "Cameroon",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Kenya",
  "United States",
  "United Kingdom",
  "France",
  "Germany",
  "Netherlands",
  "Canada",
];

export const CardPaymentModal = ({ open, onClose, onSubmit, isProcessing }: CardPaymentModalProps) => {
  const [currentBrandIndex, setCurrentBrandIndex] = useState(0);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [country, setCountry] = useState("");

  // Rotate card brands every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBrandIndex((prev) => (prev + 1) % cardBrands.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const groups = numbers.match(/.{1,4}/g) || [];
    return groups.join(" ").substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length >= 2) {
      return `${numbers.substring(0, 2)} / ${numbers.substring(2, 4)}`;
    }
    return numbers;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "");
    setCvc(numbers.substring(0, 4));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ cardNumber, expiryDate, cvc, country });
  };

  const currentBrand = cardBrands[currentBrandIndex];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold">Card Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber" className="text-sm text-muted-foreground">
              Card number
            </Label>
            <div className="relative">
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 1234 1234 1234"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="pr-16 h-12 text-base border-border"
                required
              />
              <div 
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-bold transition-all duration-500"
                style={{ 
                  backgroundColor: currentBrand.color, 
                  color: currentBrand.textColor 
                }}
              >
                {currentBrand.name.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Expiration Date and Security Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="text-sm text-muted-foreground">
                Expiration date
              </Label>
              <Input
                id="expiryDate"
                type="text"
                placeholder="MM / YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                className="h-12 text-base border-border"
                maxLength={7}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvc" className="text-sm text-muted-foreground">
                Security code
              </Label>
              <div className="relative">
                <Input
                  id="cvc"
                  type="text"
                  placeholder="CVC"
                  value={cvc}
                  onChange={handleCvcChange}
                  className="pr-12 h-12 text-base border-border"
                  maxLength={4}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm text-muted-foreground">
              Country
            </Label>
            <Select value={country} onValueChange={setCountry} required>
              <SelectTrigger className="h-12 text-base border-border">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isProcessing || !cardNumber || !expiryDate || !cvc || !country}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
          >
            {isProcessing ? "Processing..." : "Pay $25"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
