import { Smartphone } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  MOBILE_MONEY_PROVIDERS,
  MobileMoneyProviderSelection,
} from "@/lib/mobile-money-payment";
import { cn } from "@/lib/utils";

type MobileMoneyProviderSelectorProps = {
  provider: MobileMoneyProviderSelection;
  providerLabel: string;
  mtnHelper: string;
  orangeHelper: string;
  onProviderChange: (provider: MobileMoneyProviderSelection) => void;
};

export function MobileMoneyProviderSelector({
  provider,
  providerLabel,
  mtnHelper,
  orangeHelper,
  onProviderChange,
}: MobileMoneyProviderSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-foreground">{providerLabel}</Label>
      <div className="grid gap-3 md:grid-cols-2">
        {MOBILE_MONEY_PROVIDERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onProviderChange(item.id)}
            className={cn(
              "rounded-[1.3rem] border p-4 text-left transition-all duration-300",
              provider === item.id
                ? "border-primary/28 bg-primary/8 shadow-medium ring-4 ring-primary/8"
                : "border-border/70 bg-white/72 shadow-soft hover:border-primary/18 hover:shadow-medium",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.id === "mtn" ? mtnHelper : orangeHelper}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
