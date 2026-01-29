import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, CreditCard, Shield, Clock, Users, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";
import { PaymentMethodSelector, PaymentMethod } from "@/components/checkout/PaymentMethodSelector";
import { StripePayment } from "@/components/checkout/StripePayment";
import { MobileMoneyPayment } from "@/components/checkout/MobileMoneyPayment";
import { supabase } from "@/integrations/supabase/client";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [leadId, setLeadId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    const id = searchParams.get("leadId");
    setLeadId(id);

    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/login?redirect=/checkout${id ? `?leadId=${id}` : ''}`);
        return;
      }
      setUser({ email: session.user.email });
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate(`/login?redirect=/checkout${id ? `?leadId=${id}` : ''}`);
      } else {
        setUser({ email: session.user.email });
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams, navigate]);

  const handlePaymentSuccess = () => {
    navigate("/payment-success");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const benefits = [
    { icon: Users, text: "1-on-1 consultation with an expert" },
    { icon: Clock, text: "30-60 minute personalized session" },
    { icon: Shield, text: "Secure payment processing" },
    { icon: Check, text: "Satisfaction guaranteed" },
  ];

  const included = [
    "Personalized university recommendations",
    "Scholarship opportunities matching your profile",
    "Step-by-step application guidance",
    "Visa process overview",
    "Timeline and planning strategy",
    "Q&A session with our expert",
  ];

  const renderPaymentForm = () => {
    switch (paymentMethod) {
      case "card":
        return <StripePayment leadId={leadId} onSuccess={handlePaymentSuccess} />;
      case "mobile_money":
        return <MobileMoneyPayment leadId={leadId} onSuccess={handlePaymentSuccess} />;
      default:
        return null;
    }
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoImage} alt="Power Prestation" className="h-16 mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Complete Your <span className="text-primary">Registration</span>
          </h1>
          <p className="text-muted-foreground mb-2">
            Secure your consultation and start your academic journey
          </p>
          {user.email && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Signed in as {user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left - What's Included */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                What's Included in Your Consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {included.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold mb-3">Why Choose Power Prestation?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <benefit.icon className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Money-Back Guarantee</p>
                    <p className="text-sm text-muted-foreground">
                      Not satisfied? Get a full refund within 7 days.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right - Payment */}
          <Card className="bg-card border-border/50">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Initial Consultation</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-primary">$25</span>
                  <span className="text-muted-foreground">USD</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">One-time payment</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <PaymentMethodSelector
                selectedMethod={paymentMethod}
                onMethodChange={setPaymentMethod}
              />

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure payment processing</span>
                </div>

                {renderPaymentForm()}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By completing this purchase, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Trusted by 250+ students worldwide</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm">SSL Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span className="text-sm">Verified Business</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm">5+ Years Experience</span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
