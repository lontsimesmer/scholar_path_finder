import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock3, MessageSquareText, ShieldAlert, Wallet } from "lucide-react";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminCRMDocumentsManager } from "@/components/admin/crm/AdminCRMDocumentsManager";
import { AdminCRMEditDialog } from "@/components/admin/crm/AdminCRMEditDialog";
import { AdminCRMStudentHero, type PendingAction } from "@/components/admin/crm/AdminCRMStudentHero";
import { AdminCRMStudentOverviewCards } from "@/components/admin/crm/AdminCRMStudentOverviewCards";
import { AdminCRMStudentProcedureSection } from "@/components/admin/crm/AdminCRMStudentProcedureSection";
import { AdminCRMStudentSummary } from "@/components/admin/crm/AdminCRMStudentSummary";
import { AdminStudentHistoryCard } from "@/components/admin/crm/AdminStudentHistoryCard";
import { AdminStudentNotesCard } from "@/components/admin/crm/AdminStudentNotesCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCRM } from "@/hooks/use-admin-crm";
import { useAdminStudentDetail } from "@/hooks/use-admin-student-detail";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import { AdminCRMText, getPaymentFilterState } from "@/lib/admin-crm";
import { AdminStudentDetailText } from "@/lib/admin-student-detail";
import { getStudentDisplayName, getStudentProfileReviewStatus } from "@/lib/student-profile";

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

  const pendingActions = useMemo<PendingAction[]>(() => {
    if (!student) {
      return [];
    }

    const items: PendingAction[] = [];

    if (profileReviewStatus === "correction_requested") {
      items.push({
        icon: ShieldAlert,
        tone: "border-warning/30 bg-warning/10 text-warning",
        text: text.sheet.profileCorrectionAction,
      });
    } else if (profileReviewStatus !== "validated") {
      items.push({
        icon: ShieldAlert,
        tone: "border-warning/30 bg-warning/10 text-warning",
        text: text.sheet.profilePendingAction,
      });
    }

    if (paymentState === "pending") {
      items.push({
        icon: Wallet,
        tone: "border-warning/30 bg-warning/10 text-warning",
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
        tone: "border-warning/30 bg-warning/10 text-warning",
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

  const studentDisplayName = student
    ? getStudentDisplayName(student.profile, student.email)
    : undefined;

  return (
    <AdminLayout
      title={text.sheet.title}
      subtitle={studentDisplayName || student?.email || undefined}
    >
      <div className="space-y-6">
        {isLoading ? (
          <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
            <CardContent className="py-16 pt-16 text-center text-muted-foreground">
              {text.title}
            </CardContent>
          </Card>
        ) : !student ? (
          <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
            <CardContent className="py-16 pt-16 text-center text-muted-foreground">
              {text.empty}
            </CardContent>
          </Card>
        ) : (
          <>
            <AdminCRMStudentHero
              student={student}
              text={text}
              applicationStatusLabels={applicationStatusLabels}
              profileReviewStatus={profileReviewStatus}
              paymentState={paymentState}
              pendingActions={pendingActions}
              sectionLinks={sectionLinks}
              onEdit={handleEditStudent}
            />

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
                <AdminCRMStudentSummary
                  student={student}
                  text={detailText}
                  profileReviewStatus={profileReviewStatus}
                  latestNote={latestNote}
                  latestActivity={latestActivity}
                  dateFormatter={dateFormatter}
                  birthDateFormatter={birthDateFormatter}
                />
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
                  <AdminCRMStudentProcedureSection
                    student={student}
                    text={text}
                    applicationStatuses={applicationStatuses}
                    applicationStatusLabels={applicationStatusLabels}
                    onUpdateStatus={updateStatus}
                  />
                </section>

                <section id={sectionIds.documents} className="scroll-mt-28">
                  <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
                    <CardHeader className="pt-8 md:pt-8">
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
    </AdminLayout>
  );
};

export default AdminCRMStudent;
