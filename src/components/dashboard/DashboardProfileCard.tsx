import { AlertCircle, CalendarDays, Globe, GraduationCap, Loader2, Lock, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardProfileFormFields } from "@/components/dashboard/DashboardProfileFormFields";
import { DashboardText, StudentProfile } from "@/lib/dashboard";
import { ProcedureLeadSummary } from "@/lib/procedure-lead";
import { cn } from "@/lib/utils";

interface DashboardProfileCardProps {
  applicationExists: boolean;
  canResumePayment: boolean;
  formattedBirthDate: string;
  formattedLockedAt: string;
  formData: StudentProfile;
  isSavingProfile: boolean;
  onFieldChange: (field: keyof StudentProfile, value: string) => void;
  onNavigateToPayment: () => void;
  onNavigateToProcedureStart: () => void;
  onSubmit: () => void;
  procedureLead: ProcedureLeadSummary | null;
  profile: StudentProfile | null;
  profileIsReadyForProcedure: boolean;
  text: DashboardText;
}

const profileFields = (
  profile: StudentProfile | null,
  formattedBirthDate: string,
  text: DashboardText,
) => [
  {
    label: text.firstName,
    value: profile?.first_name,
    icon: UserIcon,
  },
  {
    label: text.lastName,
    value: profile?.last_name,
    icon: UserIcon,
  },
  {
    label: text.birthDate,
    value: formattedBirthDate,
    icon: CalendarDays,
  },
  {
    label: text.targetCountry,
    value: profile?.target_country,
    icon: Globe,
  },
  {
    label: text.targetProgram,
    value: profile?.target_program,
    icon: GraduationCap,
  },
  {
    label: text.currentDegree,
    value: profile?.current_degree,
    icon: null,
  },
];

export const DashboardProfileCard = ({
  applicationExists,
  canResumePayment,
  formattedBirthDate,
  formattedLockedAt,
  formData,
  isSavingProfile,
  onFieldChange,
  onNavigateToPayment,
  onNavigateToProcedureStart,
  onSubmit,
  procedureLead,
  profile,
  profileIsReadyForProcedure,
  text,
}: DashboardProfileCardProps) => {
  const fields = profileFields(profile, formattedBirthDate, text);

  return (
    <Card className="sticky top-32 overflow-hidden rounded-[2.5rem] border-border/30 shadow-strong">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 pb-8 pt-10 md:px-8 md:pb-8 md:pt-10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl shadow-sm",
              profileIsReadyForProcedure ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
            )}
          >
            {profileIsReadyForProcedure ? <Lock size={18} /> : <UserIcon size={20} />}
          </div>
          <CardTitle className="font-display text-2xl tracking-tight">{text.profileTitle}</CardTitle>
        </div>

        <div
          className={cn(
            "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest",
            profileIsReadyForProcedure
              ? "border-success/20 bg-success/5 text-success"
              : "border-destructive/20 bg-destructive/5 text-destructive",
          )}
        >
          {profileIsReadyForProcedure ? text.profileLockedBadge : text.requiredForProcedure}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-8 md:pt-8">
        {profileIsReadyForProcedure ? (
          <>
            <div className="space-y-4">
              {fields.map((field) => {
                const displayValue = field.value || text.notSpecified;
                const FieldIcon = field.icon;
                return (
                  <div
                    key={field.label}
                    className="group rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border/20 hover:bg-secondary/10"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {field.label}
                    </label>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                      {FieldIcon ? <FieldIcon size={14} className="text-primary/50" /> : null}
                      {displayValue}
                    </div>
                  </div>
                );
              })}
              <div className="rounded-xl border border-transparent px-3 py-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {text.profileLockedAt}
                </label>
                <div className="mt-1 text-sm font-semibold text-foreground">{formattedLockedAt}</div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border/30 pt-6">
              <div className="flex gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-amber-50/50 p-4">
                <AlertCircle size={18} className="shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-700">{text.profileLockedDescription}</p>
              </div>

              {!procedureLead && !applicationExists ? (
                <Button onClick={onNavigateToProcedureStart} className="w-full rounded-xl" variant="outline">
                  {text.startProcedure}
                </Button>
              ) : canResumePayment ? (
                <Button onClick={onNavigateToPayment} className="w-full rounded-xl shadow-sm">
                  {text.proceedToPayment}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="space-y-6"
          >
            <div className="rounded-[1.4rem] border border-border/30 bg-gradient-to-br from-secondary/20 to-transparent p-4">
              <p className="text-sm leading-7 text-muted-foreground">
                {!procedureLead && !applicationExists ? text.noActiveProcedureHelper : text.completeProfileHelper}
              </p>
            </div>
            <DashboardProfileFormFields
              formData={formData}
              isDisabled={isSavingProfile}
              onFieldChange={onFieldChange}
              text={text}
            />
            <Button type="submit" className="w-full rounded-xl py-6 shadow-sm" disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 className="mr-2 animate-spin" /> : null}
              {canResumePayment ? text.validateAndContinue : text.validateProfile}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
