import { ArrowRight, Globe, Settings, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AdminDashboardActionItem } from "@/lib/admin-dashboard";

type AdminDashboardSidePanelProps = {
  title: string;
  description: string;
  actionItems: AdminDashboardActionItem[];
  publicSiteLabel: string;
  viewSiteLabel: string;
  seoHealthLabel: string;
  optimizationOkLabel: string;
  settingsLabel: string;
};

export function AdminDashboardSidePanel({
  title,
  description,
  actionItems,
  publicSiteLabel,
  viewSiteLabel,
  seoHealthLabel,
  optimizationOkLabel,
  settingsLabel,
}: AdminDashboardSidePanelProps) {
  return (
    <div className="space-y-6">
      <ScrollReveal animation="slide-up" delay={60}>
        <Card className="rounded-2xl border-border/30 shadow-soft">
          <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-7 pt-10 md:px-8 md:pb-7 md:pt-10">
            <CardTitle className="font-display text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base text-muted-foreground/80">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-6 md:pt-6">
            {actionItems.map((item, index) => (
              <Link
                key={item.title}
                to={item.href}
                className="group relative block overflow-hidden rounded-2xl border border-border/30 bg-white p-5 transition-all duration-400 hover:border-primary/20 hover:shadow-soft"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Hover sweep */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-primary/[0.03] to-transparent transition-transform duration-500 group-hover:translate-x-0" />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-foreground">{item.title}</p>
                      <ArrowRight size={13} className="flex-shrink-0 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                    <p className="text-[13px] text-muted-foreground/70">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="animate-number-in font-display text-3xl font-bold text-primary">{item.value}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </ScrollReveal>

      <ScrollReveal animation="slide-up" delay={140}>
        <div className="space-y-3">
          <QuickLinkBox
            icon={Globe}
            iconBg="bg-success/10"
            iconColor="text-success"
            hoverBorder="hover:border-success/25"
            label={publicSiteLabel}
          >
            <Link to="/" className="flex items-center gap-1.5 text-sm font-bold transition-colors hover:text-primary">
              {viewSiteLabel} <ArrowRight size={12} />
            </Link>
          </QuickLinkBox>

          <QuickLinkBox
            icon={ShieldCheck}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            hoverBorder="hover:border-primary/25"
            label={seoHealthLabel}
          >
            <p className="text-sm font-bold text-foreground">{optimizationOkLabel}</p>
          </QuickLinkBox>

          <QuickLinkBox
            icon={Settings}
            iconBg="bg-secondary/60"
            iconColor="text-foreground/70"
            hoverBorder="hover:border-border"
            label={settingsLabel}
          >
            <p className="text-sm font-bold text-foreground/70">V 2.1.0</p>
          </QuickLinkBox>
        </div>
      </ScrollReveal>
    </div>
  );
}

function QuickLinkBox({
  icon: Icon,
  iconBg,
  iconColor,
  hoverBorder,
  label,
  children,
}: {
  icon: typeof Globe;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`group flex items-center gap-4 rounded-2xl border border-border/30 bg-white p-5 shadow-soft transition-all duration-300 ${hoverBorder} hover:shadow-medium`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
        {children}
      </div>
    </div>
  );
}
