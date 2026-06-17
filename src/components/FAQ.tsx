import { useMemo } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useFaqEntries } from "@/hooks/use-faq-entries";
import { useLanguage } from "@/i18n/language";
import { localizeFaqEntries } from "@/lib/faq";
import SectionHeading from "@/components/SectionHeading";

const FAQ = () => {
  const { t, language } = useLanguage();
  const { entries, isLoading } = useFaqEntries();

  const items = useMemo(() => {
    if (entries.length > 0) {
      return localizeFaqEntries(entries, language);
    }
    return t.faq.items.map((item, index) => ({
      id: `static-${index}`,
      question: item.question,
      answer: item.answer,
    }));
  }, [entries, language, t.faq.items]);

  return (
    <section id="faq" className="section-padding">
      <div className="section-container grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-8 xl:sticky xl:top-28">
          <SectionHeading
            badge={t.faq.badge}
            title={t.faq.title}
            highlight={t.faq.titleHighlight}
            subtitle={t.faq.subtitle}
            align="left"
          />

          <div className="surface-card p-6">
            <p className="text-sm leading-7 text-muted-foreground">{t.contact.subtitle}</p>
            <Button variant="outline" size="lg" asChild className="mt-6">
              <a href="#contact">{t.nav.contactUs}</a>
            </Button>
          </div>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="surface-card h-20 animate-pulse bg-secondary/40"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">
            {t.faq.empty}
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {items.map((item, index) => (
              <AccordionItem
                key={item.id}
                value={`item-${index}`}
                className="surface-card px-6 data-[state=open]:shadow-strong transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-6 [&>svg]:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-6 leading-7 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
};

export default FAQ;
