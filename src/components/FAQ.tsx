import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/language";
import SectionHeading from "@/components/SectionHeading";

const FAQ = () => {
  const { t } = useLanguage();

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

        <Accordion type="single" collapsible className="space-y-4">
          {t.faq.items.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index}`}
              className="surface-card px-6 data-[state=open]:shadow-strong transition-shadow"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-6 [&>svg]:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-6 leading-7 text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
