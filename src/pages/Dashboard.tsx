import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  CreditCard,
  FileText, 
  Upload, 
  User as UserIcon, 
  Globe, 
  GraduationCap, 
  CalendarDays,
  Loader2,
  AlertCircle,
  LogOut,
  Plus,
  MessageSquare
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLogger, getErrorMessage } from "@/lib/logger";
import {
  buildStudentFullName,
  ensureStudentProfile,
  getStudentProfileCorrectionComment,
  getStudentDisplayName,
  getStudentProfileReviewStatus,
  hasValidatedProcedureProfile,
  hasRequiredProcedureProfile,
  isStudentProfileLocked,
  StudentProfileRecord,
} from "@/lib/student-profile";
import {
  buildProcedureCheckoutPath,
  doesProcedurePaymentRequireAction,
  isProcedurePaymentPending,
  ProcedureLeadSummary,
} from "@/lib/procedure-lead";
import { cn } from "@/lib/utils";
import { User as SupabaseUser } from "@supabase/supabase-js";

type StudentProfile = StudentProfileRecord;

interface Application {
  id: string;
  status: string;
  notes: string;
  updated_at: string;
}

interface Document {
  id: string;
  title?: string;
  name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  file_path: string;
  admin_feedback?: string;
}

const logger = createLogger("Dashboard");

