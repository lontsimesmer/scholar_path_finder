import { LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { DashboardApplicationRoadmapCard } from "@/components/dashboard/DashboardApplicationRoadmapCard";
import { DashboardCompletionGate } from "@/components/dashboard/DashboardCompletionGate";
import { DashboardDocumentsCard } from "@/components/dashboard/DashboardDocumentsCard";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardProcedureOverviewCard } from "@/components/dashboard/DashboardProcedureOverviewCard";
import { DashboardProfileCard } from "@/components/dashboard/DashboardProfileCard";
import { DashboardProfileValidationDialog } from "@/components/dashboard/DashboardProfileValidationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { DashboardText, sanitizeDashboardRedirect } from "@/lib/dashboard";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dashboardText = t.dashboard as DashboardText;
  const redirectAfterCompletion = sanitizeDashboardRedirect(searchParams.get("redirect"));
  const {
    actions,
    setDocTitle,
    setIsConfirmDialogOpen,
    setIsUploadOpen,
    updateFormField,
    viewModel,
  } = useDashboard({
    dashboardText,
    language,
    navigate,
    redirectAfterCompletion,
    toast,
  });

  if (viewModel.isLoading) {
    return <DashboardLoadingState />;
  }

  if (viewModel.showCompletionGate) {
    return (
      <>
        <DashboardCompletionGate
          completionRedirectTarget={viewModel.completionRedirectTarget}
          formData={viewModel.formData}
          formHasRequiredFields={viewModel.formHasRequiredFields}
          isSavingProfile={viewModel.isSavingProfile}
          onFieldChange={updateFormField}
          onRequestValidation={actions.requestProfileValidation}
          onSignOut={actions.handleSignOut}
          profileCorrectionComment={viewModel.profileCorrectionComment}
          profileDisplayName={viewModel.profileDisplayName}
          profileReviewStatus={viewModel.profileReviewStatus}
          signOutLabel={t.checkout.signOut}
          text={dashboardText}
        />
        <DashboardProfileValidationDialog
          completionRedirectTarget={viewModel.completionRedirectTarget}
          isOpen={viewModel.isConfirmDialogOpen}
          isSaving={viewModel.isSavingProfile}
          onConfirm={actions.confirmProfileValidation}
          onOpenChange={setIsConfirmDialogOpen}
          text={dashboardText}
        />
      </>
    );
  }

  return (
    <div className="page-shell">
      <Header />

      <main className="relative z-10 pb-24 pt-32">
        <div className="section-container space-y-10">
          <Card className="animate-stagger-in overflow-hidden rounded-[2.5rem] border-border/30 bg-white shadow-strong">
            <CardContent className="relative overflow-hidden p-8 md:p-10">
              {/* Background atmospherics */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(25,113,194,0.05)_0%,rgba(255,255,255,0.98)_50%,rgba(40,144,90,0.03)_100%)]" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.04] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/[0.05] blur-3xl" />

              <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="space-y-3">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {dashboardText.welcome}{" "}
                    <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {viewModel.profileDisplayName}
                    </span>
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground/80">
                    {dashboardText.subtitle}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void actions.handleSignOut()}
                  className="gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut size={16} />
                  {t.checkout.signOut}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.4fr]">
            <div className="space-y-8">
              <div className="animate-card-in" style={{ animationDelay: "80ms" }}>
                {viewModel.application ? (
                  <DashboardApplicationRoadmapCard
                    application={viewModel.application}
                    currentStatusIndex={viewModel.currentStatusIndex}
                    roadmapSteps={viewModel.roadmapSteps}
                    text={dashboardText}
                  />
                ) : (
                  <DashboardProcedureOverviewCard
                    application={viewModel.application}
                    canResumePayment={viewModel.canResumePayment}
                    hasPendingPaymentBeforeApplication={viewModel.hasPendingPaymentBeforeApplication}
                    onNavigateToPayment={actions.navigateToPayment}
                    onNavigateToProcedureStart={actions.navigateToProcedureStart}
                    procedureLead={viewModel.procedureLead}
                    text={dashboardText}
                  />
                )}
              </div>

              <div className="animate-card-in" style={{ animationDelay: "180ms" }}>
                <DashboardDocumentsCard
                  docTitle={viewModel.docTitle}
                  documents={viewModel.documents}
                  documentRequests={viewModel.documentRequests}
                  isUploadOpen={viewModel.isUploadOpen}
                  isUploading={viewModel.isUploading}
                  onFileUpload={actions.handleFileUpload}
                  onOpenChange={setIsUploadOpen}
                  onReplaceDocument={actions.openDocumentReplacementUpload}
                  onRequestUpload={actions.openDocumentRequestUpload}
                  onTitleChange={setDocTitle}
                  text={dashboardText}
                />
              </div>
            </div>

            <div className="animate-card-in" style={{ animationDelay: "260ms" }}>
              <DashboardProfileCard
                applicationExists={Boolean(viewModel.application)}
                canResumePayment={viewModel.canResumePayment}
                formattedBirthDate={viewModel.formattedBirthDate}
                formattedLockedAt={viewModel.formattedLockedAt}
                formData={viewModel.formData}
                isSavingProfile={viewModel.isSavingProfile}
                onFieldChange={updateFormField}
                onNavigateToPayment={actions.navigateToPayment}
                onNavigateToProcedureStart={actions.navigateToProcedureStart}
                onSubmit={actions.requestProfileValidation}
                procedureLead={viewModel.procedureLead}
                profile={viewModel.profile}
                profileIsReadyForProcedure={viewModel.profileIsReadyForProcedure}
                text={dashboardText}
              />
            </div>
          </div>
        </div>
      </main>

      <DashboardProfileValidationDialog
        completionRedirectTarget={viewModel.completionRedirectTarget}
        isOpen={viewModel.isConfirmDialogOpen}
        isSaving={viewModel.isSavingProfile}
        onConfirm={actions.confirmProfileValidation}
        onOpenChange={setIsConfirmDialogOpen}
        text={dashboardText}
      />

      <Footer />
    </div>
  );
};

export default Dashboard;
