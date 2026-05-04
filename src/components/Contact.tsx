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
      className={standalone ? "section-padding bg-secondary/5 pt-32" : "section-padding bg-white"}
    >
      <div className="section-container">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
          <ContactInfoColumn />

          <Card className="animate-in border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] fade-in slide-in-from-right-4 duration-1000 delay-200">
            <CardContent className="p-8 pt-8 lg:p-16 lg:pt-16">
              <div className="mb-12">
                <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">{t.contact.form.title}</h3>
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
