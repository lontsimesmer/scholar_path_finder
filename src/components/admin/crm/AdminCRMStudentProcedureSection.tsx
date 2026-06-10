import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminCRMStudent, AdminCRMText } from "@/lib/admin-crm";

interface AdminCRMStudentProcedureSectionProps {
  student: AdminCRMStudent;
  text: AdminCRMText;
  applicationStatuses: string[];
  applicationStatusLabels: Record<string, string>;
  onUpdateStatus: (appId: string, newStatus: string) => void | Promise<void>;
}

export const AdminCRMStudentProcedureSection = ({
  student,
  text,
  applicationStatuses,
  applicationStatusLabels,
  onUpdateStatus,
}: AdminCRMStudentProcedureSectionProps) => (
  <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
    <CardHeader className="pt-8 md:pt-8">
      <CardTitle>{text.sheet.sectionProcedure}</CardTitle>
      <CardDescription>{text.subtitle}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {text.columns.currentStatus}
        </p>
        <Select
          value={student.application?.status}
          onValueChange={(value) => {
            if (student.application?.id) {
              void onUpdateStatus(student.application.id, value);
            }
          }}
        >
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {applicationStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {applicationStatusLabels[status] || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.fields.targetCountry}
          </p>
          <p className="mt-2 text-foreground">
            {student.profile?.target_country || text.sheet.noTargetCountry}
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {text.fields.targetProgram}
          </p>
          <p className="mt-2 text-foreground">
            {student.profile?.target_program || text.sheet.noTargetProgram}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {text.fields.generalNote}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-foreground">
          {student.application?.notes || text.fields.generalNotePlaceholder}
        </p>
      </div>
    </CardContent>
  </Card>
);
