import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <Header />
      
      <main>
        {/* Hero is always visible first, so no reveal needed here for base, but inside component it is animated */}
        <Hero />

        <div className="relative">
          {/* Transition Hero (White) -> About (Secondary/20) */}
          <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-secondary/20 to-transparent pointer-events-none" />
          <ScrollReveal animation="fade-in">
            <About />
          </ScrollReveal>
        </div>

        <div className="relative">
          {/* Transition About (Secondary/20) -> Services (White) */}
          <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <ScrollReveal animation="slide-up">
            <Services />
          </ScrollReveal>
        </div>

        <ScrollReveal animation="slide-up" delay={100}>
          <HowItWorks />
        </ScrollReveal>

        <div className="relative bg-navy/5">
          <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-navy/5 to-transparent pointer-events-none" />
          <ScrollReveal animation="fade-in">
            <Testimonials />
          </ScrollReveal>
        </div>

        <ScrollReveal animation="slide-up">
          <FAQ />
        </ScrollReveal>

        <div className="relative">
          {/* Subtle blend to Contact */}
          <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          <ScrollReveal animation="slide-up">
            <Contact />
          </ScrollReveal>
        </div>
      </main>

      <div className="relative">
        {/* Crucial Transition: Contact (White) -> Footer (Deep Navy) */}
        <div className="absolute inset-x-0 -top-32 h-32 bg-gradient-to-t from-navy to-transparent pointer-events-none z-10" />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
