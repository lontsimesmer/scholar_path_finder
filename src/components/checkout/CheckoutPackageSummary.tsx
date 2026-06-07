import { Check, ChevronDown, Shield } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface CheckoutPackageSummaryProps {
  benefits: {
    expert: string;
    session: string;
    secure: string;
    tailored: string;
  };
  guaranteeDescription: string;
  guaranteeTitle: string;
  includedItems: string[];
  includedTitle: string;
  packageCurrency: string;
  packageDescription: string;
  packagePrice: string;
  packageTitle: string;
  questions: string;
}

export const CheckoutPackageSummary = ({
  benefits,
  guaranteeDescription,
  guaranteeTitle,
  includedItems,
  includedTitle,
  packageCurrency,
  packageDescription,
  packagePrice,
  packageTitle,
  questions,
}: CheckoutPackageSummaryProps) => (
  <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
    <Card className="overflow-hidden border-white/70 shadow-strong">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(62,96,210,0.15),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(239,244,255,0.98))] px-7 py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {packageTitle}
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{packageDescription}</p>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold text-primary">{packagePrice}</span>
            <span className="pb-2 text-muted-foreground">{packageCurrency}</span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-6 pt-6 md:pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {[benefits.expert, benefits.session, benefits.secure, benefits.tailored].map((benefit) => (
            <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/70 px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-3 w-3 text-primary" />
              </span>
              <p className="text-sm leading-6 text-foreground/85">{benefit}</p>
            </div>
          ))}
        </div>

        <details className="group rounded-[1.25rem] border border-border/70 bg-secondary/25 px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground">
            {includedTitle}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-4 space-y-3 border-t border-border/50 pt-4">
            {includedItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm leading-6 text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="rounded-[1.25rem] border border-primary/10 bg-primary/6 p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">{guaranteeTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{guaranteeDescription}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <details className="group rounded-[1.5rem] border border-border/70 bg-white/68 p-5 shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
        {questions}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4 text-sm font-medium">
        <a href="mailto:powerprestationint@gmail.com" className="break-all text-primary hover:underline">
          powerprestationint@gmail.com
        </a>
        <a href="tel:+237674819411" className="text-primary hover:underline">
          +(237)674819411
        </a>
      </div>
    </details>
  </div>
);
