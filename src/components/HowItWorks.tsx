import { MessageCircle, Search, FileText, Plane } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

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
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-sm font-semibold mb-4">
            {t.howItWorks.badge}
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-navy-foreground mb-6">
            {t.howItWorks.title}
            <span className="text-accent"> {t.howItWorks.titleHighlight}</span>
          </h2>
          <p className="text-lg text-navy-foreground/70">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-primary/30" />
              )}
              
              <div className="relative z-10 text-center">
                {/* Icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/30 mb-6 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <step.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                
                <h3 className="font-display text-xl font-semibold text-navy-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-navy-foreground/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
