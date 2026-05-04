import { ArrowRight, Award, BookOpen, Briefcase, FileCheck, Globe, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/language";
import SectionHeading from "@/components/SectionHeading";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const Services = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: GraduationCap,
      title: t.services.items.universitySelection.title,
      description: t.services.items.universitySelection.description,
    },
    {
      icon: BookOpen,
      title: t.services.items.foreignStudies.title,
      description: t.services.items.foreignStudies.description,
    },
    {
      icon: Award,
      title: t.services.items.scholarship.title,
      description: t.services.items.scholarship.description,
    },
    {
      icon: Briefcase,
      title: t.services.items.internship.title,
      description: t.services.items.internship.description,
    },
    {
      icon: FileCheck,
      title: t.services.items.application.title,
      description: t.services.items.application.description,
    },
    {
      icon: Globe,
      title: t.services.items.visa.title,
      description: t.services.items.visa.description,
    },
  ];

  return (
    <section id="services" className="section-padding bg-white relative">
      <div className="section-container space-y-16">
        <ScrollReveal animation="fade-in">
          <SectionHeading
            badge={t.services.badge}
            title={t.services.title}
            highlight={t.services.titleHighlight}
            subtitle={t.services.subtitle}
          />
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => (
            <ScrollReveal 
              key={service.title} 
              animation="slide-up" 
              delay={index * 100}
              className={cn(index === 0 && "xl:col-span-2")}
            >
              <Card
                className={cn(
                  "group h-full relative overflow-hidden border-border/40 bg-secondary/10 shadow-none hover:shadow-medium transition-all duration-500",
                  index === 0 && "xl:min-h-[20rem]",
                )}
              >
                <CardContent className="relative flex h-full flex-col p-8 pt-8 lg:p-10 lg:pt-10">
                  <div className="mb-12 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                      <service.icon className="h-7 w-7" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/40">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="mt-auto space-y-4">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {service.title}
                    </h3>
                    <p className="leading-relaxed text-muted-foreground/80">{service.description}</p>
                  </div>

                  <a href="#contact" className="mt-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary group-hover:translate-x-1 transition-transform">
                    <span>{t.nav.contactUs}</span>
                    <ArrowRight size={14} />
                  </a>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
