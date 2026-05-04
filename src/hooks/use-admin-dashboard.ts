import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { getAdminSession } from "@/lib/admin-session";
import { defaultAdminDashboardStats, AdminDashboardStats } from "@/lib/admin-dashboard";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("AdminDashboard");

export function useAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats>(defaultAdminDashboardStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setIsLoading(true);

      try {
        const session = await getAdminSession();
        if (!session) {
          navigate("/login?redirect=/admin", { replace: true });
          return;
        }

        const [
          activeStudentsResult,
          publishedPostsResult,
          totalLeadsResult,
          paidConsultationsResult,
          pendingPaymentsResult,
          pendingDocumentsResult,
        ] = await Promise.all([
          supabase.from("student_applications").select("*", { count: "exact", head: true }),
          supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("leads").select("*", { count: "exact", head: true }),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("payment_status", "paid"),
          supabase.from("payment_transactions").select("*", { count: "exact", head: true }).in("local_status", ["initialized", "pending"]),
          supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        const firstError =
          activeStudentsResult.error ||
          publishedPostsResult.error ||
          totalLeadsResult.error ||
          paidConsultationsResult.error ||
          pendingPaymentsResult.error ||
          pendingDocumentsResult.error;

        if (firstError) {
          throw firstError;
        }

        if (!isActive) {
          return;
        }

        setStats({
          activeStudents: activeStudentsResult.count || 0,
          publishedPosts: publishedPostsResult.count || 0,
          totalLeads: totalLeadsResult.count || 0,
          paidConsultations: paidConsultationsResult.count || 0,
          pendingPayments: pendingPaymentsResult.count || 0,
          pendingDocuments: pendingDocumentsResult.count || 0,
        });
        logger.info("Admin dashboard metrics loaded");
      } catch (error: unknown) {
        logger.error("Failed to load admin dashboard metrics", {
          message: getErrorMessage(error),
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  return {
    stats,
    isLoading,
    handleSignOut,
  };
}