const sanitizeDashboardRedirect = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  return value;
};

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const dashboardText = t.dashboard as typeof t.dashboard & {
    noActiveProcedureTitle: string;
    noActiveProcedureDescription: string;
    noActiveProcedureHelper: string;
    startProcedure: string;
    procedureStatusTitle: string;
    paymentRequiredTitle: string;
    paymentRequiredDescription: string;
    paymentPendingTitle: string;
    paymentPendingDescription: string;
    paymentConfirmedTitle: string;
    paymentConfirmedDescription: string;
    proceedToPayment: string;
    completeProfileForPayment: string;
    paymentAvailableAfterProfile: string;
    procedureStartedBadge: string;
    noActiveProcedureBadge: string;
    paymentPendingBadge: string;
    paymentRequiredBadge: string;
  };
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [procedureLead, setProcedureLead] = useState<ProcedureLeadSummary | null>(null);
  const redirectAfterCompletion = sanitizeDashboardRedirect(searchParams.get("redirect"));

  // Form State for Profile
  const [formData, setFormData] = useState<StudentProfile>({
    id: "",
    email: "",
    phone_number: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    profile_locked_at: null,
    profile_validation_comment: null,
    profile_invalidated_at: null,
    full_name: "",
    current_degree: "",
    target_country: "",
    target_program: "",
  });

  const updateFormField = useCallback(
    (field: keyof StudentProfile, value: string) => {
      setFormData((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const fetchData = useCallback(async (currentUser: Pick<SupabaseUser, "id" | "email">) => {
    setIsLoading(true);
    logger.info("Fetching dashboard data", { userId: currentUser.id });
    try {
      const profileData = await ensureStudentProfile(currentUser);
      if (profileData) {
        setProfile(profileData);
        setFormData({
          id: profileData.id,
          email: profileData.email,
          phone_number: profileData.phone_number || "",
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          birth_date: profileData.birth_date || "",
          profile_locked_at: profileData.profile_locked_at,
          profile_validation_comment: profileData.profile_validation_comment,
          profile_invalidated_at: profileData.profile_invalidated_at,
          full_name: profileData.full_name || "",
          current_degree: profileData.current_degree || "",
          target_country: profileData.target_country || "",
          target_program: profileData.target_program || "",
        });
      }

      const { data: procedureData, error: procedureError } = await supabase.functions.invoke(
        "get-student-procedure-status",
        {
          body: {},
        },
      );

      if (procedureError) {
        logger.error("Procedure lead summary fetch failed", {
          userId: currentUser.id,
          message: procedureError.message,
        });
        setProcedureLead(null);
      } else {
        setProcedureLead((procedureData?.lead as ProcedureLeadSummary | null) ?? null);
      }

      // 2. Fetch Application
      const { data: appData, error: appError } = await supabase
        .from("student_applications")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (appError) {
        logger.error("Application fetch failed", {
          userId: currentUser.id,
          message: appError.message,
        });
      }
      setApplication((appData as Application | null) ?? null);

      // 3. Fetch Documents
      const { data: docsData, error: docsError } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("created_at", { ascending: false });
      
      if (docsError) {
        logger.error("Documents fetch failed", {
          userId: currentUser.id,
          message: docsError.message,
        });
      }
      setDocuments((docsData as Document[]) ?? []);

      logger.info("Dashboard data loaded", {
        userId: currentUser.id,
        hasProfile: Boolean(profileData),
        hasApplication: Boolean(appData),
        documentCount: docsData?.length ?? 0,
      });

    } catch (error) {
      logger.error("Unexpected dashboard fetch error", {
        userId: currentUser.id,
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const roadmapSteps = useMemo(
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
  const formHasRequiredFields = useMemo(
    () => hasRequiredProcedureProfile(formData),
    [formData],
  );
  const profileIsLocked = useMemo(
    () => isStudentProfileLocked(profile),
    [profile],
  );
  const profileIsReadyForProcedure = useMemo(
    () => hasValidatedProcedureProfile(profile),
    [profile],
  );
  const profileReviewStatus = useMemo(
    () => getStudentProfileReviewStatus(profile),
    [profile],
  );
  const procedurePaymentStatus = useMemo(
    () => procedureLead?.paymentStatus ?? null,
    [procedureLead?.paymentStatus],
  );
  const paymentRequiresAction = useMemo(
    () => doesProcedurePaymentRequireAction(procedurePaymentStatus),
    [procedurePaymentStatus],
  );
  const paymentIsPending = useMemo(
    () => isProcedurePaymentPending(procedurePaymentStatus),
    [procedurePaymentStatus],
  );
  const paymentCheckoutPath = useMemo(() => {
    return buildProcedureCheckoutPath(procedureLead);
  }, [procedureLead]);
  const hasProcedureContext = useMemo(
    () => Boolean(application) || Boolean(procedureLead) || Boolean(redirectAfterCompletion),
    [application, procedureLead, redirectAfterCompletion],
  );
  const canResumePayment = useMemo(
    () => !application && paymentRequiresAction && Boolean(paymentCheckoutPath),
    [application, paymentCheckoutPath, paymentRequiresAction],
  );
  const hasPendingPaymentBeforeApplication = useMemo(
    () => !application && paymentIsPending,
    [application, paymentIsPending],
  );
  const completionRedirectTarget = useMemo(
    () => redirectAfterCompletion ?? (canResumePayment ? paymentCheckoutPath : null),
    [canResumePayment, paymentCheckoutPath, redirectAfterCompletion],
  );
  const profileCorrectionComment = useMemo(
    () => getStudentProfileCorrectionComment(profile),
    [profile],
  );
  const profileDisplayName = useMemo(
    () => getStudentDisplayName(profile, user?.email),
    [profile, user?.email],
  );
  const formattedBirthDate = useMemo(() => {
    if (!profile?.birth_date) {
      return t.dashboard.notSpecified;
    }

    return new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString(
      language === "fr" ? "fr-FR" : "en-US",
    );
  }, [language, profile?.birth_date, t.dashboard.notSpecified]);
  const currentStatusIndex = useMemo(() => {
    if (!application?.status) {
      return 0;
    }

    const index = roadmapSteps.indexOf(application.status);
    return index >= 0 ? index : 0;
  }, [application?.status, roadmapSteps]);
  const formattedLockedAt = useMemo(() => {
    if (!profile?.profile_locked_at) {
      return t.dashboard.notSpecified;
    }

    return new Date(profile.profile_locked_at).toLocaleString(
      language === "fr" ? "fr-FR" : "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    );
  }, [language, profile?.profile_locked_at, t.dashboard.notSpecified]);

  useEffect(() => {
    const checkAuth = async () => {
      logger.info("Checking dashboard auth session");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.warn("Dashboard access requires authentication");
        navigate("/login?redirect=/dashboard");
        return;
      }
      logger.info("Dashboard session validated", { userId: session.user.id });
      setUser(session.user);
      await fetchData(session.user);
    };

    checkAuth();
  }, [navigate, fetchData]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !docTitle) return;

    setIsUploading(true);
    logger.info("Starting document upload", {
      userId: user.id,
      fileName: file.name,
      hasTitle: Boolean(docTitle.trim()),
    });
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      logger.info("Uploading document to storage", { userId: user.id, filePath });
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      logger.info("Document uploaded to storage, creating database record", { userId: user.id });
      const { error: dbError } = await supabase
        .from('student_documents')
        .insert([{
          student_id: user.id,
          title: docTitle,
          file_path: filePath,
          file_type: file.type,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      logger.info("Document record created", { userId: user.id, filePath });
      toast({ title: t.dashboard.uploadSuccess });
      setDocTitle("");
      setIsUploadOpen(false);
      await fetchData(user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.dashboard.uploadError;
      logger.error("Document upload failed", {
        userId: user.id,
        message,
      });
      toast({ title: t.dashboard.uploadError, description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const buildLockedProfilePayload = useCallback(() => {
    if (!user) {
      return null;
    }

    const firstName = formData.first_name?.trim() || "";
    const lastName = formData.last_name?.trim() || "";
    const birthDate = formData.birth_date?.trim() || "";

    if (!firstName || !lastName || !birthDate) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      profile_locked_at: new Date().toISOString(),
      profile_validation_comment: null,
      profile_invalidated_at: null,
      full_name: buildStudentFullName(firstName, lastName),
      current_degree: formData.current_degree?.trim() || null,
      target_country: formData.target_country?.trim() || null,
      target_program: formData.target_program?.trim() || null,
      updated_at: new Date().toISOString(),
    };
  }, [formData, user]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (profileIsLocked) {
      toast({
        title: t.dashboard.profileLockedTitle,
        description: t.dashboard.profileLockedDescription,
        variant: "destructive",
      });
      return;
    }

    if (!buildLockedProfilePayload()) {
      toast({
        title: t.dashboard.completeProfileTitle,
        description: t.dashboard.requiredForProcedure,
        variant: "destructive",
      });
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  const confirmProfileValidation = async () => {
    if (!user || profileIsLocked) {
      return;
    }

    const profilePayload = buildLockedProfilePayload();
    if (!profilePayload) {
      toast({
        title: t.dashboard.completeProfileTitle,
        description: t.dashboard.requiredForProcedure,
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    logger.info("Validating and locking dashboard profile", { userId: user.id });

    try {
      const { error } = await supabase
        .from("student_profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (error) throw error;

      logger.info("Dashboard profile locked", { userId: user.id });
      toast({
        title: t.dashboard.profileLockedSuccessTitle,
        description: t.dashboard.profileLockedSuccessDescription,
      });
      setIsConfirmDialogOpen(false);
      await fetchData(user);

      if (completionRedirectTarget) {
        navigate(completionRedirectTarget, { replace: true });
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Dashboard profile update failed", { userId: user.id, message });
      toast({ title: t.dashboard.errorTitle, description: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    logger.info("Signing out from dashboard", { userId: user?.id });
    await supabase.auth.signOut();
    navigate("/");
  };

  const navigateToProcedureStart = () => {
    logger.info("Redirecting student to the procedure submission page");
    navigate("/start-procedure");
  };

  const navigateToPayment = () => {
    if (!paymentCheckoutPath) {
      return;
    }

    logger.info("Redirecting student to checkout from the dashboard", {
      leadId: procedureLead?.leadId ?? null,
    });
    navigate(paymentCheckoutPath);
  };

  const renderProfileFields = () => (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t.dashboard.firstName}
          </label>
          <Input
            value={formData.first_name || ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateFormField("first_name", event.target.value)
            }
            placeholder={t.dashboard.firstNamePlaceholder}
            className="h-12 rounded-xl"
            autoComplete="given-name"
            disabled={isSavingProfile || profileIsLocked}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t.dashboard.lastName}
          </label>
          <Input
            value={formData.last_name || ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateFormField("last_name", event.target.value)
            }
            placeholder={t.dashboard.lastNamePlaceholder}
            className="h-12 rounded-xl"
            autoComplete="family-name"
            disabled={isSavingProfile || profileIsLocked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t.dashboard.birthDate}
        </label>
        <Input
          type="date"
          value={formData.birth_date || ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateFormField("birth_date", event.target.value)
          }
          className="h-12 rounded-xl"
          max={new Date().toISOString().split("T")[0]}
          disabled={isSavingProfile || profileIsLocked}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t.dashboard.targetCountry}
        </label>
        <Input
          value={formData.target_country || ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateFormField("target_country", event.target.value)
          }
          placeholder={t.dashboard.targetCountryPlaceholder}
          className="h-12 rounded-xl"
          disabled={isSavingProfile || profileIsLocked}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t.dashboard.targetProgram}
        </label>
        <Input
          value={formData.target_program || ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateFormField("target_program", event.target.value)
          }
          placeholder={t.dashboard.targetProgramPlaceholder}
          className="h-12 rounded-xl"
          disabled={isSavingProfile || profileIsLocked}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t.dashboard.currentDegree}
        </label>
        <Input
          value={formData.current_degree || ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateFormField("current_degree", event.target.value)
          }
          placeholder={t.dashboard.currentDegreePlaceholder}
          className="h-12 rounded-xl"
          disabled={isSavingProfile || profileIsLocked}
        />
      </div>
    </>
  );

  const renderProcedureOverviewCard = () => {
    if (!procedureLead && !application) {
      return (
        <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-border/40 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Globe size={20} />
                </div>
                <CardTitle className="font-display text-xl">{dashboardText.procedureStatusTitle}</CardTitle>
              </div>
              <div className="rounded-full border border-border/50 bg-secondary/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {dashboardText.noActiveProcedureBadge}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="rounded-[1.6rem] border border-border/50 bg-secondary/25 p-6">
              <p className="text-lg font-semibold text-foreground">{dashboardText.noActiveProcedureTitle}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {dashboardText.noActiveProcedureDescription}
              </p>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{dashboardText.noActiveProcedureHelper}</p>
            <Button onClick={navigateToProcedureStart} className="rounded-xl">
              {dashboardText.startProcedure}
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (canResumePayment && procedureLead) {
      return (
        <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-border/40 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard size={20} />
                </div>
                <CardTitle className="font-display text-xl">{dashboardText.procedureStatusTitle}</CardTitle>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                {dashboardText.paymentRequiredBadge}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="rounded-[1.6rem] border border-primary/10 bg-primary/5 p-6">
              <p className="text-lg font-semibold text-foreground">{dashboardText.paymentRequiredTitle}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {dashboardText.paymentRequiredDescription}
              </p>
            </div>
            <Button onClick={navigateToPayment} className="rounded-xl">
              {dashboardText.proceedToPayment}
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (hasPendingPaymentBeforeApplication && procedureLead) {
      return (
        <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-border/40 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock size={20} />
                </div>
                <CardTitle className="font-display text-xl">{dashboardText.procedureStatusTitle}</CardTitle>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                {dashboardText.paymentPendingBadge}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-6">
              <p className="text-lg font-semibold text-foreground">{dashboardText.paymentPendingTitle}</p>
              <p className="mt-3 text-sm leading-7 text-amber-900">
                {dashboardText.paymentPendingDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (procedureLead && !application) {
      return (
        <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-border/40 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle2 size={20} />
                </div>
                <CardTitle className="font-display text-xl">{dashboardText.procedureStatusTitle}</CardTitle>
              </div>
              <div className="rounded-full border border-success/20 bg-success/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                {dashboardText.procedureStartedBadge}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="rounded-[1.6rem] border border-success/15 bg-success/5 p-6">
              <p className="text-lg font-semibold text-foreground">{dashboardText.paymentConfirmedTitle}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {dashboardText.paymentConfirmedDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20">
          <div className="section-container space-y-8">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-8 lg:grid-cols-3">
              <Skeleton className="h-[400px] lg:col-span-2 rounded-3xl" />
              <Skeleton className="h-[400px] rounded-3xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (hasProcedureContext && !profileIsReadyForProcedure) {
    return (
      <div className="min-h-screen bg-secondary/5">
        <Header />

        <main className="pt-32 pb-20">
          <div className="section-container max-w-4xl space-y-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  <AlertCircle size={14} />
                  {t.dashboard.requiredForProcedure}
                </span>
                <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                  {t.dashboard.welcome} <span className="text-primary">{profileDisplayName}</span>
                </h1>
                <p className="max-w-2xl text-muted-foreground">{t.dashboard.completeProfileDescription}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 self-start text-muted-foreground hover:text-destructive"
              >
                <LogOut size={16} />
                {t.checkout.signOut}
              </Button>
            </div>

            <Card className="overflow-hidden rounded-[2.5rem] border-border/40 shadow-soft">
              <CardHeader className="border-b border-border/40 bg-white p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserIcon size={22} />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="font-display text-2xl">
                      {t.dashboard.completeProfileTitle}
                    </CardTitle>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                      {t.dashboard.completeProfileHelper}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-8 p-8">
                <div className="rounded-[1.6rem] border border-primary/10 bg-primary/5 p-5">
                  <p className="text-xs leading-7 text-foreground/80">
                    {profileReviewStatus === "correction_requested"
                      ? t.dashboard.correctionRequestedPrompt
                      : formHasRequiredFields
                      ? t.dashboard.confirmProfilePrompt
                      : completionRedirectTarget
                       ? t.dashboard.completeBeforeContinuing
                       : t.dashboard.requiredForProcedure}
                  </p>
                </div>

                {profileReviewStatus === "correction_requested" && profileCorrectionComment ? (
                  <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                      {t.dashboard.correctionRequestedTitle}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-amber-900">
                      {profileCorrectionComment}
                    </p>
                  </div>
                ) : null}

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {renderProfileFields()}
                  <Button type="submit" className="w-full rounded-xl py-6" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="mr-2 animate-spin" /> : null}
                    {completionRedirectTarget
                      ? t.dashboard.validateAndContinue
                      : t.dashboard.validateProfile}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogContent className="rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle>{t.dashboard.confirmValidationTitle}</AlertDialogTitle>
              <AlertDialogDescription className="leading-7">
                {t.dashboard.confirmValidationDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              {t.dashboard.confirmValidationWarning}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSavingProfile}>
                {t.dashboard.confirmValidationCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSavingProfile}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmProfileValidation();
                }}
              >
                {isSavingProfile
                  ? t.dashboard.validationInProgress
                  : completionRedirectTarget
                   ? t.dashboard.validateAndContinue
                   : t.dashboard.confirmValidationAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/5">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="section-container space-y-10">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {t.dashboard.welcome} <span className="text-primary">{profileDisplayName}</span>
              </h1>
              <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive gap-2">
              <LogOut size={16} />
              {t.checkout.signOut}
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.4fr]">
            
            {/* Left Column: Roadmap & Documents */}
            <div className="space-y-8">
              
              {/* Application Roadmap */}
              {application ? (
                <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-white border-b border-border/40 p-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Globe size={20} />
                      </div>
                      <CardTitle className="font-display text-xl">{t.dashboard.roadmapTitle}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 lg:p-12 space-y-8">
                    {application.notes && (
                      <div className="rounded-[1.5rem] border border-primary/10 bg-primary/5 p-6 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-700">
                        <MessageSquare className="h-6 w-6 text-primary shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                            {t.dashboard.advisorNoteLabel}
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                            {application.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {roadmapSteps.map((step, index) => {
                          const isCompleted = index < currentStatusIndex;
                          const isCurrent = index === currentStatusIndex;
                          const statusLabel = (t.dashboard.status as Record<string, string>)[step] || step;

                          return (
                            <div
                              key={step}
                              className={cn(
                                "relative p-5 rounded-2xl border transition-all duration-500",
                                isCompleted
                                  ? "bg-success/5 border-success/20"
                                  : isCurrent
                                    ? "bg-primary/5 border-primary/30 shadow-medium"
                                    : "bg-white border-border/40 opacity-50",
                              )}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                  {t.dashboard.stepLabel} 0{index + 1}
                                </span>
                                {isCompleted ? (
                                  <CheckCircle2 size={16} className="text-success" />
                                ) : isCurrent ? (
                                  <Clock size={16} className="text-primary animate-pulse" />
                                ) : null}
                              </div>
                              <p
                                className={cn(
                                  "text-xs font-bold leading-tight",
                                  isCurrent ? "text-primary" : "text-foreground/70",
                                )}
                              >
                                {statusLabel}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                renderProcedureOverviewCard()
              )}

              {/* Document Vault */}
              <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white border-b border-border/40 px-8 py-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText size={20} />
                    </div>
                    <CardTitle className="font-display text-xl">{t.dashboard.documentsTitle}</CardTitle>
                  </div>
                  
                  <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl">
                        <Upload size={16} className="mr-2" />
                        {t.dashboard.uploadDoc}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle>{t.dashboard.uploadDoc}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.dashboard.docTitle}</label>
                          <Input 
                            value={docTitle} 
                            onChange={e => setDocTitle(e.target.value)} 
                            placeholder={t.dashboard.docTitlePlaceholder}
                            className="rounded-xl h-12"
                          />
                        </div>
                        
                        <div className="relative">
                          <input 
                            type="file" 
                            id="doc-file" 
                            className="hidden" 
                            onChange={handleFileUpload}
                            disabled={isUploading || !docTitle}
                          />
                          <Button asChild className="w-full rounded-xl py-6 cursor-pointer" disabled={isUploading || !docTitle}>
                            <label htmlFor="doc-file">
                              {isUploading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                              {t.dashboard.selectFile}
                            </label>
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-8 lg:p-10 pt-0">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-3xl mt-8">
                      <FileText size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground italic text-sm">{t.dashboard.noDocs}</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {documents.map((doc) => {
                        const displayName = doc.title || doc.name || t.dashboard.untitledDocument;
                        return (
                          <div key={doc.id} className="p-6 rounded-[2rem] border border-border/40 bg-white hover:border-primary/20 hover:shadow-medium transition-all space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                  <FileText size={22} />
                                </div>
                                <div>
                                  <p className="text-base font-bold text-foreground tracking-tight">{displayName}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">{new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                doc.status === 'approved' ? "bg-success/5 border-success/20 text-success" :
                                doc.status === 'rejected' ? "bg-destructive/5 border-destructive/20 text-destructive" :
                                "bg-amber-50 border-amber-200 text-amber-600"
                              )}>
                                {(t.dashboard.docStatus as Record<string, string>)[doc.status] || doc.status}
                              </div>
                            </div>

                            {doc.admin_feedback && (
                              <div className={cn(
                                "mt-2 p-4 rounded-2xl text-xs flex gap-3 items-start border",
                                doc.status === 'rejected' ? "bg-destructive/5 border-destructive/10 text-destructive" : "bg-primary/5 border-primary/10 text-primary"
                              )}>
                                <MessageSquare size={16} className="shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-[9px] uppercase font-bold tracking-widest opacity-60">
                                    {t.dashboard.advisorFeedback}
                                  </p>
                                  <p className="leading-relaxed italic font-medium text-sm">{doc.admin_feedback}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Profile Summary */}
            <div className="space-y-8">
              <Card className="border-border/40 shadow-soft rounded-[2.5rem] overflow-hidden sticky top-32">
                <CardHeader className="bg-white border-b border-border/40 p-8 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <UserIcon size={20} />
                    </div>
                    <CardTitle className="font-display text-xl">{t.dashboard.profileTitle}</CardTitle>
                  </div>

                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
                      profileIsReadyForProcedure
                        ? "border-success/20 bg-success/5 text-success"
                        : "border-border/50 bg-secondary/35 text-muted-foreground",
                    )}
                  >
                    {profileIsReadyForProcedure
                      ? t.dashboard.profileLockedBadge
                      : t.dashboard.requiredForProcedure}
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {profileIsReadyForProcedure ? (
                    <>
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                              {t.dashboard.firstName}
                            </label>
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <UserIcon size={14} className="text-primary/60" />
                              {profile?.first_name || t.dashboard.notSpecified}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                              {t.dashboard.lastName}
                            </label>
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <UserIcon size={14} className="text-primary/60" />
                              {profile?.last_name || t.dashboard.notSpecified}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t.dashboard.birthDate}
                          </label>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <CalendarDays size={14} className="text-primary/60" />
                            {formattedBirthDate}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t.dashboard.profileLockedAt}
                          </label>
                          <div className="text-sm font-semibold text-foreground">
                            {formattedLockedAt}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t.dashboard.targetCountry}
                          </label>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Globe size={14} className="text-primary/60" />
                            {profile?.target_country || t.dashboard.notSpecified}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t.dashboard.targetProgram}
                          </label>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <GraduationCap size={14} className="text-primary/60" />
                            {profile?.target_program || t.dashboard.notSpecified}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t.dashboard.currentDegree}
                          </label>
                          <div className="text-sm font-semibold text-foreground">
                            {profile?.current_degree || t.dashboard.notSpecified}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/40 space-y-4">
                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
                          <AlertCircle size={18} className="text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            {t.dashboard.profileLockedDescription}
                          </p>
                        </div>

                        {!procedureLead && !application ? (
                          <Button onClick={navigateToProcedureStart} className="w-full rounded-xl" variant="outline">
                            {dashboardText.startProcedure}
                          </Button>
                        ) : canResumePayment ? (
                          <Button onClick={navigateToPayment} className="w-full rounded-xl">
                            {dashboardText.proceedToPayment}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      <div className="rounded-[1.4rem] border border-border/50 bg-secondary/20 p-4">
                        <p className="text-sm leading-7 text-muted-foreground">
                          {!procedureLead && !application
                            ? dashboardText.noActiveProcedureHelper
                            : t.dashboard.completeProfileHelper}
                        </p>
                      </div>
                      {renderProfileFields()}
                      <Button type="submit" className="w-full rounded-xl py-6" disabled={isSavingProfile}>
                        {isSavingProfile ? <Loader2 className="mr-2 animate-spin" /> : null}
                        {canResumePayment ? t.dashboard.validateAndContinue : t.dashboard.validateProfile}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
