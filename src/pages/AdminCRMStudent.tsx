import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Pencil,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import Header from "@/components/Header";
import { AdminCRMDocumentsManager } from "@/components/admin/crm/AdminCRMDocumentsManager";
import { AdminCRMEditDialog } from "@/components/admin/crm/AdminCRMEditDialog";
import { AdminCRMStudentOverviewCards } from "@/components/admin/crm/AdminCRMStudentOverviewCards";
import { AdminStudentHistoryCard } from "@/components/admin/crm/AdminStudentHistoryCard";
import { AdminStudentNotesCard } from "@/components/admin/crm/AdminStudentNotesCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminCRM } from "@/hooks/use-admin-crm";
import { useAdminStudentDetail } from "@/hooks/use-admin-student-detail";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import { AdminCRMText, getPaymentFilterState } from "@/lib/admin-crm";
import { AdminStudentDetailText } from "@/lib/admin-student-detail";
import { getStudentDisplayName, getStudentProfileReviewStatus } from "@/lib/student-profile";
import { cn } from "@/lib/utils";

const applicationStatuses = [
  "consultation_paid",
  "profile_evaluation",
  "university_selection",
  "application_submitted",
  "admission_received",
  "visa_processing",
  "visa_granted",
  "completed",
];

const sectionIds = {
  overview: "student-overview",
  procedure: "student-procedure",
  documents: "student-documents",
  notes: "student-notes",
  history: "student-history",
} as const;

