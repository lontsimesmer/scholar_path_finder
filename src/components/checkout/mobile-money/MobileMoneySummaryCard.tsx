import { MobileMoneyProviderConfig } from "@/lib/mobile-money-payment";

type MobileMoneySummaryCardProps = {
  provider: MobileMoneyProviderConfig;
  displayedAccount: string | null;
  sendToLabel: string;
  amountLabel: string;
  localAmount: string;
  currency: string;
};

export function MobileMoneySummaryCard({
  provider,
  displayedAccount,
  sendToLabel,
  amountLabel,
  localAmount,
  currency,
}: MobileMoneySummaryCardProps) {
  return (
    <div className="rounded-[1.3rem] border border-border/70 bg-white/72 p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{sendToLabel}</p>
          <p className="mt-2 font-medium text-foreground">{provider.name}</p>
        </div>
        <span className="w-fit rounded-full bg-primary/10 px-4 py-2 font-mono text-sm font-semibold text-primary">
          {displayedAccount}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {amountLabel}: <strong>{localAmount} {currency}</strong> (~$25.00 USD)
      </p>
    </div>
  );
}
