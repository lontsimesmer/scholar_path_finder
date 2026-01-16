import { MessageCircle, Search, FileText, Plane } from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    step: "01",
    title: "Initial Consultation",
    description: "Share your goals, academic background, and preferences in a free consultation session with our experts.",
  },
  {
    icon: Search,
    step: "02",
    title: "Profile Assessment",
    description: "We analyze your profile to identify the best universities, programs, and scholarship opportunities for you.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Application Support",
    description: "From document preparation to essay writing, we guide you through every step of the application process.",
  },
  {
    icon: Plane,
    step: "04",
    title: "Visa & Departure",
    description: "We assist with visa applications and pre-departure preparations to ensure a smooth transition abroad.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section-padding bg-navy text-navy-foreground">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-navy-foreground mb-6">
            Your Journey to 
            <span className="text-accent"> Success</span>
          </h2>
          <p className="text-lg text-navy-foreground/70">
            Our proven process has helped hundreds of students achieve their dreams of studying abroad.
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
