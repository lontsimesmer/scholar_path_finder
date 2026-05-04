import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SectionHeading from "@/components/SectionHeading";
import { ProcedureNextStepsCard } from "@/components/procedure/ProcedureNextStepsCard";
import { ProcedureProfileSummaryCard } from "@/components/procedure/ProcedureProfileSummaryCard";
import { ProcedureRequestFormCard } from "@/components/procedure/ProcedureRequestFormCard";
import { ProcedureStatusCard } from "@/components/procedure/ProcedureStatusCard";
import { Button } from "@/components/ui/button";
import { useStartProcedure } from "@/hooks/use-start-procedure";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { StartProcedureText } from "@/lib/start-procedure";

const StartProcedure = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const procedureText = t.startProcedure as StartProcedureText;
  const {
    actions,
    setters,
    state,
  } = useStartProcedure({
    language,
    navigate,
    notSpecified: t.dashboard.notSpecified,
    text: procedureText,
    toast,
  });

  return (
    <div className="min-h-screen bg-secondary/5">
      <Header />

      <main className="section-padding pt-32">
        <div className="section-container space-y-10">
          <Button
            type="button"
            variant="ghost"
            onClick={actions.handleReturnToDashboard}
            className="gap-2 rounded-xl px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {procedureText.backToDashboard}
          </Button>

          <div className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <SectionHeading
                badge={procedureText.badge}
                title={procedureText.title}
                highlight={procedureText.titleHighlight}
                subtitle={procedureText.subtitle}
                align="left"
              />

              <ProcedureProfileSummaryCard
                currentDegreeLabel={t.dashboard.currentDegree}
                emailValue={state.user?.email || t.dashboard.notSpecified}
                formattedBirthDate={state.formattedBirthDate}
                fullName={state.profileFullName}
                notSpecified={t.dashboard.notSpecified}
                profile={state.profile}
                targetCountryLabel={t.dashboard.targetCountry}
                targetProgramLabel={t.dashboard.targetProgram}
                text={{
                  ...procedureText,
                  birthDate: t.dashboard.birthDate,
                }}
              />
            </div>

            <div className="space-y-8">
              <ProcedureStatusCard
                hasActiveProcedure={state.hasActiveProcedure}
                isLoading={state.isLoading}
                paymentCheckoutPath={state.paymentCheckoutPath}
                paymentIsPending={state.paymentIsPending}
                paymentRequiresAction={state.paymentRequiresAction}
                profileReadyForProcedure={state.profileReadyForProcedure}
                onCompleteProfile={actions.handleCompleteProfile}
                onGoToPayment={actions.handleGoToPayment}
                onReturnToDashboard={actions.handleReturnToDashboard}
                text={procedureText}
              />

              {!state.isLoading &&
              state.profileReadyForProcedure &&
              !state.paymentRequiresAction &&
              !state.paymentIsPending &&
              !state.hasActiveProcedure ? (
                <ProcedureRequestFormCard
                  countryCode={state.countryCode}
                  isSubmitting={state.isSubmitting}
                  message={state.message}
                  onCountryCodeChange={setters.setCountryCode}
                  onMessageChange={setters.setMessage}
                  onPhoneChange={setters.setPhone}
                  onSubmit={actions.handleSubmit}
                  phone={state.phone}
                  text={procedureText}
                />
              ) : null}

              <ProcedureNextStepsCard text={procedureText} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartProcedure;
