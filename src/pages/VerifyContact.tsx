import { ArrowLeft, CheckCircle2, Loader2, Mail, MessageSquareText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useContactVerification } from "@/hooks/use-contact-verification";
import { type VerificationChannel } from "@/lib/contact-verification";

const channelIconMap: Record<VerificationChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquareText,
};

const VerifyContact = () => {
  const {
    verificationText,
    status,
    currentChannel,
    code,
    setCode,
    isLoading,
    isSending,
    isVerifying,
    isInvalidLink,
    currentDestination,
    handleSelectChannel,
    handleVerify,
    handleResend,
    goToLogin,
  } = useContactVerification();

  if (isLoading) {
    return (
      <div className="page-shell flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{verificationText.loading}</p>
        </div>
      </div>
    );
  }

  if (isInvalidLink) {
    return (
      <div className="page-shell flex items-center justify-center px-4 py-20">
        <Card className="w-full max-w-xl rounded-3xl border-none bg-white shadow-strong">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <CardTitle>{verificationText.invalidLinkTitle}</CardTitle>
            <CardDescription>{verificationText.invalidLinkDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button variant="outline" onClick={() => goToLogin()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {verificationText.backToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-3xl rounded-[2rem] border-none bg-white shadow-strong">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="font-display text-3xl">{verificationText.title}</CardTitle>
          <CardDescription className="mx-auto max-w-2xl text-base">
            {verificationText.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-6 pb-8 sm:px-10">
          <div className="rounded-3xl border border-border/60 bg-secondary/15 p-5 text-sm text-muted-foreground">
            <p>{verificationText.intro}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["email", "sms"] as VerificationChannel[]).map((channel) => {
              const Icon = channelIconMap[channel];
              const isRequired = status.channels[channel].required;
              const isVerified = status.channels[channel].verified;
              const isActive = currentChannel === channel;

              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => void handleSelectChannel(channel)}
                  disabled={!isRequired}
                  className={[
                    "rounded-3xl border p-4 text-left transition-all",
                    isRequired ? "border-border bg-white hover:border-primary/40" : "cursor-not-allowed border-dashed border-border/60 bg-muted/40 opacity-60",
                    isActive ? "border-primary bg-primary/5 shadow-sm" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-2xl bg-secondary/40 p-2 text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {channel === "email"
                            ? verificationText.emailChannelLabel
                            : verificationText.smsChannelLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {channel === "email"
                            ? verificationText.emailChannelDescription
                            : verificationText.smsChannelDescription}
                        </p>
                      </div>
                    </div>
                    {isVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {currentChannel ? (
            <div className="rounded-3xl border border-border/60 bg-white p-6">
              <div className="space-y-2 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {verificationText.switchChannel}:{" "}
                  {currentChannel === "email"
                    ? verificationText.emailChannelLabel
                    : verificationText.smsChannelLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {verificationText.codeHint}
                  {currentDestination ? ` ${currentDestination}.` : ""}
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot key={index} index={index} className="h-12 w-12 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={() => void handleVerify()} disabled={code.length !== 6 || isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {verificationText.verifyingButton}
                    </>
                  ) : (
                    verificationText.verifyButton
                  )}
                </Button>
                <Button variant="outline" onClick={() => void handleResend()} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {verificationText.sendingButton}
                    </>
                  ) : (
                    verificationText.resendButton
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => goToLogin()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {verificationText.backToLogin}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyContact;
