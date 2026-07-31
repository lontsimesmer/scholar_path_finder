import { useCallback, useEffect, useMemo } from "react";
import {
  Accessibility,
  ExternalLink,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSeo } from "@/hooks/use-admin-seo";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import {
  type AdminSeoText,
  type SeoPageAudit,
  type SeoRecommendationPriority,
  type SeoStrategy,
  SEO_MISSING_KEY_MESSAGE,
  averageScore,
  formatCls,
  formatMilliseconds,
  formatScore,
  getScoreTone,
} from "@/lib/admin-seo";
import { getAdminSession } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

const SEARCH_CONSOLE_URL =
  "https://search.google.com/search-console?resource_id=sc-domain%3Apowerprestation.ca";

const scoreToneClasses: Record<ReturnType<typeof getScoreTone>, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-secondary/60 text-muted-foreground",
};

const priorityClasses: Record<SeoRecommendationPriority, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-primary",
};

const priorityBadgeClasses: Record<SeoRecommendationPriority, string> = {
  high: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  medium: "bg-warning/10 text-warning hover:bg-warning/10",
  low: "bg-primary/10 text-primary hover:bg-primary/10",
};

/** Small labelled score chip, coloured on Lighthouse's 90/50 banding. */
const ScorePill = ({ label, score }: { label: string; score: number | null }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span
      className={cn(
        "min-w-9 rounded-md px-2 py-0.5 text-center text-sm font-semibold",
        scoreToneClasses[getScoreTone(score)],
      )}
    >
      {formatScore(score)}
    </span>
  </div>
);

