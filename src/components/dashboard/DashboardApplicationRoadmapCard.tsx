import { CheckCircle2, Clock, Globe, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Application, DashboardText } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface DashboardApplicationRoadmapCardProps {
  application: Application;
  currentStatusIndex: number;
  roadmapSteps: string[];
  text: DashboardText;
}

export const DashboardApplicationRoadmapCard = ({
  application,
  currentStatusIndex,
  roadmapSteps,
  text,
}: DashboardApplicationRoadmapCardProps) => {
  const progressPercent = roadmapSteps.length > 1
    ? Math.round((currentStatusIndex / (roadmapSteps.length - 1)) * 100)
    : 0;

  return (
    <Card className="overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <Globe size={20} />
            </div>
            <CardTitle className="font-display text-2xl tracking-tight">{text.roadmapTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="h-2.5 w-28 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-display text-sm font-bold tabular-nums text-primary">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-8 md:pt-8 lg:p-12 lg:pt-12">
        {application.notes ? (
          <div className="flex gap-4 rounded-[1.5rem] border border-primary/10 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] p-6 animate-in fade-in slide-in-from-top-2 duration-700">
            <MessageSquare className="h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                {text.advisorNoteLabel}
              </p>
              <p className="text-sm font-medium leading-relaxed text-foreground/80">
                {application.notes}
              </p>
            </div>
          </div>
        ) : null}

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-primary/20 via-border/40 to-transparent lg:left-0 lg:top-8 lg:block lg:h-px lg:w-full" />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {roadmapSteps.map((step, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const statusLabel = text.status[step] || step;

              return (
                <div
                  key={step}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-500 hover:shadow-soft",
                    isCompleted
                      ? "border-success/20 bg-success/5"
                      : isCurrent
                        ? "border-primary/25 bg-primary/[0.06] shadow-medium ring-1 ring-primary/10"
                        : "border-border/30 bg-white opacity-50",
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Hover overlay */}
                  {isCurrent ? (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent" />
                  ) : null}

                  {/* Step connector dot */}
                  <div
                    className={cn(
                      "absolute -top-1.5 left-6 hidden h-3 w-3 rounded-full border-2 border-white shadow-sm lg:block",
                      isCompleted
                        ? "bg-success"
                        : isCurrent
                          ? "bg-primary animate-pulse"
                          : "bg-border/60",
                    )}
                  />

                  <div className="relative mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {text.stepLabel} 0{index + 1}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : isCurrent ? (
                      <Clock size={16} className="animate-pulse text-primary" />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "relative text-xs font-bold leading-tight",
                      isCurrent ? "text-primary" : isCompleted ? "text-success/80" : "text-foreground/70",
                    )}
                  >
                    {statusLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
