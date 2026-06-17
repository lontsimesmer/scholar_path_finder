import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, Mail, ShieldCheck, Sparkles, UserRoundCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandMark from "@/components/BrandMark";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ADMIN_DASHBOARD_PATH, isAdminEmail } from "@/lib/admin-session";
import {
  buildVerifyContactUrl,
  type ContactVerificationStatus,
} from "@/lib/contact-verification";
import { createLogger, getErrorMessage } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

const sanitizeRedirect = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }
  return value;
};

const logger = createLogger("Login");

type LoginTextExtensions = typeof import("@/i18n/translations/en").en.login & {
  verificationPendingTitle: string;
  verificationPendingDescription: string;
  verificationRequiredTitle: string;
  verificationRequiredDescription: string;
};

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const loginText = t.login as LoginTextExtensions;
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = sanitizeRedirect(searchParams.get("redirect"));

  useEffect(() => {
    const resolveVerificationStatus = async (user: User) => {
      if (!user.id) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke("get-contact-verification-status", {
        body: {},
      });

      if (error) {
        throw error;
      }

      return (data as ContactVerificationStatus | null) ?? null;
    };

    const redirectToVerification = async (user: User, channels: Array<"email" | "sms">) => {
      navigate(
        buildVerifyContactUrl({
          email: user.email ?? email,
          channels,
          redirect: redirectTo,
        }),
        { replace: true },
      );
    };

    const redirectAuthenticatedUser = async (user: User) => {
      logger.info("Resolving post-auth redirect", {
        userId: user.id,
        redirectTo,
      });

      try {
        const verificationStatus = await resolveVerificationStatus(user);
        if (
          verificationStatus?.enabled &&
          verificationStatus.verificationRequired &&
          verificationStatus.pendingChannels.length > 0
        ) {
          logger.info("Authenticated user still has pending contact verification", {
            userId: user.id,
            pendingChannels: verificationStatus.pendingChannels,
          });
          toast({
            title: loginText.verificationRequiredTitle,
            description: loginText.verificationRequiredDescription,
          });
          await redirectToVerification(user, verificationStatus.pendingChannels);
          return;
        }
      } catch (verificationError: unknown) {
        logger.error("Failed to resolve contact verification status after authentication", {
          userId: user.id,
          message: getErrorMessage(verificationError),
        });
      }

      let admin = false;
      try {
        admin = await isAdminEmail(user.email);
      } catch (adminError: unknown) {
        logger.error("Failed to check admin status after authentication", {
          userId: user.id,
          message: getErrorMessage(adminError),
        });
      }

      if (admin) {
        logger.info("Authenticated user is an admin, redirecting to the admin dashboard", {
          userId: user.id,
        });
        navigate(ADMIN_DASHBOARD_PATH, { replace: true });
        return;
      }

      logger.info("Authenticated user is not an admin, redirecting", {
        userId: user.id,
        redirectTo,
      });
      navigate(redirectTo, { replace: true });
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        logger.info("Existing session found on login page, redirecting", {
          userId: session.user.id,
          redirectTo,
        });
        await redirectAuthenticatedUser(session.user);
      }
    };
    void checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info("Login auth state changed", { event, hasSession: Boolean(session) });

      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      if (session) {
        void redirectAuthenticatedUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [email, loginText.verificationRequiredDescription, loginText.verificationRequiredTitle, navigate, redirectTo, toast]);

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    logger.info("Attempting email sign in", {
      hasEmail: Boolean(email.trim()),
      redirectTo,
    });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      logger.info("Sign in successful", { userId: data.user?.id });

      if (data.user) {
        logger.info("Delegating post-sign-in routing", { userId: data.user.id });
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Email sign in failed", { message });
      toast({ title: t.login.errorTitle, description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    logger.info("Attempting email sign up", { hasEmail: Boolean(email.trim()) });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      logger.info("Sign up succeeded", { userId: data.user?.id });

      logger.info("Sign up completed without custom verification");
      toast({ title: t.login.signUpTab, description: t.login.signUpSuccessDescription });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Email sign up failed", { message });
      toast({ title: t.login.errorTitle, description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const highlights = [
    { icon: ShieldCheck, ...t.login.highlights.secure },
    { icon: UserRoundCheck, ...t.login.highlights.followup },
    { icon: Sparkles, ...t.login.highlights.journey },
  ];

  return (
    <div className="min-h-screen bg-secondary/5 flex items-center justify-center px-4 py-20">
      <div className="section-container max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] items-center">
          
          {/* Info Side */}
          <div className="hidden lg:block space-y-12">
            <ScrollReveal animation="fade-in">
              <div className="flex items-center gap-4 mb-8">
                <BrandMark size="lg" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/40">Power Prestation</p>
                  <p className="text-xs text-muted-foreground">{t.login.brandSubtitle}</p>
                </div>
              </div>
              <h1 className="font-display text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
                {t.login.subtitle.split('.')[0]}.
              </h1>
            </ScrollReveal>

            <div className="grid gap-6">
              {highlights.map((item, index) => (
                <ScrollReveal key={item.title} animation="slide-up" delay={index * 100}>
                  <div className="flex items-start gap-6 group">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                      <item.icon size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Form Side */}
          <ScrollReveal animation="scale-in">
            <Card className="border-none bg-white shadow-strong rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 lg:p-14 pb-0 text-center space-y-4">
                <div className="lg:hidden flex justify-center mb-4"><BrandMark size="lg" /></div>
                <CardTitle className="font-display text-3xl font-bold tracking-tight">{t.login.title}</CardTitle>
                <p className="text-muted-foreground text-sm">{t.login.subtitle}</p>
              </CardHeader>
              
              <CardContent className="p-10 lg:p-14 pt-8 space-y-8">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-secondary/20 p-1 rounded-2xl h-12 mb-10">
                    <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">{t.login.signInTab}</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">{t.login.signUpTab}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-8">
                    <form onSubmit={handleEmailSignIn} className="space-y-8">
                      <div className="space-y-6">
                        <div className="group relative space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                            {t.login.emailLabel}
                          </label>
                          <div className="flex items-center gap-4 border-b border-border/40 group-focus-within:border-primary transition-all duration-500">
                            <Mail size={18} className="text-muted-foreground/30" />
                            <Input 
                              type="email" 
                              required 
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder={t.login.emailPlaceholder}
                              className="border-0 rounded-none px-0 focus-visible:ring-0 h-10 bg-transparent w-full"
                            />
                          </div>
                        </div>
                        <div className="group relative space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                            {t.login.passwordLabel}
                          </label>
                          <div className="flex items-center gap-4 border-b border-border/40 group-focus-within:border-primary transition-all duration-500">
                            <Lock size={18} className="text-muted-foreground/30" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              required 
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="border-0 rounded-none px-0 focus-visible:ring-0 h-10 bg-transparent w-full"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-muted-foreground/30 hover:text-primary transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <Button type="submit" size="xl" className="w-full group bg-primary py-7 rounded-2xl shadow-none hover:bg-navy transition-all duration-500" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                          <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
                            {t.login.signInButton}
                            <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-8">
                    <form onSubmit={handleEmailSignUp} className="space-y-8">
                      <div className="space-y-6">
                        <div className="group relative space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                            {t.login.emailLabel}
                          </label>
                          <div className="flex items-center gap-4 border-b border-border/40 group-focus-within:border-primary transition-all duration-500">
                            <Mail size={18} className="text-muted-foreground/30" />
                            <Input 
                              type="email" 
                              required 
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder={t.login.emailPlaceholder}
                              className="border-0 rounded-none px-0 focus-visible:ring-0 h-10 bg-transparent w-full"
                            />
                          </div>
                        </div>
                        <div className="group relative space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                            {t.login.passwordLabel}
                          </label>
                          <div className="flex items-center gap-4 border-b border-border/40 group-focus-within:border-primary transition-all duration-500">
                            <Lock size={18} className="text-muted-foreground/30" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              required 
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              minLength={6}
                              className="border-0 rounded-none px-0 focus-visible:ring-0 h-10 bg-transparent w-full"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-muted-foreground/30 hover:text-primary transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <Button type="submit" size="xl" className="w-full group bg-primary py-7 rounded-2xl shadow-none hover:bg-navy transition-all duration-500" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                          <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
                            {t.login.signUpButton}
                            <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="text-center pt-4">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    {t.login.backHome}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Login;