const MetricRow = ({
  label,
  value,
  isBreaching,
}: {
  label: string;
  value: string;
  isBreaching?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-medium", isBreaching ? "text-destructive" : "text-foreground")}>
      {value}
    </span>
  </div>
);

const PageAuditCard = ({
  page,
  text,
  thresholds,
}: {
  page: SeoPageAudit;
  text: AdminSeoText;
  thresholds: { lcpMs: number; clsUnitless: number; inpMs: number; ttfbMs: number };
}) => (
  <Card className="rounded-xl border-border/40 bg-white shadow-none">
    <CardHeader className="gap-1 border-b border-border/30 p-5">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
        <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">{page.path}</code>
      </CardTitle>
      <CardDescription className="truncate text-xs">{page.url}</CardDescription>
    </CardHeader>

    <CardContent className="space-y-5 p-5">
      {page.error ? (
        <p className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {text.auditFailed} {page.error}
          </span>
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <ScorePill label={text.metrics.performance} score={page.scores.performance} />
            <ScorePill label={text.metrics.seo} score={page.scores.seo} />
            <ScorePill label={text.metrics.accessibility} score={page.scores.accessibility} />
            <ScorePill label={text.metrics.bestPractices} score={page.scores.bestPractices} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {text.labTitle}
              </p>
              <MetricRow
                label={text.labels.lcp}
                value={formatMilliseconds(page.metrics.lcpMs)}
                isBreaching={
                  page.metrics.lcpMs !== null && page.metrics.lcpMs > thresholds.lcpMs
                }
              />
              <MetricRow
                label={text.labels.cls}
                value={formatCls(page.metrics.clsUnitless)}
                isBreaching={
                  page.metrics.clsUnitless !== null &&
                  page.metrics.clsUnitless > thresholds.clsUnitless
                }
              />
              <MetricRow label={text.labels.tbt} value={formatMilliseconds(page.metrics.tbtMs)} />
              <MetricRow label={text.labels.fcp} value={formatMilliseconds(page.metrics.fcpMs)} />
              <MetricRow
                label={text.labels.ttfb}
                value={formatMilliseconds(page.metrics.ttfbMs)}
                isBreaching={
                  page.metrics.ttfbMs !== null && page.metrics.ttfbMs > thresholds.ttfbMs
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {text.fieldTitle}
              </p>
              {page.fieldData ? (
                <>
                  <MetricRow
                    label={text.labels.lcp}
                    value={formatMilliseconds(page.fieldData.lcpMs)}
                    isBreaching={
                      page.fieldData.lcpMs !== null && page.fieldData.lcpMs > thresholds.lcpMs
                    }
                  />
                  <MetricRow
                    label={text.labels.cls}
                    value={formatCls(page.fieldData.clsUnitless)}
                    isBreaching={
                      page.fieldData.clsUnitless !== null &&
                      page.fieldData.clsUnitless > thresholds.clsUnitless
                    }
                  />
                  <MetricRow
                    label={text.labels.inp}
                    value={formatMilliseconds(page.fieldData.inpMs)}
                    isBreaching={
                      page.fieldData.inpMs !== null && page.fieldData.inpMs > thresholds.inpMs
                    }
                  />
                </>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {text.fieldUnavailable}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {text.opportunitiesTitle}
            </p>
            {page.opportunities.length === 0 ? (
              <p className="text-xs text-muted-foreground">{text.noOpportunities}</p>
            ) : (
              <ul className="space-y-1.5">
                {page.opportunities.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-xs leading-relaxed"
                  >
                    <span className="text-foreground/80">{item.title}</span>
                    {item.savingsMs !== null ? (
                      <span className="shrink-0 text-muted-foreground">
                        {text.labels.savings} {formatMilliseconds(item.savingsMs)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

const AdminSEO = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const text = t.adminSeo as AdminSeoText;
  const { toast } = useToast();
  const {
    report,
    strategy,
    setStrategy,
    isLoading,
    isRefreshing,
    loadError,
    refresh,
  } = useAdminSeo();

  useEffect(() => {
    let isActive = true;
    const verify = async () => {
      const session = await getAdminSession();
      if (!isActive) return;
      if (!session) {
        navigate("/login?redirect=/admin/seo", { replace: true });
      }
    };
    void verify();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (loadError) {
      toast({
        title: text.toasts.loadErrorTitle,
        description: loadError,
        variant: "destructive",
      });
    }
  }, [loadError, text.toasts.loadErrorTitle, toast]);

  const handleRefresh = useCallback(async () => {
    const result = await refresh();
    // `=== true` so the union narrows: strictNullChecks is off in this project
    // and a bare truthiness check leaves `message` unreachable on the error arm.
    if (result.success === true) {
      toast({
        title: text.toasts.refreshSuccessTitle,
        description: text.toasts.refreshSuccessDescription,
      });
      return;
    }

    toast({
      title: text.toasts.refreshErrorTitle,
      description:
        result.message === SEO_MISSING_KEY_MESSAGE
          ? text.missingKeyDescription
          : result.message,
      variant: "destructive",
    });
  }, [refresh, text, toast]);

  const averages = useMemo(() => {
    const pages = report?.pages ?? [];
    return {
      performance: averageScore(pages, "performance"),
      seo: averageScore(pages, "seo"),
      accessibility: averageScore(pages, "accessibility"),
      bestPractices: averageScore(pages, "bestPractices"),
    };
  }, [report]);

  const generatedAtLabel = useMemo(() => {
    if (!report?.generatedAt) return text.neverRun;
    const date = new Date(report.generatedAt);
    if (Number.isNaN(date.getTime())) return text.neverRun;
    return date.toLocaleString(language === "fr" ? "fr-FR" : "en-US");
  }, [report?.generatedAt, language, text.neverRun]);

  const isMissingKey = loadError === SEO_MISSING_KEY_MESSAGE;

  return (
    <AdminLayout
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button type="button" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isRefreshing ? text.refreshingButton : text.refreshButton}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {text.generatedAt} {generatedAtLabel}
          </p>
          {/*
            The strategy applies to the next refresh, not retroactively: mobile
            and desktop are separate Lighthouse runs, so switching cannot
            recompute the report already on screen.
          */}
          <Tabs
            value={strategy}
            onValueChange={(value) => setStrategy(value as SeoStrategy)}
          >
            <TabsList>
              <TabsTrigger value="mobile" disabled={isRefreshing}>
                {text.strategyMobile}
              </TabsTrigger>
              <TabsTrigger value="desktop" disabled={isRefreshing}>
                {text.strategyDesktop}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isMissingKey ? (
          <Card className="rounded-xl border-warning/40 bg-warning/5 shadow-none">
            <CardHeader className="gap-1 p-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-warning">
                <TriangleAlert className="h-4 w-4" />
                {text.missingKeyTitle}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {text.missingKeyDescription}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            title={text.metrics.performance}
            value={formatScore(averages.performance)}
            description={text.metrics.averageSuffix}
            icon={Gauge}
            tone={
              averages.performance !== null && averages.performance >= 90 ? "success" : "warning"
            }
          />
          <AdminMetricCard
            title={text.metrics.seo}
            value={formatScore(averages.seo)}
            description={text.metrics.averageSuffix}
            icon={Search}
            tone={averages.seo !== null && averages.seo >= 90 ? "success" : "warning"}
          />
          <AdminMetricCard
            title={text.metrics.accessibility}
            value={formatScore(averages.accessibility)}
            description={text.metrics.averageSuffix}
            icon={Accessibility}
            tone="neutral"
          />
          <AdminMetricCard
            title={text.metrics.bestPractices}
            value={formatScore(averages.bestPractices)}
            description={text.metrics.averageSuffix}
            icon={ShieldCheck}
            tone="neutral"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !report ? (
          <Card className="rounded-xl border-border/40 bg-white shadow-none">
            <CardHeader className="gap-1 p-6">
              <CardTitle className="text-sm font-semibold">{text.emptyTitle}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {text.emptyDescription}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{text.pagesTitle}</h2>
                <p className="text-xs text-muted-foreground">{text.pagesDescription}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {report.pages.map((page) => (
                  <PageAuditCard
                    key={page.path}
                    page={page}
                    text={text}
                    thresholds={report.thresholds}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {text.recommendationsTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {text.recommendationsDescription}
                </p>
              </div>

              {report.recommendations.length === 0 ? (
                <Card className="rounded-xl border-border/40 bg-white shadow-none">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">{text.noRecommendations}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {report.recommendations.map((recommendation, index) => (
                    <Card
                      key={`${recommendation.category}-${recommendation.path}-${index}`}
                      className={cn(
                        "rounded-xl border-l-4 border-border/40 bg-white shadow-none",
                        priorityClasses[recommendation.priority],
                      )}
                    >
                      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "w-fit shrink-0 text-[10px] font-bold uppercase tracking-wider",
                            priorityBadgeClasses[recommendation.priority],
                          )}
                        >
                          {text.priority[recommendation.priority]}
                        </Badge>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            {recommendation.category}
                            <code className="ml-2 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-normal">
                              {recommendation.path}
                            </code>
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {recommendation.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/*
          Search Console is intentionally a link rather than an embedded panel:
          its API needs a Google service-account private key, which does not
          belong in an Edge Function's environment.
        */}
        <Card className="rounded-xl border-border/40 bg-white shadow-none">
          <CardHeader className="gap-1 p-5">
            <CardTitle className="text-sm font-semibold">{text.gscTitle}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {text.gscDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Button variant="outline" size="sm" asChild>
              <a href={SEARCH_CONSOLE_URL} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="mr-2 h-4 w-4" />
                {text.gscButton}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSEO;
