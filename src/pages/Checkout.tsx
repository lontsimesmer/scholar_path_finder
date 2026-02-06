import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, Shield, Clock, Users, LogOut, CreditCard, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";
import { MobileMoneyPayment } from "@/components/checkout/MobileMoneyPayment";
import { CardPaymentModal, CardPaymentData } from "@/components/checkout/CardPaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
type PaymentMethod = "card" | "mobile_money";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leadId, setLeadId] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [showCardModal, setShowCardModal] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  useEffect(() => {
    const id = searchParams.get("leadId");
    setLeadId(id);

    // Check authentication - require login for checkout
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser({ email: session.user.email });
        setIsLoading(false);
      } else {
        // Redirect to login if not authenticated
        navigate(`/login?redirect=/checkout${id ? `?leadId=${id}` : ''}`);
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser({ email: session.user.email });
        setIsLoading(false);
      } else {
        navigate(`/login?redirect=/checkout${leadId ? `?leadId=${leadId}` : ''}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams, navigate, leadId]);

  const handlePaymentSuccess = () => {
    navigate("/payment-success");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCardPayment = async (data: CardPaymentData) => {
    setIsProcessingCard(true);
    try {
      // For now, show a message that card payment is being processed
      // In production, this would connect to UBA payment gateway
      toast({
        title: "Processing Card Payment",
        description: "Your card payment is being processed. Please wait...",
      });
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for processing. We'll notify you once confirmed.",
      });
      
      setShowCardModal(false);
      // Navigate to success page or show confirmation
      navigate("/payment-success");
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process card payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCard(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
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
          {user?.email && (
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
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
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
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Select Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${paymentMethod === "card" ? "text-primary" : ""}`}>
                      Card
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                      paymentMethod === "mobile_money"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Smartphone className={`w-6 h-6 ${paymentMethod === "mobile_money" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${paymentMethod === "mobile_money" ? "text-primary" : ""}`}>
                      Mobile Money
                    </span>
                  </button>
                </div>
              </div>

              {/* Card Payment */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Card Payment</h3>
                    <p className="text-sm text-muted-foreground">
                      Pay securely with Visa, Mastercard, Amex or any international card.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowCardModal(true)} 
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay with Card - $25
                  </Button>
                </div>
              )}

              {/* Mobile Money Payment */}
              {paymentMethod === "mobile_money" && (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Mobile Money Payment</h3>
                    <p className="text-sm text-muted-foreground">
                      Pay securely using MTN Mobile Money or Orange Money.
                    </p>
                  </div>
                  <MobileMoneyPayment leadId={leadId} onSuccess={handlePaymentSuccess} />
                </div>
              )}

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
          {/* Contact Info */}
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Questions? Contact us:</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
              <a href="mailto:powerprestationint@gmail.com" className="text-primary hover:underline">
                powerprestationint@gmail.com
              </a>
              <span className="hidden sm:inline">•</span>
              <a href="tel:+237674819411" className="text-primary hover:underline">
                +(237)674819411
              </a>
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

      {/* Card Payment Modal */}
      <CardPaymentModal
        open={showCardModal}
        onClose={() => setShowCardModal(false)}
        onSubmit={handleCardPayment}
        isProcessing={isProcessingCard}
      />
    </div>
  );
};

export default Checkout;
