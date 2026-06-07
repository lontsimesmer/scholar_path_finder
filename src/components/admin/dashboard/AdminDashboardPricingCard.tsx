import { CircleDollarSign, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminCheckoutSettings } from "@/hooks/use-admin-checkout-settings";

type AdminDashboardPricingText = {
  title: string;
  description: string;
  amountLabel: string;
  amountHelp: string;
  currentPriceLabel: string;
  save: string;
  saving: string;
  loading: string;
  invalidAmountTitle: string;
  invalidAmountDescription: string;
  updateSuccessTitle: string;
  updateSuccessDescription: string;
  updateErrorTitle: string;
  updateErrorDescription: string;
};

type AdminDashboardPricingCardProps = {
  text: AdminDashboardPricingText;
};

export function AdminDashboardPricingCard({ text }: AdminDashboardPricingCardProps) {
  const {
    amountInput,
    isLoading,
    isSaving,
    settings,
    saveSettings,
    setAmountInput,
  } = useAdminCheckoutSettings(text);

  return (
    <Card className="overflow-hidden rounded-[2.25rem] border-primary/10 bg-white shadow-strong">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/10 via-white to-emerald-500/10 px-8 pb-6 pt-8 md:px-8 md:pb-6 md:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-2xl tracking-tight">{text.title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground/80">
              {text.description}
            </CardDescription>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CircleDollarSign className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-7 md:pt-7">
        <div className="space-y-2">
          <Label htmlFor="consultation-price">{text.amountLabel}</Label>
          <div className="relative">
            <Input
              id="consultation-price"
              inputMode="numeric"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              className="h-14 rounded-2xl pr-16 text-lg font-semibold"
              disabled={isLoading || isSaving}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
              XAF
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{text.amountHelp}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <div className="rounded-2xl border border-border/50 bg-secondary/25 px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {text.currentPriceLabel}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {settings.formattedAmount} XAF
            </p>
          </div>

          <Button
            type="button"
            onClick={saveSettings}
            disabled={isLoading || isSaving}
            className="h-14 rounded-2xl px-6"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? text.saving : text.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
