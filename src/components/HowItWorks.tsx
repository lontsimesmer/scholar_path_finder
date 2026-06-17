import { FileText, MessageCircle, Plane, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/language";
import SectionHeading from "@/components/SectionHeading";

const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: MessageCircle,
      step: "01",
      title: t.howItWorks.steps.consultation.title,
      description: t.howItWorks.steps.consultation.description,
    },
    {
      icon: Search,
      step: "02",
      title: t.howItWorks.steps.assessment.title,
      description: t.howItWorks.steps.assessment.description,
    },
    {
      icon: FileText,
      step: "03",
      title: t.howItWorks.steps.application.title,
      description: t.howItWorks.steps.application.description,
    },
    {
      icon: Plane,
      step: "04",
      title: t.howItWorks.steps.visa.title,
      description: t.howItWorks.steps.visa.description,
    },
  ];

  return (
    <section id="how-it-works" className="section-padding bg-navy text-navy-foreground">
      <div className="section-container grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
        <div className="space-y-8 xl:sticky xl:top-28">
          <SectionHeading
            badge={t.howItWorks.badge}
            title={t.howItWorks.title}
            highlight={t.howItWorks.titleHighlight}
            subtitle={t.howItWorks.subtitle}
            align="left"
            inverse
          />

          <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6 shadow-medium">
            <div className="space-y-3">
              {steps.slice(0, 3).map((step) => (
                <div key={step.step} className="flex items-center gap-3 rounded-[1rem] bg-white/7 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/18 text-xs font-semibold text-accent">
                    {step.step}
                  </span>
                  <span className="text-sm text-navy-foreground/80">{step.title}</span>
                </div>
              ))}
            </div>
            <Button variant="heroOutline" size="lg" asChild className="mt-6">
              <a href="#contact">{t.nav.contactUs}</a>
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-10 top-[5.6rem] hidden h-[calc(100%+1.25rem)] w-px bg-white/12 xl:block" />
              )}
              <div className="surface-panel-dark relative flex flex-col gap-5 p-6 md:flex-row md:items-start md:p-7">
                <div className="flex items-center gap-4 md:w-52 md:flex-col md:items-start">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/10">
                    <step.icon className="text-accent" size={28} />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-[0.26em] text-primary-foreground/62">
                    {step.step}
                  </span>
                </div>
                <div className="space-y-3">
                  <h3 className="font-display text-2xl font-semibold text-navy-foreground">{step.title}</h3>
                  <p className="leading-7 text-navy-foreground/72">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
