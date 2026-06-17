import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AdminDashboardOperationItem } from "@/lib/admin-dashboard";

type AdminDashboardOperationsCardProps = {
  title: string;
  description: string;
  operations: AdminDashboardOperationItem[];
};

export function AdminDashboardOperationsCard({
  title,
  description,
  operations,
}: AdminDashboardOperationsCardProps) {
  return (
    <ScrollReveal animation="slide-up">
      <Card className="overflow-hidden rounded-2xl border-border/30 shadow-soft">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-7 pt-10 md:px-8 md:pb-7 md:pt-10">
          <CardTitle className="font-display text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 p-8 md:pt-8 lg:grid-cols-3">
          {operations.map((operation, index) => (
            <div
              key={operation.title}
              className="group relative overflow-hidden rounded-xl border border-border/30 bg-white p-6 transition-all duration-500 hover:border-primary/15 hover:shadow-medium"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative flex h-full min-w-0 flex-col">
                <div className="flex items-center justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:shadow-md ${operation.iconClassName}`}>
                    <operation.icon size={22} />
                  </div>
                  <p className="animate-number-in font-display text-4xl font-bold text-foreground">{operation.value}</p>
                </div>
                <h2 className="mt-6 font-display text-lg font-bold tracking-tight text-foreground">{operation.title}</h2>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground/70">{operation.description}</p>
                <Button
                  asChild
                  className="mt-auto w-full min-w-0 gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  variant={operation.buttonVariant ?? "default"}
                >
                  <Link to={operation.href}>
                    <span className="min-w-0 truncate">{operation.cta}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
