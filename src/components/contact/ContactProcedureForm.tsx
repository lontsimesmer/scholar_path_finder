import { ArrowRight, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContactFormData, ContactFormText } from "@/lib/contact";

type ContactProcedureFormProps = {
  t: {
    contact: {
      form: {
        email: string;
        emailPlaceholder: string;
        phone: string;
        message: string;
        messagePlaceholder: string;
        privacyNote: string;
      };
    };
  };
  contactFormText: ContactFormText;
  formData: ContactFormData;
  sessionUser: User | null;
  countryCode: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  isAuthLoading: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCountryCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
};

const inputClassName =
  "h-10 rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0";
const labelClassName =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary";

export function ContactProcedureForm({
  t,
  contactFormText,
  formData,
  sessionUser,
  countryCode,
  password,
  confirmPassword,
  isSubmitting,
  isAuthLoading,
  onSubmit,
  onChange,
  onCountryCodeChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: ContactProcedureFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <div className="rounded-[1.2rem] border border-border/40 bg-secondary/20 px-4 py-3 text-sm leading-6 text-muted-foreground">
        {sessionUser ? contactFormText.signedInHint : contactFormText.createAccountHint}
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        <div className="group relative space-y-2">
          <label htmlFor="first-name" className={labelClassName}>
            {contactFormText.firstName}
          </label>
          <Input
            id="first-name"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            placeholder={contactFormText.firstNamePlaceholder}
            required
            disabled={Boolean(sessionUser)}
            className={inputClassName}
          />
        </div>

        <div className="group relative space-y-2">
          <label htmlFor="last-name" className={labelClassName}>
            {contactFormText.lastName}
          </label>
          <Input
            id="last-name"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            placeholder={contactFormText.lastNamePlaceholder}
            required
            disabled={Boolean(sessionUser)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="group relative space-y-2">
        <label htmlFor="email" className={labelClassName}>
          {t.contact.form.email}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          placeholder={t.contact.form.emailPlaceholder}
          required
          disabled={Boolean(sessionUser)}
          className={inputClassName}
        />
      </div>

      {!sessionUser ? (
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="group relative space-y-2">
            <label htmlFor="password" className={labelClassName}>
              {contactFormText.password}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={contactFormText.passwordPlaceholder}
              required
              minLength={8}
              className={inputClassName}
            />
          </div>

          <div className="group relative space-y-2">
            <label htmlFor="confirm-password" className={labelClassName}>
              {contactFormText.confirmPassword}
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder={contactFormText.confirmPasswordPlaceholder}
              required
              minLength={8}
              className={inputClassName}
            />
          </div>
        </div>
      ) : null}

      <div className="group relative space-y-2">
        <label htmlFor="phone" className={labelClassName}>
          {t.contact.form.phone}
        </label>
        <div className="flex items-center gap-4 border-b border-border/40 transition-all duration-500 group-focus-within:border-primary">
          <CountryCodeSelect value={countryCode} onValueChange={onCountryCodeChange} />
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={onChange}
            placeholder="674 819 411"
            required
            className="h-10 w-full rounded-none border-0 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="group relative space-y-2">
        <label htmlFor="message" className={labelClassName}>
          {t.contact.form.message}
        </label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={onChange}
          placeholder={t.contact.form.messagePlaceholder}
          required
          rows={4}
          className="resize-none rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
        />
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          size="xl"
          className="group relative w-full overflow-hidden bg-primary py-7 shadow-none transition-all duration-500 hover:bg-navy"
          disabled={isSubmitting || isAuthLoading}
        >
          {isSubmitting || isAuthLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
              {sessionUser ? contactFormText.submitProcedure : contactFormText.createAccountAndSubmit}
              <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
            </span>
          )}
        </Button>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground/40">
          {t.contact.form.privacyNote}
        </p>
      </div>
    </form>
  );
}
