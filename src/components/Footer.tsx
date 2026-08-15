import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useLocalizedPath } from "@/hooks/use-localized-path";
import { useLanguage } from "@/i18n/language";
import BrandMark from "@/components/BrandMark";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const socialLinks = [
  {
    icon: Facebook,
    href: "https://www.facebook.com/profile.php?id=61578800394432",
    label: "Facebook",
  },
  {
    icon: TikTokIcon,
    href: "https://www.tiktok.com/@power.prestation",
    label: "TikTok",
  },
  {
    icon: Instagram,
    href: "https://www.instagram.com/power.prestation",
    label: "Instagram",
  },
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/company/powerprestation/posts",
    label: "LinkedIn",
  },
];

const Footer = () => {
  const { t } = useLanguage();
  const localized = useLocalizedPath();

  const footerLinks = {
    legal: [
      { label: t.footer.links.privacyPolicy, href: localized("/legal/privacy") },
      { label: t.footer.links.termsOfService, href: localized("/legal/terms") },
      { label: t.footer.links.cookiePolicy, href: localized("/legal/cookies") },
    ],
  };

  const contactDetails = [
    {
      icon: Mail,
      label: t.contact.info.email,
      value: "powerprestationint@gmail.com",
      href: "mailto:powerprestationint@gmail.com",
    },
    {
      icon: Phone,
      label: t.contact.info.phone,
      value: "+(237)674819411",
      href: "tel:+237674819411",
    },
    {
      icon: MapPin,
      label: t.footer.officeLabel,
      value: "FOUDA, derrière le FNE-Yaoundé",
      href: "https://www.google.com/maps/search/?api=1&query=FOUDA%2C%20derriere%20le%20FNE-Yaounde",
    },
  ];

  return (
    <footer className="bg-slate-950 text-slate-100">
      <div className="section-container py-10 md:py-12">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(24rem,1.25fr)] lg:items-start">
            <div className="max-w-[28rem] space-y-6">
              <div className="flex items-center gap-4">
                <BrandMark tone="dark" size="md" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
                    Power Prestation
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {t.hero.advisoryLabel}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-300">
                {t.footer.description}
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  {t.footer.responseLabel}: 24-48h
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  FR / EN
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                {contactDetails.map((detail) => (
                  <a
                    key={detail.label}
                    href={detail.href}
                    target={
                      detail.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      detail.href.startsWith("http") ? "noreferrer" : undefined
                    }
                    className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4 transition-colors hover:border-primary/30 hover:bg-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
                        <detail.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {detail.label}
                        </p>
                        <p className="mt-1 break-words text-sm leading-6 text-slate-200">
                          {detail.value}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-primary transition-colors hover:border-primary/35 hover:bg-primary hover:text-primary-foreground"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-400">{`© ${new Date().getFullYear()} Power Prestation. ${t.footer.copyright}`}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-300 transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
