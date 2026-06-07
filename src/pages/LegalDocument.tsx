import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/language";

const LegalDocument = () => {
  const navigate = useNavigate();
  const { document } = useParams();
  const { t } = useLanguage();

  const content = useMemo(() => {
    if (!document || !(document in t.legal.documents)) {
      return null;
    }

    return t.legal.documents[document as keyof typeof t.legal.documents];
  }, [document, t]);

  if (!content) {
    return (
      <div className="page-shell flex items-center justify-center px-4 py-8">
        <div className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/92 p-10 text-center shadow-strong">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t.legal.notFoundBadge}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground">
            {t.legal.notFoundTitle}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {t.legal.notFoundDescription}
          </p>
          <Button size="lg" className="mt-8" onClick={() => navigate("/")}>
            {t.legal.backHome}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell px-4 py-8">
      <div className="section-container relative z-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.legal.back}
          </Button>

          <Card className="overflow-hidden border-white/70 bg-white/94 shadow-strong">
            <CardContent className="space-y-8 px-6 py-8 md:px-8 md:py-10">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
                  <FileText className="h-8 w-8" />
                </div>
                <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                  {content.title}
                </h1>
                <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground">
                  {content.summary}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-border/70 bg-secondary/40 p-5 shadow-soft">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                    {t.legal.currentStatus}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t.legal.currentStatusCopy}
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-secondary/40 p-5 shadow-soft">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                    {t.legal.contactTitle}
                  </h2>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                    <p className="break-all">powerprestationint@gmail.com</p>
                    <p>+(237)674819411</p>
                    <p>FOUDA, derriere le FNE-Yaounde</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <a href="/#contact">{t.legal.contactTeam}</a>
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/")}>
                  {t.legal.returnHome}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LegalDocument;
