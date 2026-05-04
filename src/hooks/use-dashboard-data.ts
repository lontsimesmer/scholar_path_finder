import { useCallback, useEffect, useRef, useState } from "react";
import { User as SupabaseUser, type SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  Application,
  StudentDocument,
  StudentDocumentRequest,
  StudentProfile,
  createStudentProfileFormData,
} from "@/lib/dashboard";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { ProcedureLeadSummary } from "@/lib/procedure-lead";
import { ensureStudentProfile } from "@/lib/student-profile";

const logger = createLogger("useDashboardData");
const untypedSupabase = supabase as unknown as SupabaseClient;

interface UseDashboardDataOptions {
  navigate: (to: string, options?: { replace?: boolean }) => void;
  onLoadError: (message: string) => void;
}

export const useDashboardData = ({ navigate, onLoadError }: UseDashboardDataOptions) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [documentRequests, setDocumentRequests] = useState<StudentDocumentRequest[]>([]);
  const [procedureLead, setProcedureLead] = useState<ProcedureLeadSummary | null>(null);
  const [formData, setFormData] = useState<StudentProfile>(createStudentProfileFormData());
  const latestDashboardLoadRef = useRef<string | null>(null);

  const fetchData = useCallback(async (currentUser: Pick<SupabaseUser, "id" | "email">) => {
    latestDashboardLoadRef.current = currentUser.id;
    setIsLoading(true);
    logger.info("Fetching dashboard data", { userId: currentUser.id });

    try {
      const profileData = await ensureStudentProfile(currentUser);
      if (latestDashboardLoadRef.current !== currentUser.id) {
        return;
      }

      if (profileData) {
        setProfile(profileData);
        setFormData(createStudentProfileFormData(profileData));
      }

      const { data: procedureData, error: procedureError } = await supabase.functions.invoke(
        "get-student-procedure-status",
        { body: {} },
      );

      if (latestDashboardLoadRef.current !== currentUser.id) {
        return;
      }

      if (procedureError) {
        logger.error("Procedure lead summary fetch failed", {
          userId: currentUser.id,
          message: procedureError.message,
        });
        setProcedureLead(null);
      } else {
        setProcedureLead((procedureData?.lead as ProcedureLeadSummary | null) ?? null);
      }

      const { data: appData, error: appError } = await supabase
        .from("student_applications")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDashboardLoadRef.current !== currentUser.id) {
        return;
      }

      if (appError) {
        logger.error("Application fetch failed", {
          userId: currentUser.id,
          message: appError.message,
        });
      }
      setApplication((appData as Application | null) ?? null);

      const { data: docsData, error: docsError } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (latestDashboardLoadRef.current !== currentUser.id) {
        return;
      }

      if (docsError) {
        logger.error("Documents fetch failed", {
          userId: currentUser.id,
          message: docsError.message,
        });
      }
      setDocuments((docsData as StudentDocument[]) ?? []);

      const { data: requestsData, error: requestsError } = await untypedSupabase
        .from("student_document_requests")
        .select("id, title, description, status, created_at, fulfilled_document_id")
        .eq("student_id", currentUser.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (latestDashboardLoadRef.current !== currentUser.id) {
        return;
      }

      if (requestsError) {
        logger.error("Document requests fetch failed", {
          userId: currentUser.id,
          message: requestsError.message,
        });
      }
      setDocumentRequests((requestsData as StudentDocumentRequest[] | null) ?? []);

      logger.info("Dashboard data loaded", {
        userId: currentUser.id,
        hasProfile: Boolean(profileData),
        hasApplication: Boolean(appData),
        documentCount: docsData?.length ?? 0,
        documentRequestCount: requestsData?.length ?? 0,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error("Unexpected dashboard fetch error", {
        userId: currentUser.id,
        message,
      });
      onLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadError]);

  useEffect(() => {
    let isActive = true;

    const checkAuth = async () => {
      logger.info("Checking dashboard auth session");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (!session) {
        logger.warn("Dashboard access requires authentication");
        navigate("/login?redirect=/dashboard", { replace: true });
        return;
      }

      logger.info("Dashboard session validated", { userId: session.user.id });
      setUser(session.user);
      await fetchData(session.user);
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info("Dashboard auth state changed", { event, hasSession: Boolean(session) });

      if (!isActive || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      if (!session) {
        navigate("/login?redirect=/dashboard", { replace: true });
        return;
      }

      setUser(session.user);
      void fetchData(session.user);
    });

    return () => {
      isActive = false;
      latestDashboardLoadRef.current = null;
      subscription.unsubscribe();
    };
  }, [fetchData, navigate]);

  return {
    application,
    documents,
    documentRequests,
    fetchData,
    formData,
    isLoading,
    procedureLead,
    profile,
    setDocuments,
    setFormData,
    setUser,
    user,
  };
};
