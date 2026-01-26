import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, CreditCard, Shield, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";

declare global {
  interface Window {
    paypal?: any;
  }
}

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    const id = searchParams.get("leadId");
    setLeadId(id);
    loadPayPalScript();
  }, [searchParams]);

  const loadPayPalScript = async () => {
    try {
      // Get PayPal client ID from edge function
      const { data, error } = await supabase.functions.invoke("get-paypal-client-id");
      
      if (error || !data?.clientId) {
        console.error("Failed to get PayPal client ID:", error);
        toast({
          title: "Error",
          description: "Payment system unavailable. Please try again later.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Set sandbox mode indicator
      setIsSandbox(data.isSandbox || false);

      // Load PayPal SDK
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${data.clientId}&currency=USD`;
      script.async = true;
      script.onload = () => {
        setPaypalLoaded(true);
        setIsLoading(false);
        initializePayPalButtons();
      };
      script.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load payment system.",
          variant: "destructive",
        });
        setIsLoading(false);
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error("Error loading PayPal:", err);
      setIsLoading(false);
    }
  };

  const initializePayPalButtons = () => {
    if (!window.paypal) return;

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "pay",
        },
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              {
                description: "Power Prestation - Initial Consultation",
                amount: {
                  value: "25.00",
                  currency_code: "USD",
                },
              },
            ],
          });
        },
        onApprove: async (_data: any, actions: any) => {
          setIsProcessing(true);
          try {
            const details = await actions.order.capture();
            
            // Process payment on backend
            const { error } = await supabase.functions.invoke("process-payment", {
              body: {
                leadId: leadId,
                paypalOrderId: details.id,
                paymentDetails: details,
              },
            });

            if (error) {
              throw new Error(error.message);
            }

            toast({
              title: "Payment Successful!",
              description: "Check your email for confirmation and next steps.",
            });

            navigate("/payment-success");
          } catch (err: any) {
            console.error("Payment processing error:", err);
            toast({
              title: "Payment Error",
              description: err.message || "Failed to process payment. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (err: any) => {
          console.error("PayPal error:", err);
          toast({
            title: "Payment Error",
            description: "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment. Feel free to try again when ready.",
          });
        },
      })
      .render("#paypal-button-container");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Sandbox Mode Banner */}
        {isSandbox && (
          <div className="mb-6 bg-accent/20 border border-accent/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-accent-foreground">
              <Shield className="w-5 h-5 text-accent" />
              <span className="font-semibold">Test Mode Active</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              PayPal is in sandbox mode. Use test credentials to simulate payments.
              No real transactions will be processed.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoImage} alt="Power Prestation" className="h-16 mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Complete Your <span className="text-primary">Registration</span>
          </h1>
          <p className="text-muted-foreground">
            Secure your consultation and start your academic journey
          </p>
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
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure payment via PayPal</span>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div id="paypal-button-container" className="min-h-[150px]"></div>
                    
                    {isProcessing && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Processing your payment...</p>
                      </div>
                    )}
                  </>
                )}

                <p className="text-xs text-center text-muted-foreground mt-4">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
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
