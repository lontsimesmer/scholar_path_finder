import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Loader2,
  Filter,
  LayoutDashboard,
  Pencil,
  MessageSquare,
} from "lucide-react";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  buildStudentFullName,
  getStudentDisplayName,
  getStudentProfileReviewStatus,
} from "@/lib/student-profile";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  email: string;
  profile: {
    email: string | null;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    profile_locked_at: string | null;
    profile_validation_comment: string | null;
    profile_invalidated_at: string | null;
    target_country: string | null;
    target_program: string | null;
    current_degree: string | null;
  } | null;
  application: {
    id: string;
    status: string;
    notes: string;
    updated_at: string;
  } | null;
}

interface Document {
  id: string;
  title: string;
  file_path: string;
  status: "pending" | "approved" | "rejected";
  student_id: string;
  admin_feedback?: string;
}

const logger = createLogger("AdminCRM");

const AdminCRM = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentDocs, setStudentDocs] = useState<Document[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    profile_validation_comment: "",
    target_country: "",
    target_program: "",
    current_degree: "",
    general_notes: "",
  });

  const applicationStatusLabels = t.dashboard.status as Record<string, string>;
  const applicationStatuses = useMemo(
    () => [
      "consultation_paid",
      "profile_evaluation",
      "university_selection",
      "application_submitted",
      "admission_received",
      "visa_processing",
      "visa_granted",
      "completed",
    ],
    [],
  );

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    logger.info("Loading admin CRM students");

    try {
      const { data: apps } = await supabase.from("student_applications").select("*, student_id");
      const { data: profiles } = await supabase.from("student_profiles").select("*");

      const mappedStudents = (apps || []).map((app) => {
        const profile = (profiles || []).find((item) => item.id === app.student_id);

        return {
          id: app.student_id,
          email: profile?.email || t.adminCRM.noEmail,
          profile: profile || null,
          application: app,
        };
      });

      setStudents(mappedStudents as Student[]);
      logger.info("Admin CRM students loaded", {
        applicationCount: apps?.length ?? 0,
        profileCount: profiles?.length ?? 0,
        mappedCount: mappedStudents.length,
      });
    } catch (error) {
      logger.error("Failed to load admin CRM students", {
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t.adminCRM.noEmail]);

  const checkAdmin = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      logger.warn("Admin CRM requires authentication");
      navigate("/login?redirect=/admin/crm");
      return;
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("email")
      .eq("email", session.user.email)
      .maybeSingle();

    if (!admin) {
      logger.warn("Non-admin user attempted to access CRM", { userId: session.user.id });
      toast({ title: t.adminCRM.accessDenied, variant: "destructive" });
      navigate("/");
      return;
    }

    logger.info("Admin CRM access granted", { userId: session.user.id });
  }, [navigate, t.adminCRM.accessDenied, toast]);

  useEffect(() => {
    checkAdmin();
    fetchStudents();
  }, [checkAdmin, fetchStudents]);

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.profile?.first_name || "",
      last_name: student.profile?.last_name || "",
      birth_date: student.profile?.birth_date || "",
      profile_validation_comment: student.profile?.profile_validation_comment || "",
      target_country: student.profile?.target_country || "",
      target_program: student.profile?.target_program || "",
      current_degree: student.profile?.current_degree || "",
      general_notes: student.application?.notes || "",
    });
  };

  const handleSaveStudent = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingStudent) {
      return;
    }

    setIsSaving(true);
    logger.info("Saving admin CRM student changes", { studentId: editingStudent.id });

    try {
      const firstName = formData.first_name.trim();
      const lastName = formData.last_name.trim();
      const birthDate = formData.birth_date.trim();
      const isCorrectionRequested =
        getStudentProfileReviewStatus(editingStudent.profile) === "correction_requested";

      const { error: profileError } = await supabase
        .from("student_profiles")
        .upsert(
          {
            id: editingStudent.id,
            email: editingStudent.email === t.adminCRM.noEmail ? null : editingStudent.email,
            first_name: firstName || null,
            last_name: lastName || null,
            birth_date: birthDate || null,
            full_name: buildStudentFullName(firstName, lastName),
            profile_locked_at: isCorrectionRequested
              ? null
              : editingStudent.profile?.profile_locked_at ?? null,
            profile_validation_comment: isCorrectionRequested
              ? formData.profile_validation_comment.trim() || null
              : null,
            profile_invalidated_at: isCorrectionRequested
              ? editingStudent.profile?.profile_invalidated_at ?? null
              : null,
            target_country: formData.target_country.trim() || null,
            target_program: formData.target_program.trim() || null,
            current_degree: formData.current_degree.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (profileError) {
        throw profileError;
      }

      if (editingStudent.application) {
        const { error: appError } = await supabase
          .from("student_applications")
          .update({ notes: formData.general_notes })
          .eq("id", editingStudent.application.id);

        if (appError) {
          throw appError;
        }
      }

      toast({ title: t.adminCRM.studentUpdated });
      setEditingStudent(null);
      logger.info("Admin CRM student changes saved", { studentId: editingStudent.id });
      fetchStudents();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to save admin CRM student changes", {
        studentId: editingStudent.id,
        message,
      });
      toast({ title: t.adminCRM.updateFailed, description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestProfileCorrection = async () => {
    if (!editingStudent) {
      return;
    }

    const correctionComment = formData.profile_validation_comment.trim();
    if (!correctionComment) {
      toast({
        title: t.adminCRM.correctionCommentRequiredTitle,
        description: t.adminCRM.correctionCommentRequiredDescription,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    logger.info("Requesting student profile correction", { studentId: editingStudent.id });

    try {
      const firstName = formData.first_name.trim();
      const lastName = formData.last_name.trim();
      const birthDate = formData.birth_date.trim();

      const { error } = await supabase
        .from("student_profiles")
        .upsert(
          {
            id: editingStudent.id,
            email: editingStudent.email === t.adminCRM.noEmail ? null : editingStudent.email,
            first_name: firstName || null,
            last_name: lastName || null,
            birth_date: birthDate || null,
            full_name: buildStudentFullName(firstName, lastName),
            profile_locked_at: null,
            profile_validation_comment: correctionComment,
            profile_invalidated_at: new Date().toISOString(),
            target_country: formData.target_country.trim() || null,
            target_program: formData.target_program.trim() || null,
            current_degree: formData.current_degree.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (error) {
        throw error;
      }

      toast({ title: t.adminCRM.correctionRequestedSuccess });
      setEditingStudent(null);
      logger.info("Student profile correction requested", { studentId: editingStudent.id });
      fetchStudents();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to request student profile correction", {
        studentId: editingStudent.id,
        message,
      });
      toast({ title: t.adminCRM.updateFailed, description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    logger.info("Updating student application status", { appId, newStatus });

    const { error } = await supabase
      .from("student_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId);

    if (error) {
      logger.error("Failed to update student application status", {
        appId,
        newStatus,
        message: error.message,
      });
      toast({ title: t.adminCRM.updateFailed, description: error.message, variant: "destructive" });
      return;
    }

    logger.info("Student application status updated", { appId, newStatus });
    toast({ title: t.adminCRM.statusUpdated });
    fetchStudents();
  };

  const viewDocuments = async (student: Student) => {
    setSelectedStudent(student);
    setIsDocsLoading(true);
    logger.info("Loading student documents in admin CRM", { studentId: student.id });

    const { data, error } = await supabase
      .from("student_documents")
      .select("*")
      .eq("student_id", student.id);

    if (!error) {
      logger.info("Student documents loaded in admin CRM", {
        studentId: student.id,
        documentCount: data?.length ?? 0,
      });
      setStudentDocs(data as Document[]);
    } else {
      logger.error("Failed to load student documents in admin CRM", {
        studentId: student.id,
        message: error.message,
      });
    }

    setIsDocsLoading(false);
  };

  const updateDoc = async (docId: string, updates: Partial<Document>) => {
    logger.info("Updating student document from admin CRM", {
      docId,
      updatedFields: Object.keys(updates),
    });

    const { error } = await supabase.from("student_documents").update(updates).eq("id", docId);

    if (!error) {
      logger.info("Student document updated from admin CRM", { docId });
      toast({ title: t.adminCRM.documentUpdated });

      if (selectedStudent) {
        viewDocuments(selectedStudent);
      }

      return;
    }

    logger.error("Failed to update student document from admin CRM", {
      docId,
      message: error.message,
    });
    toast({ title: t.adminCRM.updateFailed, description: error.message, variant: "destructive" });
  };

  const getFileUrl = async (path: string) => {
    logger.info("Creating signed URL for student document", { path });
    const { data } = await supabase.storage.from("student-documents").createSignedUrl(path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const displayName = getStudentDisplayName(student.profile, student.email).toLowerCase();
    const firstName = (student.profile?.first_name || "").toLowerCase();
    const lastName = (student.profile?.last_name || "").toLowerCase();

    return (
      displayName.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query) ||
      student.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container">
          <div className="mb-8 flex items-center gap-4">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              <LayoutDashboard size={14} />
              {t.adminCRM.breadcrumbDashboard}
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {t.adminCRM.breadcrumbCurrent}
            </span>
          </div>

          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{t.adminCRM.title}</h1>
              <p className="mt-1 text-muted-foreground">{t.adminCRM.subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.adminCRM.searchPlaceholder}
                  className="w-64 border-border/40 bg-white pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <Button variant="outline" className="border-border/40 bg-white">
                <Filter size={18} className="mr-2" /> {t.adminCRM.filter}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/40 bg-white shadow-strong">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-[300px]">{t.adminCRM.columns.student}</TableHead>
                  <TableHead>{t.adminCRM.columns.target}</TableHead>
                  <TableHead>{t.adminCRM.columns.currentStatus}</TableHead>
                  <TableHead className="text-right">{t.adminCRM.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <Loader2 className="mx-auto animate-spin text-primary" size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">
                      {t.adminCRM.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const displayName = getStudentDisplayName(student.profile, student.email);
                    const profileReviewStatus = getStudentProfileReviewStatus(student.profile);

                    return (
                      <TableRow key={student.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {displayName.charAt(0).toUpperCase() || "S"}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{displayName || t.adminCRM.newStudent}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                              {profileReviewStatus === "validated" ? (
                                <p className="mt-2 inline-flex rounded-full border border-success/20 bg-success/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                                  {t.adminCRM.profileValidated}
                                </p>
                              ) : profileReviewStatus === "correction_requested" ? (
                                <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                  {t.adminCRM.profileCorrectionRequested}
                                </p>
                              ) : (
                                <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                  {t.adminCRM.profilePendingValidation}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="text-sm font-medium">{student.profile?.target_country || "-"}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {student.profile?.target_program || "-"}
                          </p>
                        </TableCell>

                        <TableCell>
                          <Select
                            value={student.application?.status}
                            onValueChange={(value) => {
                              if (student.application?.id) {
                                updateStatus(student.application.id, value);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 w-[200px] text-xs">
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
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStudent(student)}
                              className="gap-2 text-primary"
                            >
                              <Pencil size={16} />
                              {t.adminCRM.edit}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDocuments(student)}
                              className="gap-2"
                            >
                              <FileText size={16} />
                              {t.adminCRM.documents}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-hidden rounded-[2rem] p-0">
          <DialogHeader className="border-b border-border/40 px-6 py-5 pr-14">
            <DialogTitle>{t.adminCRM.editDialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStudent} className="flex max-h-[calc(90vh-4.5rem)] flex-col">
            <div className="space-y-6 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.firstName}
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.lastName}
                </label>
                <Input
                  value={formData.last_name}
                  onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.birthDate}
                </label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(event) => setFormData({ ...formData, birth_date: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.targetCountry}
                </label>
                <Input
                  value={formData.target_country}
                  onChange={(event) => setFormData({ ...formData, target_country: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.targetProgram}
                </label>
                <Input
                  value={formData.target_program}
                  onChange={(event) => setFormData({ ...formData, target_program: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.currentDegree}
                </label>
                <Input
                  value={formData.current_degree}
                  onChange={(event) => setFormData({ ...formData, current_degree: event.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.correctionComment}
                </label>
                <Textarea
                  value={formData.profile_validation_comment}
                  onChange={(event) =>
                    setFormData({ ...formData, profile_validation_comment: event.target.value })
                  }
                  placeholder={t.adminCRM.correctionCommentPlaceholder}
                  className="rounded-xl"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminCRM.fields.generalNote}
                </label>
                <Textarea
                  value={formData.general_notes}
                  onChange={(event) => setFormData({ ...formData, general_notes: event.target.value })}
                  placeholder={t.adminCRM.fields.generalNotePlaceholder}
                  className="rounded-xl"
                  rows={4}
                />
              </div>
            </div>

            <div className="border-t border-border/40 bg-white px-6 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-14 w-full rounded-xl px-4 py-4 text-center whitespace-normal leading-tight"
                  disabled={isSaving}
                  onClick={() => void handleRequestProfileCorrection()}
                >
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                  {t.adminCRM.requestCorrection}
                </Button>
                <Button
                  type="submit"
                  className="h-auto min-h-14 w-full rounded-xl px-4 py-4 text-center whitespace-normal leading-tight"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                  {t.adminCRM.saveChanges}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>
              {t.adminCRM.documentsTitle}{" "}
              {selectedStudent ? getStudentDisplayName(selectedStudent.profile, selectedStudent.email) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 pt-4">
            {isDocsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : studentDocs.length === 0 ? (
              <p className="py-10 text-center italic text-muted-foreground">{t.adminCRM.noDocuments}</p>
            ) : (
              <div className="grid gap-6">
                {studentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="space-y-4 rounded-[2rem] border border-border/40 bg-secondary/5 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                          <FileText size={18} className="text-primary" />
                        </div>
                        <div>
                          <Input
                            value={doc.title}
                            onChange={(event) => {
                              setStudentDocs(
                                studentDocs.map((item) =>
                                  item.id === doc.id ? { ...item, title: event.target.value } : item,
                                ),
                              );
                            }}
                            onBlur={(event) => updateDoc(doc.id, { title: event.target.value })}
                            className="h-8 w-64 border-none bg-transparent p-0 font-bold focus-visible:ring-0"
                          />
                          <button
                            onClick={() => getFileUrl(doc.file_path)}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                          >
                            {t.adminCRM.viewFile} <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={doc.status === "approved" ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full text-[10px] font-bold uppercase tracking-widest",
                            doc.status === "approved"
                              ? "bg-success hover:bg-success/90"
                              : "border-success/20 text-success",
                          )}
                          onClick={() => updateDoc(doc.id, { status: "approved" })}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> {t.adminCRM.approve}
                        </Button>
                        <Button
                          variant={doc.status === "rejected" ? "destructive" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full text-[10px] font-bold uppercase tracking-widest",
                            doc.status === "rejected" ? "" : "border-destructive/20 text-destructive",
                          )}
                          onClick={() => updateDoc(doc.id, { status: "rejected" })}
                        >
                          <XCircle size={14} className="mr-1" /> {t.adminCRM.reject}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/20 pt-2">
                      <div className="flex items-start gap-3">
                        <MessageSquare size={14} className="mt-1 text-muted-foreground" />
                        <Textarea
                          placeholder={t.adminCRM.feedbackPlaceholder}
                          value={doc.admin_feedback || ""}
                          onChange={(event) => {
                            setStudentDocs(
                              studentDocs.map((item) =>
                                item.id === doc.id
                                  ? { ...item, admin_feedback: event.target.value }
                                  : item,
                              ),
                            );
                          }}
                          onBlur={(event) => updateDoc(doc.id, { admin_feedback: event.target.value })}
                          className="min-h-[60px] resize-none rounded-xl bg-white/50 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCRM;
