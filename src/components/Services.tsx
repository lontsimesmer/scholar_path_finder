import { GraduationCap, BookOpen, Award, Briefcase, FileCheck, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

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
    <section id="services" className="section-padding bg-background">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
            {t.services.badge}
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t.services.title}
            <span className="text-primary"> {t.services.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t.services.subtitle}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="group card-hover bg-card border-border/50 overflow-hidden"
            >
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <service.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
