import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { t } = useLanguage();

  return (
    <section id="faq" className="section-padding bg-secondary/30">
      <div className="section-container">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
              {t.faq.badge}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {t.faq.title}
              <span className="text-primary"> {t.faq.titleHighlight}</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.faq.subtitle}
            </p>
          </div>

          {/* Accordion */}
          <Accordion type="single" collapsible className="space-y-4">
            {t.faq.items.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-xl px-6 data-[state=open]:shadow-medium transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-6 [&>svg]:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
