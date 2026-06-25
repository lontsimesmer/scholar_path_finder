import { Award, GraduationCap, MapPin, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/language";
import SectionHeading from "@/components/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const Testimonials = () => {
  const { t } = useLanguage();

  const stories = [
    {
      ...t.testimonials.items[0],
      image:
        "https://www.image2url.com/r2/default/images/1782382864628-5a852ee8-ced3-40cf-84e6-932b9b00646e.webp",
      country: "France",
    },
    {
      ...t.testimonials.items[1],
      image:
        "https://www.image2url.com/r2/default/images/1782383497656-d26b0fb4-8d21-439b-be2b-7ba3509341f1.jpg",
      country: "Canada",
    },
    {
      ...t.testimonials.items[2],
      image:
        "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200",
      country: t.testimonials.germany,
    },
  ];

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-secondary/10 section-padding"
    >
      <div className="section-container relative z-10 space-y-16">
        <ScrollReveal animation="fade-in">
          <SectionHeading
            badge={t.testimonials.badge}
            title={t.testimonials.title}
            highlight={t.testimonials.titleHighlight}
            subtitle={t.testimonials.subtitle}
          />
        </ScrollReveal>

        <div className="grid gap-8 lg:grid-cols-3">
          {stories.map((story, index) => (
            <ScrollReveal
              key={story.name}
              animation="slide-up"
              delay={index * 100}
            >
              <Card className="group h-full overflow-hidden rounded-[2.5rem] border-border/40 bg-white shadow-none transition-all duration-500 hover:shadow-strong">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.role}
                    className="h-full w-full object-cover grayscale-[30%] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
                  <div className="absolute bottom-4 left-6 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                    <MapPin size={10} className="text-primary" />
                    {story.country}
                  </div>
                </div>

                <CardContent className="mt-4 flex flex-1 flex-col space-y-8 p-8 pb-10 pt-10">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display text-lg font-bold leading-none text-foreground">
                        {story.name}
                      </h4>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        {story.role}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <Quote className="absolute -left-2 -top-2 -z-0 h-8 w-8 text-primary/5" />
                    <p className="relative z-10 text-sm italic leading-relaxed text-muted-foreground/90">
                      "{story.content}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-4">
                    <div className="flex items-center gap-1 text-accent">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Award key={star} size={12} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                      {t.testimonials.verifiedSuccess}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-in" delay={400} className="pt-10">
          <div className="space-y-8 rounded-[3rem] border border-border/40 bg-white p-10 text-center shadow-medium">
            <div className="mx-auto max-w-2xl space-y-4">
              <h3 className="font-display text-2xl font-bold text-foreground">
                {t.testimonials.impactTitle}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t.testimonials.impactDescription}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 opacity-60 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0 md:grid-cols-4">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold text-primary">20+</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t.testimonials.stats.countries}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold text-primary">150+</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t.testimonials.stats.universities}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold text-primary">95%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t.testimonials.stats.visaSuccess}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold text-primary">500M+</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t.testimonials.stats.scholarships}
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Testimonials;
