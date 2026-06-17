import { LogOut } from "lucide-react";

import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";

interface CheckoutHeroProps {
  packageTitle: string;
  signedInAs: string;
  signOut: string;
  subtitle: string;
  title: string;
  titleHighlight: string;
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

export const CheckoutHero = ({
  packageTitle,
  signedInAs,
  signOut,
  subtitle,
  title,
  titleHighlight,
  userEmail,
  onSignOut,
}: CheckoutHeroProps) => (
  <div className="surface-panel overflow-hidden px-6 py-6 md:px-8 md:py-7">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <BrandMark size="lg" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/55">
              Power Prestation
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{packageTitle}</p>
          </div>
        </div>
        <div className="space-y-3">
          <span className="section-kicker border-primary/10 bg-white/70 text-secondary-foreground shadow-soft">
            <span className="eyebrow-dot" />
            {subtitle.split(".")[0]}
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-5xl">
            {title.replace(titleHighlight, "")}
            <span className="text-primary">{titleHighlight}</span>
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 rounded-[1.4rem] border border-border/70 bg-white/68 px-5 py-4 shadow-soft lg:items-end">
        {userEmail ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {signedInAs}
            </p>
            <p className="break-all text-sm font-medium text-foreground">{userEmail}</p>
          </>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => void onSignOut()} className="gap-2">
          <LogOut className="h-4 w-4" />
          {signOut}
        </Button>
      </div>
    </div>
  </div>
);
