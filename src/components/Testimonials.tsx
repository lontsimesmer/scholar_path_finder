import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Marie K.",
    role: "Master's Student, France",
    content: "Power Prestation made my dream of studying in France a reality. Their guidance through the scholarship process was invaluable. I couldn't have done it without them!",
    rating: 5,
  },
  {
    name: "Jean-Pierre M.",
    role: "PhD Candidate, Germany",
    content: "The team's expertise in navigating complex university applications saved me countless hours. They found programs I never knew existed that were perfect for my research interests.",
    rating: 5,
  },
  {
    name: "Aminata D.",
    role: "Undergraduate, Canada",
    content: "From visa guidance to finding the right university, Power Prestation was with me every step. Their personalized approach made all the difference in my journey.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="section-padding bg-background">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Success Stories from 
            <span className="text-primary"> Our Students</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Hear from students who have transformed their academic journeys with our guidance.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="group card-hover bg-card border-border/50 overflow-hidden"
            >
              <CardContent className="p-6 lg:p-8">
                {/* Quote Icon */}
                <Quote className="w-10 h-10 text-primary/20 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
