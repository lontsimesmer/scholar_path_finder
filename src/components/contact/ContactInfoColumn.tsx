import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

import SectionHeading from "@/components/SectionHeading";
import { useLanguage } from "@/i18n/language";
import { ContactInfoItem } from "@/lib/contact";

function buildContactInfo(
  emailLabel: string,
  phoneLabel: string,
  officeLabel: string,
  officeValue: string,
): ContactInfoItem[] {
  return [
    {
      icon: Mail,
      label: emailLabel,
      value: "powerprestationint@gmail.com",
      href: "mailto:powerprestationint@gmail.com",
    },
    {
      icon: Phone,
      label: phoneLabel,
      value: "+(237) 674 819 411",
      href: "tel:+237674819411",
    },
    {
      icon: MapPin,
      label: officeLabel,
      value: officeValue,
      href: "https://www.google.com/maps/search/?api=1&query=FOUDA%2C%20derriere%20le%20FNE-Yaounde",
    },
  ];
}

export function ContactInfoColumn() {
  const { t } = useLanguage();
  const contactInfo = buildContactInfo(
    t.contact.info.email,
    t.contact.info.phone,
    t.contact.info.office,
    t.contact.info.officeValue,
  );

  return (
    <div className="animate-in space-y-12 fade-in slide-in-from-left-4 duration-1000">
      <SectionHeading
        badge={t.contact.badge}
        title={t.contact.title}
        highlight={t.contact.titleHighlight}
        subtitle={t.contact.subtitle}
        align="left"
      />

      <div className="grid gap-6">
        {contactInfo.map((info) => (
          <a key={info.label} href={info.href} className="group flex items-start gap-6 transition-transform hover:translate-x-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary transition-all group-hover:bg-primary group-hover:text-white">
              <info.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{info.label}</p>
              <p className="text-base font-semibold text-foreground/80">{info.value}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="rounded-[2rem] border border-border/40 bg-secondary/30 p-8">
        <h4 className="font-display text-xl font-bold text-foreground">{t.hero.advisoryLabel}</h4>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80">{t.footer.ctaDescription}</p>
        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
          <span>
            {t.hero.stats.successRate} {t.contact.successRateSuffix}
          </span>
          <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
}
