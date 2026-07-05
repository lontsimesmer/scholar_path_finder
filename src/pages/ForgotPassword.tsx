import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("ForgotPassword");

const buildRedirectTo = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  return `${window.location.origin}/reset-password`;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const text = t.forgotPassword;

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    logger.info("Requesting password reset email");

    const { error } = await supabase.functions.invoke("send-password-reset", {
      body: {
        email: trimmed,
        redirectTo: buildRedirectTo(),
      },
    });

    setIsSubmitting(false);

    if (error) {
      logger.warn("send-password-reset invocation returned an error", {
        message: getErrorMessage(error),
      });
    }

    setHasSubmitted(true);
    toast({
      title: text.successTitle,
      description: text.successDescription,
    });
  };

  return (
    <div className="min-h-screen bg-secondary/5 flex items-center justify-center px-4 py-20">
      <div className="section-container max-w-md">
        <Card className="border-none bg-white shadow-strong rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 pb-4 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <BrandMark size="lg" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">
              {text.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {text.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 pt-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">{text.emailLabel}</Label>
                <div className="flex items-center gap-3 border-b border-border/40 focus-within:border-primary transition-colors">
                  <Mail size={18} className="text-muted-foreground/40" />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={text.emailPlaceholder}
                    disabled={isSubmitting}
                    className="border-0 rounded-none px-0 focus-visible:ring-0 h-10 bg-transparent w-full"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="xl"
                className="w-full rounded-2xl bg-primary py-6 hover:bg-navy transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {text.submittingLabel}
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-[0.3em]">
                    {text.submitLabel}
                  </span>
                )}
              </Button>
            </form>

            {hasSubmitted ? (
              <p
                role="status"
                className="rounded-[1rem] border border-border/40 bg-secondary/20 px-4 py-3 text-sm leading-6 text-muted-foreground"
              >
                {text.successDescription}
              </p>
            ) : null}

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-3 w-3" />
                {text.backToLogin}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
