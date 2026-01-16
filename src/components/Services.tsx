import { GraduationCap, BookOpen, Award, Briefcase, FileCheck, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: GraduationCap,
    title: "University Selection",
    description: "Expert guidance to find the perfect university matching your academic profile, career goals, and budget.",
  },
  {
    icon: BookOpen,
    title: "Foreign Studies Advisory",
    description: "Comprehensive support for studying abroad including course selection, admission requirements, and documentation.",
  },
  {
    icon: Award,
    title: "Scholarship Assistance",
    description: "Identify and apply for scholarships that match your profile, maximizing your chances of financial support.",
  },
  {
    icon: Briefcase,
    title: "Internship Placement",
    description: "Connect with international internship opportunities to boost your resume and gain global experience.",
  },
  {
    icon: FileCheck,
    title: "Application Support",
    description: "Complete application assistance including document preparation, essays, and interview coaching.",
  },
  {
    icon: Globe,
    title: "Visa Guidance",
    description: "Navigate the visa process with confidence. We guide you through documentation and interview preparation.",
  },
];

const Services = () => {
  return (
    <section id="services" className="section-padding bg-background">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
            Our Services
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Comprehensive Support for Your 
            <span className="text-primary"> Academic Journey</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From choosing the right university to landing your dream internship, we provide end-to-end support for your international education goals.
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
