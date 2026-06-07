import { CalendarDays, FileText, GraduationCap, Mail, User as UserIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfileRecord } from "@/lib/student-profile";
import { StartProcedureText } from "@/lib/start-procedure";

interface ProcedureProfileSummaryCardProps {
  currentDegreeLabel: string;
  emailValue: string;
  formattedBirthDate: string;
  fullName: string;
  notSpecified: string;
  profile: StudentProfileRecord | null;
  targetCountryLabel: string;
  targetProgramLabel: string;
  text: StartProcedureText;
}

export const ProcedureProfileSummaryCard = ({
  currentDegreeLabel,
  emailValue,
  formattedBirthDate,
  fullName,
  notSpecified,
  profile,
  targetCountryLabel,
  targetProgramLabel,
  text,
}: ProcedureProfileSummaryCardProps) => (
  <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
    <CardHeader className="border-b border-border/40 bg-white p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText size={18} />
        </div>
        <CardTitle className="font-display text-xl">{text.profileSummaryTitle}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="grid gap-6 p-8 sm:grid-cols-2">
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {text.fullName}
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserIcon size={14} className="text-primary/60" />
          {fullName}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {text.email}
        </p>
        <p className="flex break-all items-center gap-2 text-sm font-semibold text-foreground">
          <Mail size={14} className="text-primary/60" />
          {emailValue}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {text.birthDate}
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays size={14} className="text-primary/60" />
          {formattedBirthDate}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {currentDegreeLabel}
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GraduationCap size={14} className="text-primary/60" />
          {profile?.current_degree || notSpecified}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {targetCountryLabel}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {profile?.target_country || notSpecified}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {targetProgramLabel}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {profile?.target_program || notSpecified}
        </p>
      </div>
    </CardContent>
  </Card>
);
