import { Button } from "@/components/ui/button";
import type { ContactFormText } from "@/lib/contact";

type ContactProfileGateProps = {
  contactFormText: ContactFormText;
  onCompleteProfile: () => void;
};

export function ContactProfileGate({ contactFormText, onCompleteProfile }: ContactProfileGateProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-[1.8rem] border border-amber-200 bg-amber-50 p-6">
        <p className="text-lg font-semibold text-foreground">{contactFormText.completeProfileTitle}</p>
        <p className="mt-3 text-sm leading-7 text-amber-900">{contactFormText.completeProfileDescription}</p>
      </div>
      <Button onClick={onCompleteProfile} className="w-full">
        {contactFormText.completeProfileAction}
      </Button>
    </div>
  );
}
