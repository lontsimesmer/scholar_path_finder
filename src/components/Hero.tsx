import {
  ArrowRight,
  Award,
  CheckCircle2,
  Globe,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import { useLanguage } from "@/i18n/language";
import heroBg from "@/assets/hero-bg.jpg";
import { cn } from "@/lib/utils";

const Hero = () => {
  const { t } = useLanguage();

  const focusAreas = [
    t.services.items.universitySelection.title,
    t.services.items.scholarship.title,
    t.services.items.visa.title,
  ];

  const journey = [
    t.howItWorks.steps.consultation.title,
    t.howItWorks.steps.assessment.title,
    t.howItWorks.steps.application.title,
  ];

  const stats = [
    { icon: Globe, value: "05+", label: t.hero.stats.countries },
    { icon: GraduationCap, value: "250+", label: t.hero.stats.studentsPlaced },
    { icon: Award, value: "95%", label: t.hero.stats.successRate },
  ];

  return (
    <section id="home" className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
      {/* Subtle Background elements */}
      <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_15%_15%,_rgba(53,90,204,0.08),_transparent_40%)]" />
      
      <div className="section-container relative z-10">
        <div className="grid gap-16 xl:grid-cols-[1fr_0.9fr] xl:items-center">
          
          {/* Left Content - Refined Typography */}
          <div className="max-w-2xl">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                <span>{t.hero.badge}</span>
              </div>

              <h1 className="mt-8 font-display text-[clamp(2.5rem,5vw,4.2rem)] font-bold leading-[1.15] tracking-tight text-foreground">
                {t.hero.title}
                <span className="block text-primary/90">{t.hero.titleHighlight}</span>
              </h1>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground/90">
                {t.hero.subtitle}
              </p>
            </div>

            <div className="mt-12 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <Button variant="hero" size="xl" asChild className="group px-8">
                <a href="#contact" className="flex items-center gap-2">
                  {t.hero.ctaPrimary}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="xl"
                asChild
                className="text-foreground/70 hover:text-primary hover:bg-primary/5"
              >
                <a href="#services">{t.hero.ctaSecondary}</a>
              </Button>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3 animate-in fade-in duration-1000 delay-500">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left"
                >
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Elegant Visuals */}
          <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-border/40 shadow-strong sm:aspect-[3/4] xl:aspect-[4/5]">
              <img
                src={heroBg}
                alt="Students"
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />

              {/* Minimal Roadmap Overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="h-5 w-5 text-white/80" />
                    <h2 className="font-display text-xl font-medium text-white">
                      {t.hero.roadmapTitle}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {journey.map((item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span className="h-px w-4 bg-white/30" />
                        <p className="text-sm text-white/80">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle floating trust badge */}
            <div className="absolute -right-4 -top-4 hidden rounded-2xl border border-border/50 bg-white p-4 shadow-medium md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">95%</p>
                  <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">
                    {t.hero.stats.successRate}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
