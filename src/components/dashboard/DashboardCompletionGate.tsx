import { AlertCircle, Loader2, LogOut, User as UserIcon } from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { DashboardProfileFormFields } from "@/components/dashboard/DashboardProfileFormFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardText, StudentProfile } from "@/lib/dashboard";

interface DashboardCompletionGateProps {
  completionRedirectTarget: string | null;
  formData: StudentProfile;
  formHasRequiredFields: boolean;
  isSavingProfile: boolean;
  onFieldChange: (field: keyof StudentProfile, value: string) => void;
  onRequestValidation: () => void;
  onSignOut: () => Promise<void>;
  profileCorrectionComment: string | null;
  profileDisplayName: string;
  profileReviewStatus: "validated" | "correction_requested" | "pending";
  signOutLabel: string;
  text: DashboardText;
}

export const DashboardCompletionGate = ({
  completionRedirectTarget,
  formData,
  formHasRequiredFields,
  isSavingProfile,
  onFieldChange,
  onRequestValidation,
  onSignOut,
  profileCorrectionComment,
  profileDisplayName,
  profileReviewStatus,
  signOutLabel,
  text,
}: DashboardCompletionGateProps) => (
  <div className="page-shell">
    <Header />

    <main className="relative z-10 pb-24 pt-32">
      <div className="section-container max-w-4xl space-y-8">
        <div className="animate-stagger-in flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              <AlertCircle size={14} />
              {text.requiredForProcedure}
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {text.welcome}{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {profileDisplayName}
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground/80">
              {text.completeProfileDescription}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onSignOut()}
            className="self-start gap-2 rounded-xl text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut size={16} />
            {signOutLabel}
          </Button>
        </div>

        <Card className="animate-card-in overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
          <CardHeader className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <UserIcon size={22} />
              </div>
              <div className="space-y-2">
                <CardTitle className="font-display text-2xl tracking-tight">{text.completeProfileTitle}</CardTitle>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground/80">
                  {text.completeProfileHelper}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-8 md:pt-8">
            <div className="rounded-[1.6rem] border border-primary/10 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] p-5">
              <p className="text-xs leading-7 text-foreground/80">
                {profileReviewStatus === "correction_requested"
                  ? text.correctionRequestedPrompt
                  : formHasRequiredFields
                    ? text.confirmProfilePrompt
                    : completionRedirectTarget
                      ? text.completeBeforeContinuing
                      : text.requiredForProcedure}
              </p>
            </div>

            {profileReviewStatus === "correction_requested" && profileCorrectionComment ? (
              <div className="rounded-[1.6rem] border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  {text.correctionRequestedTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-amber-900/80">{profileCorrectionComment}</p>
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onRequestValidation();
              }}
              className="space-y-6"
            >
              <DashboardProfileFormFields
                formData={formData}
                isDisabled={isSavingProfile}
                onFieldChange={onFieldChange}
                text={text}
              />
              <Button type="submit" className="w-full rounded-xl py-6 shadow-sm" disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="mr-2 animate-spin" /> : null}
                {completionRedirectTarget ? text.validateAndContinue : text.validateProfile}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>

    <Footer />
  </div>
);
