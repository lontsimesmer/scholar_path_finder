import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import aboutImage from "@/assets/about-image.jpg";

const highlights = [
  "Personalized guidance tailored to your unique profile",
  "Expert team with international education experience",
  "Strong network of partner universities worldwide",
  "End-to-end support from application to arrival",
  "Proven track record with 95% success rate",
];

const About = () => {
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
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">10+</p>
                <p className="text-sm text-muted-foreground">Years of Excellence</p>
              </div>
            </div>
            {/* Decorative Element */}
            <div className="absolute -z-10 -top-4 -left-4 w-full h-full rounded-2xl bg-primary/10" />
          </div>

          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
              About Us
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Your Trusted Partner in 
              <span className="text-primary"> Global Education</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Power Prestation is an academic and professional mobility consulting agency dedicated to transforming your educational aspirations into reality. We believe every student deserves access to world-class education, regardless of their background.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our vision is to support scholars throughout their academic and professional projects abroad, providing comprehensive guidance that opens doors to opportunities worldwide.
            </p>

            {/* Highlights */}
            <ul className="space-y-4 mb-8">
              {highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" asChild>
              <a href="#contact">Learn More About Us</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
