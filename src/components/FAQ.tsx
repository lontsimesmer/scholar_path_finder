import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How much do your services cost?",
    answer: "We offer various packages tailored to different needs and budgets. Initial consultations are free, and we'll provide transparent pricing based on the services you require. Contact us for a personalized quote.",
  },
  {
    question: "Which countries do you help students apply to?",
    answer: "We assist students in applying to universities in over 50 countries worldwide, including popular destinations like France, Germany, Canada, USA, UK, Australia, and many more. Our expertise spans across Europe, North America, and beyond.",
  },
  {
    question: "How long does the application process take?",
    answer: "The timeline varies depending on your target country and program. Generally, we recommend starting 12-18 months before your intended start date. However, we can also assist with last-minute applications when possible.",
  },
  {
    question: "Do you guarantee admission?",
    answer: "While we cannot guarantee admission as final decisions rest with universities, our 95% success rate speaks to our expertise. We work diligently to present your strongest application and match you with programs where you have the best chances.",
  },
  {
    question: "Can you help with scholarship applications?",
    answer: "Absolutely! Scholarship assistance is one of our core services. We help identify scholarships that match your profile, guide you through application requirements, and review your scholarship essays and documents.",
  },
  {
    question: "What if I don't know which program or country to choose?",
    answer: "That's exactly where we come in! Our comprehensive profile assessment will help identify programs and destinations that align with your academic background, career goals, personal preferences, and budget.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="section-padding bg-secondary/30">
      <div className="section-container">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Frequently Asked 
              <span className="text-primary"> Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our services and process.
            </p>
          </div>

          {/* Accordion */}
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
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
