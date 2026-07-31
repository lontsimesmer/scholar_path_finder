import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useLanguage } from "@/i18n/language";
import SectionHeading from "@/components/SectionHeading";
import aboutImage from "@/assets/about-image.jpg";

const About = () => {
  const { t } = useLanguage();

  const metrics = [
    { value: "05+", label: t.about.yearsOfExcellence },
    { value: "250+", label: t.hero.stats.studentsPlaced },
    { value: "95%", label: t.hero.stats.successRate },
  ];

  return (
    <section id="about" className="section-padding bg-secondary/20">
      <div className="section-container">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {/* Visual Side - Elegant Framing */}
          <div className="relative animate-in fade-in slide-in-from-left-4 duration-1000 order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/40 shadow-strong">
              <OptimizedImage
                src={aboutImage}
                alt={t.about.imageAlt}
                width={626}
                height={418}
                className="h-full w-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />

              <div className="absolute left-4 right-4 bottom-4 mx-auto rounded-3xl border border-border/50 bg-white/95 p-4 shadow-medium md:right-auto md:bottom-4 md:left-auto md:translate-x-4 md:w-auto md:px-6 md:py-5 lg:translate-x-8 animate-in zoom-in-95 duration-1000 delay-300">
                <div className="flex flex-col gap-4 md:gap-5 md:flex-row md:items-center">
                  {metrics.slice(1).map((metric) => (
                    <div key={metric.label} className="min-w-[6rem]">
                      <p className="text-xl md:text-2xl font-bold text-primary">
                        {metric.value}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-1000 delay-100 order-1 lg:order-2">
            <SectionHeading
              badge={t.about.badge}
              title={t.about.title}
              highlight={t.about.titleHighlight}
              subtitle={t.about.description1}
              align="left"
            />

            <p className="text-lg leading-relaxed text-muted-foreground/90">
              {t.about.description2}
            </p>

            <div className="grid gap-6 py-4">
              {t.about.highlights.map((item) => (
                <div key={item} className="flex items-start gap-4 group">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-base font-medium text-foreground/80 leading-tight">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="xl"
                asChild
                className="group px-10 w-full sm:w-auto"
              >
                <a
                  href="#contact"
                  className="flex items-center justify-center gap-2 w-full"
                >
                  {t.about.learnMore}
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
