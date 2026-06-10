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
}

const toneClasses: Record<AdminMetricCardTone, { wrapper: string; icon: string }> = {
  primary: {
    wrapper: "bg-primary/10",
    icon: "text-primary",
  },
  success: {
    wrapper: "bg-success/10",
    icon: "text-success",
  },
  warning: {
    wrapper: "bg-warning/10",
    icon: "text-warning",
  },
  neutral: {
    wrapper: "bg-secondary/60",
    icon: "text-foreground",
  },
};

export const AdminMetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
  className,
}: AdminMetricCardProps) => {
  const toneClass = toneClasses[tone];

  return (
    <Card
      className={cn(
        "rounded-xl border border-border/40 bg-white shadow-none",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5 pt-5 md:p-5 md:pt-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              toneClass.wrapper,
            )}
          >
            <Icon className={cn("h-4 w-4", toneClass.icon)} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
