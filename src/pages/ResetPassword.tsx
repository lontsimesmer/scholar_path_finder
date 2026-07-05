import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import BrandMark from "@/components/BrandMark";
import { MIN_PASSWORD_LENGTH } from "@/components/security/security-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("ResetPassword");

type Status = "verifying" | "ready" | "invalid" | "submitting";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const security = t.security;
  const text = t.resetPassword;

  const [status, setStatus] = useState<Status>("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const exchangeCode = async () => {
      const code = searchParams.get("code");
      if (!code) {
        logger.warn("Reset password page reached without a code");
        if (!cancelled) setStatus("invalid");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (error) {
        logger.warn("Failed to exchange recovery code", {
          message: getErrorMessage(error),
        });
        setStatus("invalid");
        return;
      }

      logger.info("Recovery session established");
      setStatus("ready");
    };

    void exchangeCode();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setStatus("ready");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast({
        title: text.errorTitle,
        description: security.errorTooShort,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: text.errorTitle,
        description: security.errorMismatch,
        variant: "destructive",
      });
      return;
    }

    setStatus("submitting");

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      logger.error("Failed to update password after recovery", {
        message: getErrorMessage(updateError),
      });
      setStatus("ready");
      toast({
        title: text.errorTitle,
        description: updateError.message || text.errorGeneric,
        variant: "destructive",
      });
      return;
    }

    logger.info("Password updated, signing out to force reauthentication");
    await supabase.auth.signOut();

    toast({
      title: text.successTitle,
      description: text.successDescription,
    });
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary/5 flex items-center justify-center px-4 py-20">
      <div className="section-container max-w-md">
        <Card className="border-none bg-white shadow-strong rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 pb-4 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <BrandMark size="lg" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {status === "verifying"
                ? text.verifyingTitle
                : status === "invalid"
                  ? text.invalidTitle
                  : text.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {status === "verifying"
                ? text.verifyingSubtitle
                : status === "invalid"
                  ? text.invalidDescription
                  : text.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 pt-6 space-y-6">
            {status === "verifying" ? (
              <div className="flex justify-center py-6" aria-live="polite">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : null}

            {status === "invalid" ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  size="xl"
                  className="w-full rounded-2xl bg-primary py-6 hover:bg-navy transition-colors"
                  onClick={() => navigate("/forgot-password", { replace: true })}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.3em]">
                    {text.requestNewLink}
                  </span>
                </Button>
                <div className="text-center">
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
              </div>
            ) : null}

            {status === "ready" || status === "submitting" ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{text.newPasswordLabel}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={text.newPasswordPlaceholder}
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      disabled={status === "submitting"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? text.hidePasswordLabel : text.showPasswordLabel}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{text.confirmPasswordLabel}</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={text.confirmPasswordPlaceholder}
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                    disabled={status === "submitting"}
                  />
                </div>

                <Button
                  type="submit"
                  size="xl"
                  className="w-full rounded-2xl bg-primary py-6 hover:bg-navy transition-colors"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
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

                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/login")}
                    disabled={status === "submitting"}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    <ArrowLeft className="mr-2 h-3 w-3" />
                    {text.backToLogin}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
