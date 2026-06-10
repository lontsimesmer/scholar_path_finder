import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCRMStudent, AdminCRMText } from "@/lib/admin-crm";
import { AdminStudentDetailText, AdminStudentInternalNote, AdminStudentActivityLog } from "@/lib/admin-student-detail";
import { type StudentProfileReviewStatus } from "@/lib/student-profile";

interface AdminCRMStudentSummaryProps {
  student: AdminCRMStudent;
  text: AdminCRMText & AdminStudentDetailText;
  profileReviewStatus: StudentProfileReviewStatus;
  latestNote: AdminStudentInternalNote | null;
  latestActivity: AdminStudentActivityLog | null;
  dateFormatter: Intl.DateTimeFormat;
  birthDateFormatter: Intl.DateTimeFormat;
}

const profileStatusLabel = (status: StudentProfileReviewStatus, text: AdminCRMText) => {
  if (status === "validated") return text.profileValidated;
  if (status === "correction_requested") return text.profileCorrectionRequested;
  return text.profilePendingValidation;
};

export const AdminCRMStudentSummary = ({
  student,
  text,
  profileReviewStatus,
  latestNote,
  latestActivity,
  dateFormatter,
  birthDateFormatter,
}: AdminCRMStudentSummaryProps) => {
  const latestActivityLabel = latestActivity
    ? `${dateFormatter.format(new Date(latestActivity.created_at))} - ${
        text.historyActions[latestActivity.action_type] ||
        latestActivity.action_label ||
        latestActivity.action_type
      }`
    : text.noHistory;

  return (
    <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
      <CardHeader className="pt-8 md:pt-8">
        <CardTitle>{text.sheet.sectionOverview}</CardTitle>
        <CardDescription>{text.sheet.pendingActionsTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.sheet.studentEmail}
          </p>
          <p className="mt-2 break-all font-medium text-foreground">{student.email}</p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.fields.birthDate}
          </p>
          <p className="mt-2 font-medium text-foreground">
            {student.profile?.birth_date
              ? birthDateFormatter.format(new Date(student.profile.birth_date))
              : text.sheet.noBirthDate}
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.sheet.profileStatus}
          </p>
          <p className="mt-2 font-medium text-foreground">
            {profileStatusLabel(profileReviewStatus, text)}
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.sheet.latestNote}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-foreground">
            {latestNote?.note || text.noNotes}
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.sheet.latestActivity}
          </p>
          <p className="mt-2 text-foreground">{latestActivityLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
};
