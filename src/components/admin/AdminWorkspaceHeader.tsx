import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminWorkspaceNavItem = {
  href: string;
  label: string;
};

type AdminWorkspaceHighlight = {
  label: string;
  value: string | number;
  tone?: "primary" | "success" | "warning" | "neutral";
};

interface AdminWorkspaceHeaderProps {
  dashboardHref?: string;
  dashboardLabel?: string;
  currentLabel?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  navItems?: AdminWorkspaceNavItem[];
  highlights?: AdminWorkspaceHighlight[];
}

const highlightToneClasses: Record<NonNullable<AdminWorkspaceHighlight["tone"]>, string> = {
  primary: "border-primary/15 bg-primary/5",
  success: "border-success/20 bg-success/5",
  warning: "border-amber-200 bg-amber-50",
  neutral: "border-border/40 bg-secondary/20",
};

const highlightValueClasses: Record<NonNullable<AdminWorkspaceHighlight["tone"]>, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-amber-600",
  neutral: "text-foreground",
};

export const AdminWorkspaceHeader = ({
  dashboardHref,
  dashboardLabel,
  currentLabel,
  title,
  subtitle,
  actions,
  navItems = [],
  highlights = [],
}: AdminWorkspaceHeaderProps) => (
  <div className="animate-stagger-in space-y-6">
    {currentLabel ? (
      <div className="flex items-center gap-4">
        {dashboardHref && dashboardLabel ? (
          <>
            <Link
              to={dashboardHref}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              {dashboardLabel}
            </Link>
            <span className="text-muted-foreground/30">/</span>
          </>
        ) : null}
        <span className="text-xs font-bold uppercase tracking-widest text-primary">{currentLabel}</span>
      </div>
    ) : null}

    <Card className="overflow-hidden rounded-[2.5rem] border-border/30 bg-white shadow-strong">
      <CardContent className="relative space-y-7 overflow-hidden p-8 pt-8 md:p-10 md:pt-10">
        {/* Layered gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(25,113,194,0.06)_0%,rgba(255,255,255,0.98)_45%,rgba(40,144,90,0.03)_100%)]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-accent/[0.06] blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] soft-grid" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground/80 md:text-lg">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>

        {highlights.length > 0 ? (
          <div className={cn("relative grid gap-3", highlights.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
            {highlights.map((highlight, index) => (
              <div
                key={highlight.label}
                className={cn(
                  "rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-soft",
                  highlightToneClasses[highlight.tone ?? "primary"],
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                  {highlight.label}
                </p>
                <p className={cn(
                  "mt-2 animate-number-in font-display text-2xl font-bold",
                  highlightValueClasses[highlight.tone ?? "primary"],
                )}>
                  {highlight.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {navItems.length > 0 ? (
          <div className="relative flex flex-wrap gap-2 border-t border-border/30 pt-5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                      : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  </div>
);
