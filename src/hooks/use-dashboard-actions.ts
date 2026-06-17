import { useCallback, useState } from "react";
import { User as SupabaseUser, type SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { DashboardText, StudentDocument, StudentProfile } from "@/lib/dashboard";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useDashboardActions");
const untypedSupabase = supabase as unknown as SupabaseClient;

interface UseDashboardActionsOptions {
  buildLockedProfilePayload: () => Record<string, unknown> | null;
  completionRedirectTarget: string | null;
  dashboardText: DashboardText;
  docTitle: string;
  fetchData: (currentUser: Pick<SupabaseUser, "id" | "email">) => Promise<void>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  profileIsLocked: boolean;
  selectedDocumentRequestId: string | null;
  selectedReplacementDocumentId: string | null;
  selectedReplacementDocumentPath: string | null;
  setDocTitle: (value: string) => void;
  setIsConfirmDialogOpen: (value: boolean) => void;
  setIsUploadOpen: (value: boolean) => void;
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  user: SupabaseUser | null;
}

export const useDashboardActions = ({
  buildLockedProfilePayload,
  completionRedirectTarget,
  dashboardText,
  docTitle,
  fetchData,
  navigate,
  profileIsLocked,
  selectedDocumentRequestId,
  selectedReplacementDocumentId,
  selectedReplacementDocumentPath,
  setDocTitle,
  setIsConfirmDialogOpen,
  setIsUploadOpen,
  toast,
  user,
}: UseDashboardActionsOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File | null) => {
      const normalizedDocTitle = docTitle.trim();

      if (!file || !user || !normalizedDocTitle) {
        return;
      }

      setIsUploading(true);
      logger.info("Starting document upload", {
        userId: user.id,
        fileName: file.name,
        hasTitle: Boolean(docTitle.trim()),
      });

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = fileExt ? `${crypto.randomUUID()}.${fileExt}` : crypto.randomUUID();
        const filePath = `${user.id}/${fileName}`;

        logger.info("Uploading document to storage", { userId: user.id, filePath });
        const { error: uploadError } = await supabase.storage
          .from("student-documents")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        logger.info("Document uploaded to storage, syncing database record", { userId: user.id });
        let documentId: string | null = null;

        if (selectedReplacementDocumentId) {
          const { data: replacementData, error: replacementError } = await supabase
            .from("student_documents")
            .update({
              title: normalizedDocTitle,
              file_path: filePath,
              file_type: file.type,
              status: "pending",
              admin_feedback: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedReplacementDocumentId)
            .eq("student_id", user.id)
            .eq("status", "rejected")
            .select("id")
            .single();

          if (replacementError) {
            throw replacementError;
          }

          documentId = replacementData.id;

          if (selectedReplacementDocumentPath && selectedReplacementDocumentPath !== filePath) {
            const { error: removeError } = await supabase.storage
              .from("student-documents")
              .remove([selectedReplacementDocumentPath]);

            if (removeError) {
              logger.warn("Failed to remove replaced document file from storage", {
                userId: user.id,
                filePath: selectedReplacementDocumentPath,
                message: removeError.message,
              });
            }
          }
        } else {
          const { data: documentData, error: dbError } = await supabase
            .from("student_documents")
            .insert([
              {
                student_id: user.id,
                title: normalizedDocTitle,
                file_path: filePath,
                file_type: file.type,
                status: "pending",
              },
            ])
            .select("id")
            .single();

          if (dbError) {
            throw dbError;
          }

          documentId = documentData.id;
        }

        if (selectedDocumentRequestId && documentId) {
          const { error: requestError } = await untypedSupabase
            .from("student_document_requests")
            .update({
              status: "fulfilled",
              fulfilled_document_id: documentId,
              fulfilled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedDocumentRequestId)
            .eq("student_id", user.id);

          if (requestError) {
            throw requestError;
          }
        }

        logger.info("Document record created", { userId: user.id, filePath });
        toast({ title: dashboardText.uploadSuccess });
        setDocTitle("");
        setIsUploadOpen(false);
        await fetchData(user);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : dashboardText.uploadError;
        logger.error("Document upload failed", {
          userId: user.id,
          message,
        });
        toast({ title: dashboardText.uploadError, description: message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    },
    [
      dashboardText.uploadError,
      dashboardText.uploadSuccess,
      docTitle,
      fetchData,
      selectedDocumentRequestId,
      selectedReplacementDocumentId,
      selectedReplacementDocumentPath,
      setDocTitle,
      setIsUploadOpen,
      toast,
      user,
    ],
  );

  const requestProfileValidation = useCallback(() => {
    if (!user) {
      return;
    }

    if (profileIsLocked) {
      toast({
        title: dashboardText.profileLockedTitle,
        description: dashboardText.profileLockedDescription,
        variant: "destructive",
      });
      return;
    }

    if (!buildLockedProfilePayload()) {
      toast({
        title: dashboardText.completeProfileTitle,
        description: dashboardText.requiredForProcedure,
        variant: "destructive",
      });
      return;
    }

    setIsConfirmDialogOpen(true);
  }, [
    buildLockedProfilePayload,
    dashboardText.completeProfileTitle,
    dashboardText.profileLockedDescription,
    dashboardText.profileLockedTitle,
    dashboardText.requiredForProcedure,
    profileIsLocked,
    setIsConfirmDialogOpen,
    toast,
    user,
  ]);

  const confirmProfileValidation = useCallback(async () => {
    if (!user || profileIsLocked) {
      return;
    }

    const profilePayload = buildLockedProfilePayload();
    if (!profilePayload) {
      toast({
        title: dashboardText.completeProfileTitle,
        description: dashboardText.requiredForProcedure,
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    logger.info("Validating and locking dashboard profile", { userId: user.id });

    try {
      const { error } = await supabase.from("student_profiles").upsert(profilePayload, { onConflict: "id" });

      if (error) {
        throw error;
      }

      logger.info("Dashboard profile locked", { userId: user.id });
      toast({
        title: dashboardText.profileLockedSuccessTitle,
        description: dashboardText.profileLockedSuccessDescription,
      });
      setIsConfirmDialogOpen(false);
      await fetchData(user);

      if (completionRedirectTarget) {
        navigate(completionRedirectTarget, { replace: true });
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Dashboard profile update failed", { userId: user.id, message });
      toast({ title: dashboardText.errorTitle, description: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    buildLockedProfilePayload,
    completionRedirectTarget,
    dashboardText.completeProfileTitle,
    dashboardText.errorTitle,
    dashboardText.profileLockedSuccessDescription,
    dashboardText.profileLockedSuccessTitle,
    dashboardText.requiredForProcedure,
    fetchData,
    navigate,
    profileIsLocked,
    setIsConfirmDialogOpen,
    toast,
    user,
  ]);

  const handleSignOut = useCallback(async () => {
    logger.info("Signing out from dashboard", { userId: user?.id });
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate, user?.id]);

  const navigateToProcedureStart = useCallback(() => {
    logger.info("Redirecting student to the procedure submission page");
    navigate("/start-procedure");
  }, [navigate]);

  return {
    actions: {
      confirmProfileValidation,
      handleFileUpload,
      handleSignOut,
      navigateToProcedureStart,
      requestProfileValidation,
    },
    isSavingProfile,
    isUploading,
  };
};
