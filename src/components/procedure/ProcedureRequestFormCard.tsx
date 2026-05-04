import { FormEvent } from "react";
import { ArrowRight, FileText, Loader2 } from "lucide-react";

import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StartProcedureText } from "@/lib/start-procedure";

interface ProcedureRequestFormCardProps {
  countryCode: string;
  isSubmitting: boolean;
  message: string;
  onCountryCodeChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  phone: string;
  text: StartProcedureText;
}

export const ProcedureRequestFormCard = ({
  countryCode,
  isSubmitting,
  message,
  onCountryCodeChange,
  onMessageChange,
  onPhoneChange,
  onSubmit,
  phone,
  text,
}: ProcedureRequestFormCardProps) => (
  <Card className="rounded-[2.5rem] border-border/40 shadow-soft">
    <CardHeader className="border-b border-border/40 bg-white p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText size={18} />
        </div>
        <CardTitle className="font-display text-xl">{text.formTitle}</CardTitle>
      </div>
      <p className="pt-3 text-sm leading-7 text-muted-foreground">{text.formDescription}</p>
    </CardHeader>
    <CardContent className="p-8">
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-8">
        <div className="group relative space-y-2">
          <label
            htmlFor="start-procedure-phone"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
          >
            {text.phone}
          </label>
          <div className="flex items-center gap-4 border-b border-border/40 transition-all duration-500 group-focus-within:border-primary">
            <CountryCodeSelect value={countryCode} onValueChange={onCountryCodeChange} />
            <Input
              id="start-procedure-phone"
              type="tel"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder={text.phonePlaceholder}
              required
              className="h-10 w-full rounded-none border-0 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="group relative space-y-2">
          <label
            htmlFor="start-procedure-message"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 transition-colors group-focus-within:text-primary"
          >
            {text.message}
          </label>
          <Textarea
            id="start-procedure-message"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={text.messagePlaceholder}
            required
            rows={5}
            className="resize-none rounded-none border-0 border-b border-border/40 bg-transparent px-0 placeholder:text-muted-foreground/30 focus-visible:border-primary focus-visible:ring-0"
          />
        </div>

        <Button
          type="submit"
          size="xl"
          className="group w-full rounded-xl bg-primary py-7 shadow-none transition-all duration-500 hover:bg-navy"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]">
              {text.submitAction}
              <ArrowRight size={16} className="transition-transform duration-500 group-hover:translate-x-2" />
            </span>
          )}
        </Button>
      </form>
    </CardContent>
  </Card>
);
