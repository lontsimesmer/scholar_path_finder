import { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminMetricCardTone = "primary" | "success" | "warning" | "neutral";

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: AdminMetricCardTone;
  className?: string;
  index?: number;
}

const toneClasses: Record<AdminMetricCardTone, { wrapper: string; icon: string; accent: string; ring: string }> = {
  primary: {
    wrapper: "bg-primary/10",
    icon: "text-primary",
    accent: "from-primary/6 via-primary/3 to-transparent",
    ring: "ring-primary/10",
  },
  success: {
    wrapper: "bg-success/10",
    icon: "text-success",
    accent: "from-success/6 via-success/3 to-transparent",
    ring: "ring-success/10",
  },
  warning: {
    wrapper: "bg-amber-500/10",
    icon: "text-amber-600",
    accent: "from-amber-500/6 via-amber-400/3 to-transparent",
    ring: "ring-amber-500/10",
  },
  neutral: {
    wrapper: "bg-secondary/60",
    icon: "text-foreground",
    accent: "from-secondary/30 via-secondary/15 to-transparent",
    ring: "ring-border/20",
  },
};

export const AdminMetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
  className,
  index = 0,
}: AdminMetricCardProps) => {
  const toneClass = toneClasses[tone];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border-border/30 bg-white shadow-soft transition-all duration-500 hover:shadow-medium hover:ring-2",
        toneClass.ring,
        className,
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <CardContent className="relative flex min-h-[11rem] flex-col gap-6 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
        {/* Background gradient */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-700 group-hover:opacity-100", toneClass.accent)} />
        {/* Decorative corner circle */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-current/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative flex items-start justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
            {title}
          </p>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border border-white/60 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:shadow-md",
              toneClass.wrapper,
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", toneClass.icon)} />
          </div>
        </div>

        <div className="relative space-y-1.5">
          <p className="animate-number-in font-display text-[2.25rem] font-bold leading-none text-foreground">{value}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground/70">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
