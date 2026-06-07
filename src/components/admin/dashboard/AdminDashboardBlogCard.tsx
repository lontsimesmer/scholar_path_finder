import { FileText, PenLine } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

type AdminDashboardBlogCardProps = {
  title: string;
  description: string;
  publishedPostsLabel: string;
  publishedPostsValue: number | string;
  manageLabel: string;
  newArticleLabel: string;
};

export function AdminDashboardBlogCard({
  title,
  description,
  publishedPostsLabel,
  publishedPostsValue,
  manageLabel,
  newArticleLabel,
}: AdminDashboardBlogCardProps) {
  return (
    <ScrollReveal animation="slide-up" delay={100}>
      <Card className="group overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-7 pt-10 md:px-8 md:pb-7 md:pt-10">
          <CardTitle className="font-display text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center md:pt-8">
          <div className="flex items-center gap-5 rounded-2xl border border-border/30 bg-gradient-to-r from-primary/[0.03] to-transparent p-5 transition-all duration-300 hover:border-primary/15 hover:shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                {publishedPostsLabel}
              </p>
              <p className="animate-number-in font-display text-4xl font-bold text-foreground">{publishedPostsValue}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="min-w-0 rounded-xl border-border/50 px-4">
              <Link to="/admin/blog">
                <span className="min-w-0 truncate">{manageLabel}</span>
              </Link>
            </Button>
            <Button asChild className="min-w-0 gap-2 rounded-xl px-4 shadow-sm">
              <Link to="/admin/blog?action=new">
                <PenLine size={14} className="shrink-0" />
                <span className="min-w-0 truncate">{newArticleLabel}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
