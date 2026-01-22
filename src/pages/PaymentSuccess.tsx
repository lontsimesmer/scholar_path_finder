import { useNavigate } from "react-router-dom";
import { Check, Mail, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoImage from "@/assets/logo.png";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  const nextSteps = [
    {
      icon: Mail,
      title: "Check Your Email",
      description: "We've sent you a confirmation email with your payment receipt.",
    },
    {
      icon: Calendar,
      title: "Await Consultation Invite",
      description: "A consultant will contact you within 24-48 hours to schedule your session.",
    },
    {
      icon: MessageCircle,
      title: "Prepare Your Questions",
      description: "Think about your academic goals and prepare any questions you have.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
            <Check className="w-12 h-12 text-primary-foreground" />
          </div>
          <img src={logoImage} alt="Power Prestation" className="h-12 mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to Power Prestation! Your consultation is now confirmed.
          </p>
        </div>

        {/* Next Steps */}
        <Card className="bg-card border-border/50 mb-8">
          <CardContent className="pt-6">
            <h2 className="font-display text-xl font-semibold mb-6">What Happens Next?</h2>
            <div className="space-y-4">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 text-left p-4 bg-secondary/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="bg-primary/5 rounded-lg p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-2">Have questions? Contact us:</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:contact@powerprestation.com" className="text-primary hover:underline">
              contact@powerprestation.com
            </a>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <a href="tel:+237674819411" className="text-primary hover:underline">
              +(237)674819411
            </a>
          </div>
        </div>

        {/* Back to Home */}
        <Button onClick={() => navigate("/")} size="lg">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