const AdminCRMStudent = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const text = t.adminCRM as AdminCRMText;
  const applicationStatusLabels = t.dashboard.status as Record<string, string>;
  const {
    editingStudent,
    createDocumentRequest,
    fetchStudents,
    formData,
    getFileUrl,
    handleEditStudent,
    handleRequestProfileCorrection,
    handleSaveStudent,
    isDocsLoading,
    isLoading,
    isRequestingDocument,
    isSaving,
    setEditingStudent,
    setFormData,
    setStudentDocs,
    studentDocs,
    studentDocumentRequests,
    students,
    mutationVersion,
    updateDoc,
    updateStatus,
    viewDocuments,
  } = useAdminCRM({
    locale: language,
    noEmail: text.noEmail,
    text: {
      correctionCommentRequiredDescription: text.correctionCommentRequiredDescription,
      correctionCommentRequiredTitle: text.correctionCommentRequiredTitle,
      correctionRequestedSuccess: text.correctionRequestedSuccess,
      documentUpdated: text.documentUpdated,
      documentRequestCreated: text.documentRequestCreated,
      documentRequestRequiredDescription: text.documentRequestRequiredDescription,
      documentRequestRequiredTitle: text.documentRequestRequiredTitle,
      studentUpdated: text.studentUpdated,
      statusUpdated: text.statusUpdated,
      updateFailed: text.updateFailed,
    },
    toast,
  });
  const detailText = text as AdminCRMText & AdminStudentDetailText;
  const {
    activityLogs,
    addNote,
    isLoading: isTimelineLoading,
    isSavingNote,
    noteDraft,
    notes,
    setNoteDraft,
  } = useAdminStudentDetail({
    studentId: studentId ?? null,
    refreshKey: mutationVersion,
    text: detailText,
  });

  useEffect(() => {
    if (!studentId) {
      navigate("/admin/crm", { replace: true });
    }
  }, [navigate, studentId]);

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      const session = await getAdminSession();
      if (!session) {
        navigate("/login?redirect=/admin/crm", { replace: true });
        return;
      }

      if (isActive) {
        await fetchStudents();
      }
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, [fetchStudents, navigate]);

  const student = useMemo(
    () => students.find((item) => item.id === studentId) ?? null,
    [studentId, students],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );
  const birthDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "long",
      }),
    [language],
  );

  useEffect(() => {
    if (student) {
      void viewDocuments(student);
    }
  }, [student, viewDocuments]);

  const profileReviewStatus = student ? getStudentProfileReviewStatus(student.profile) : "pending";
  const paymentState = student ? getPaymentFilterState(student) : "none";
  const latestNote = notes[0] ?? null;
  const latestActivity = activityLogs[0] ?? null;

  const sectionLinks = useMemo(
    () => [
      { href: `#${sectionIds.overview}`, label: text.sheet.sectionOverview },
      { href: `#${sectionIds.procedure}`, label: text.sheet.sectionProcedure },
      { href: `#${sectionIds.documents}`, label: text.sheet.sectionDocuments },
      { href: `#${sectionIds.notes}`, label: text.sheet.sectionNotes },
      { href: `#${sectionIds.history}`, label: text.sheet.sectionHistory },
    ],
    [text.sheet],
  );

  const pendingActions = useMemo(() => {
    if (!student) {
      return [];
    }

    const items: Array<{ icon: typeof ShieldAlert; tone: string; text: string }> = [];

    if (profileReviewStatus === "correction_requested") {
      items.push({
        icon: ShieldAlert,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        text: text.sheet.profileCorrectionAction,
      });
    } else if (profileReviewStatus !== "validated") {
      items.push({
        icon: ShieldAlert,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        text: text.sheet.profilePendingAction,
      });
    }

    if (paymentState === "pending") {
      items.push({
        icon: Wallet,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        text: text.sheet.paymentPendingAction,
      });
    } else if (paymentState === "unpaid" || paymentState === "none") {
      items.push({
        icon: Wallet,
        tone: "border-border/40 bg-secondary/20 text-foreground",
        text: text.sheet.paymentMissingAction,
      });
    }

    if (student.documentSummary.pending > 0) {
      items.push({
        icon: Clock3,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        text: text.sheet.documentsPendingAction.replace(
          "{count}",
          String(student.documentSummary.pending),
        ),
      });
    }

    if (notes.length === 0) {
      items.push({
        icon: MessageSquareText,
        tone: "border-border/40 bg-secondary/20 text-foreground",
        text: text.sheet.notesMissingAction,
      });
    }

    return items;
  }, [notes.length, paymentState, profileReviewStatus, student, text.sheet]);

  if (!studentId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              <LayoutDashboard size={14} />
              {text.breadcrumbDashboard}
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <Link
              to="/admin/crm"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              {text.breadcrumbCurrent}
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {text.sheet.title}
            </span>
          </div>

          {isLoading ? (
            <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
              <CardContent className="py-16 pt-16 text-center text-muted-foreground">
                {text.title}
              </CardContent>
            </Card>
          ) : !student ? (
            <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
              <CardContent className="py-16 pt-16 text-center text-muted-foreground">
                {text.empty}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden rounded-[2rem] border-border/40 bg-white shadow-strong">
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
                            profileReviewStatus === "validated"
                              ? "border-success/20 bg-success/5 text-success"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {profileReviewStatus === "validated"
                            ? text.profileValidated
                            : profileReviewStatus === "correction_requested"
                              ? text.profileCorrectionRequested
                              : text.profilePendingValidation}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                            paymentState === "paid"
                              ? "border-success/20 bg-success/5 text-success"
                              : paymentState === "pending"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-border/40 bg-secondary/20 text-foreground",
                          )}
                        >
                          {text.paymentStates[paymentState]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                            student.documentSummary.pending > 0
                              ? "border-amber-200 bg-amber-50 text-amber-700"
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
                      <Button className="rounded-xl" onClick={() => handleEditStudent(student)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {text.edit}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
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

                    <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
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

              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
                  <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
                    <CardHeader>
                      <CardTitle>{text.sheet.sectionOverview}</CardTitle>
                      <CardDescription>{text.sheet.pendingActionsTitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {text.sheet.studentEmail}
                        </p>
                        <p className="mt-2 break-all font-medium text-foreground">{student.email}</p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {text.fields.birthDate}
                        </p>
                        <p className="mt-2 font-medium text-foreground">
                          {student.profile?.birth_date
                            ? birthDateFormatter.format(new Date(student.profile.birth_date))
                            : text.sheet.noBirthDate}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {text.sheet.profileStatus}
                        </p>
                        <p className="mt-2 font-medium text-foreground">
                          {profileReviewStatus === "validated"
                            ? text.profileValidated
                            : profileReviewStatus === "correction_requested"
                              ? text.profileCorrectionRequested
                              : text.profilePendingValidation}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {text.sheet.latestNote}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-foreground">
                          {latestNote?.note || text.noNotes}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {text.sheet.latestActivity}
                        </p>
                        <p className="mt-2 text-foreground">
                          {latestActivity
                            ? `${dateFormatter.format(new Date(latestActivity.created_at))} - ${text.historyActions[latestActivity.action_type] || latestActivity.action_label || latestActivity.action_type}`
                            : text.noHistory}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <section id={sectionIds.overview} className="scroll-mt-28 space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-foreground">{text.sheet.sectionOverview}</h2>
                      <p className="text-sm text-muted-foreground">{text.subtitle}</p>
                    </div>
                    <AdminCRMStudentOverviewCards
                      applicationStatusLabels={applicationStatusLabels}
                      student={student}
                      text={text}
                    />
                  </section>

                  <section id={sectionIds.procedure} className="scroll-mt-28">
                    <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
                      <CardHeader>
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
                                void updateStatus(student.application.id, value);
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
                          <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {text.fields.targetCountry}
                            </p>
                            <p className="mt-2 text-foreground">
                              {student.profile?.target_country || text.sheet.noTargetCountry}
                            </p>
                          </div>

                          <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {text.fields.targetProgram}
                            </p>
                            <p className="mt-2 text-foreground">
                              {student.profile?.target_program || text.sheet.noTargetProgram}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-border/40 bg-secondary/10 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {text.fields.generalNote}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-foreground">
                            {student.application?.notes || text.fields.generalNotePlaceholder}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section id={sectionIds.documents} className="scroll-mt-28">
                    <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
                      <CardHeader>
                        <CardTitle>{text.sheet.sectionDocuments}</CardTitle>
                        <CardDescription>{text.sheet.documentSummary}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AdminCRMDocumentsManager
                          documents={studentDocs}
                          documentRequests={studentDocumentRequests}
                          isLoading={isDocsLoading}
                          isRequestingDocument={isRequestingDocument}
                          onCreateDocumentRequest={createDocumentRequest}
                          onGetFileUrl={getFileUrl}
                          onSetDocuments={setStudentDocs}
                          onUpdateDoc={updateDoc}
                          text={text}
                        />
                      </CardContent>
                    </Card>
                  </section>

                  <section id={sectionIds.notes} className="scroll-mt-28">
                    <AdminStudentNotesCard
                      dateFormatter={dateFormatter}
                      isLoading={isTimelineLoading}
                      isSavingNote={isSavingNote}
                      noteDraft={noteDraft}
                      notes={notes}
                      onAddNote={addNote}
                      onNoteDraftChange={setNoteDraft}
                      text={detailText}
                    />
                  </section>

                  <section id={sectionIds.history} className="scroll-mt-28">
                    <AdminStudentHistoryCard
                      activityLogs={activityLogs}
                      applicationStatusLabels={applicationStatusLabels}
                      dateFormatter={dateFormatter}
                      isLoading={isTimelineLoading}
                      text={detailText}
                    />
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AdminCRMEditDialog
        formData={formData}
        isOpen={Boolean(editingStudent)}
        isSaving={isSaving}
        onClose={() => setEditingStudent(null)}
        onRequestCorrection={handleRequestProfileCorrection}
        onSave={handleSaveStudent}
        setFormData={setFormData}
        student={editingStudent}
        text={text}
      />
    </div>
  );
};

export default AdminCRMStudent;
