import { Card, CardContent } from "@/components/ui/card";
import { ContactInfoColumn } from "@/components/contact/ContactInfoColumn";
import { ContactProcedureForm } from "@/components/contact/ContactProcedureForm";
import { ContactProfileGate } from "@/components/contact/ContactProfileGate";
import { useContactForm } from "@/hooks/use-contact-form";

interface ContactProps {
  standalone?: boolean;
}

const Contact = ({ standalone = false }: ContactProps) => {
  const {
    t,
    contactFormText,
    countryCode,
    sessionUser,
    isSubmitting,
    isAuthLoading,
    formData,
    password,
    confirmPassword,
    showProfileGate,
    setCountryCode,
    setPassword,
    setConfirmPassword,
    handleChange,
    handleSubmit,
    goToProfileCompletion,
  } = useContactForm();

  return (
    <section
      id={standalone ? undefined : "contact"}
      className={
        standalone
          ? "section-padding overflow-hidden bg-secondary/5 pt-24 sm:pt-28 lg:pt-32"
          : "section-padding overflow-hidden bg-white"
      }
    >
      <div className="section-container">
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <ContactInfoColumn />

          <Card className="animate-in border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] fade-in slide-in-from-right-4 duration-1000 delay-200">
            <CardContent className="p-4 sm:p-6 lg:p-16 lg:pt-16">
              <div className="mb-8 lg:mb-12">
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {t.contact.form.title}
                </h3>
                <div className="mt-2 h-0.5 w-10 bg-primary/20" />
              </div>

              {showProfileGate ? (
                <ContactProfileGate
                  contactFormText={contactFormText}
                  onCompleteProfile={goToProfileCompletion}
                />
              ) : (
                <ContactProcedureForm
                  t={t}
                  contactFormText={contactFormText}
                  formData={formData}
                  sessionUser={sessionUser}
                  countryCode={countryCode}
                  password={password}
                  confirmPassword={confirmPassword}
                  isSubmitting={isSubmitting}
                  isAuthLoading={isAuthLoading}
                  onSubmit={handleSubmit}
                  onChange={handleChange}
                  onCountryCodeChange={setCountryCode}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
