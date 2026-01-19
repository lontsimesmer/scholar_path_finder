import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import aboutImage from "@/assets/about-image.jpg";

const About = () => {
  const { t } = useLanguage();

  return (
    <section id="about" className="section-padding bg-secondary/30">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-strong">
              <img
                src={aboutImage}
                alt="Students collaborating"
                className="w-full h-auto object-cover"
              />
              {/* Floating Card */}
              <div className="absolute -bottom-6 -right-6 md:bottom-8 md:right-8 bg-card p-4 md:p-6 rounded-xl shadow-medium border border-border/50 max-w-[200px]">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">05+</p>
                <p className="text-sm text-muted-foreground">{t.about.yearsOfExcellence}</p>
              </div>
            </div>
            {/* Decorative Element */}
            <div className="absolute -z-10 -top-4 -left-4 w-full h-full rounded-2xl bg-primary/10" />
          </div>

          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
              {t.about.badge}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {t.about.title}
              <span className="text-primary"> {t.about.titleHighlight}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {t.about.description1}
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {t.about.description2}
            </p>

            {/* Highlights */}
            <ul className="space-y-4 mb-8">
              {t.about.highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" asChild>
              <a href="#contact">{t.about.learnMore}</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
