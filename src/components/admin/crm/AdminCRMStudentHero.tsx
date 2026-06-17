import { AlertTriangle, LucideIcon, Mail, Pencil } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminCRMStudent, AdminCRMText } from "@/lib/admin-crm";
import { getStudentDisplayName, type StudentProfileReviewStatus } from "@/lib/student-profile";
import { cn } from "@/lib/utils";

export type PendingAction = {
  icon: LucideIcon;
  tone: string;
  text: string;
};

type PaymentState = "paid" | "pending" | "unpaid" | "refunded" | "none";

type SectionLink = {
  href: string;
  label: string;
};

interface AdminCRMStudentHeroProps {
  student: AdminCRMStudent;
  text: AdminCRMText;
  applicationStatusLabels: Record<string, string>;
  profileReviewStatus: StudentProfileReviewStatus;
  paymentState: PaymentState;
  pendingActions: PendingAction[];
  sectionLinks: SectionLink[];
  onEdit: (student: AdminCRMStudent) => void;
}

const profileBadgeClass = (status: StudentProfileReviewStatus) =>
  status === "validated"
    ? "border-success/20 bg-success/5 text-success"
    : "border-warning/30 bg-warning/10 text-warning";

const profileBadgeLabel = (status: StudentProfileReviewStatus, text: AdminCRMText) =>
  status === "validated"
    ? text.profileValidated
    : status === "correction_requested"
      ? text.profileCorrectionRequested
      : text.profilePendingValidation;

const paymentBadgeClass = (state: PaymentState) => {
  if (state === "paid") return "border-success/20 bg-success/5 text-success";
  if (state === "pending") return "border-warning/30 bg-warning/10 text-warning";
  return "border-border/40 bg-secondary/20 text-foreground";
};

export const AdminCRMStudentHero = ({
  student,
  text,
  applicationStatusLabels,
  profileReviewStatus,
  paymentState,
  pendingActions,
  sectionLinks,
  onEdit,
}: AdminCRMStudentHeroProps) => (
  <Card className="overflow-hidden rounded-2xl border-border/40 bg-white shadow-soft">
    <CardContent className="bg-[linear-gradient(135deg,rgba(25,113,194,0.08),rgba(255,255,255,0.95))] p-6 pt-6 md:p-8 md:pt-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              {getStudentDisplayName(student.profile, student.email)}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {student.email}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                profileBadgeClass(profileReviewStatus),
              )}
            >
              {profileBadgeLabel(profileReviewStatus, text)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                paymentBadgeClass(paymentState),
              )}
            >
              {text.paymentStates[paymentState]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                student.documentSummary.pending > 0
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-border/40 bg-secondary/20 text-foreground",
              )}
            >
              {`${student.documentSummary.pending} ${text.sheet.documentsPending.toLowerCase()}`}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/40 bg-secondary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground"
            >
              {student.application?.status
                ? applicationStatusLabels[student.application.status] || student.application.status
                : "-"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/admin/crm">{text.breadcrumbCurrent}</Link>
          </Button>
          <Button className="rounded-xl" onClick={() => onEdit(student)}>
            <Pencil className="mr-2 h-4 w-4" />
            {text.edit}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{text.sheet.attentionRequired}</p>
          </div>
          {pendingActions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
              <p className="text-sm font-semibold text-success">{text.sheet.allClear}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text.sheet.allClearDescription}</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pendingActions.map((action) => (
                <div
                  key={action.text}
                  className={cn("rounded-2xl border px-4 py-3", action.tone)}
                >
                  <div className="flex items-start gap-3">
                    <action.icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium">{action.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {text.sheet.jumpTo}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sectionLinks.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-full border border-border/40 bg-secondary/20 px-3 py-2 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:border-primary/20 hover:text-primary"
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
