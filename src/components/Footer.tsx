import { ArrowRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/language";
import { Button } from "@/components/ui/button";
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
  { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61578800394432", label: "Facebook" },
  { icon: TikTokIcon, href: "https://www.tiktok.com/@power.prestation", label: "TikTok" },
  { icon: Instagram, href: "https://www.instagram.com/power.prestation", label: "Instagram" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/powerprestation/posts", label: "LinkedIn" },
];

const Footer = () => {
  const { t } = useLanguage();

  const footerLinks = {
    services: [
      { label: t.footer.links.universitySelection, href: "#services" },
      { label: t.footer.links.scholarshipAssistance, href: "#services" },
      { label: t.footer.links.visaGuidance, href: "#services" },
      { label: t.footer.links.internshipPlacement, href: "#services" },
    ],
    company: [
      { label: t.footer.links.aboutUs, href: "#about" },
      { label: t.footer.links.howItWorks, href: "#how-it-works" },
      { label: t.footer.links.testimonials, href: "#testimonials" },
      { label: t.footer.links.contact, href: "#contact" },
    ],
    legal: [
      { label: t.footer.links.privacyPolicy, href: "/legal/privacy" },
      { label: t.footer.links.termsOfService, href: "/legal/terms" },
      { label: t.footer.links.cookiePolicy, href: "/legal/cookies" },
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
      value: "FOUDA, derriere le FNE-Yaounde",
      href: "https://www.google.com/maps/search/?api=1&query=FOUDA%2C%20derriere%20le%20FNE-Yaounde",
    },
  ];

  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="section-container py-12 md:py-14">
        <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-6 shadow-strong md:p-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-6">
            <div className="rounded-[1.45rem] border border-white/10 bg-white/6 p-5 md:p-6">
              <div className="flex items-center gap-4">
                <BrandMark tone="dark" size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-foreground/58">
                    Power Prestation
                  </p>
                  <p className="mt-1 text-sm text-navy-foreground/72">{t.hero.advisoryLabel}</p>
                </div>
              </div>

              <p className="mt-5 max-w-[34rem] text-sm leading-7 text-navy-foreground/72">{t.footer.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-medium text-navy-foreground/72">
                  {t.footer.responseLabel}: 24-48h
                </span>
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-medium text-navy-foreground/72">
                  EN / FR
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/7 text-primary transition-colors hover:border-primary/35 hover:bg-primary hover:text-primary-foreground"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-white/10 bg-white/6 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-navy-foreground/58">
                    {t.footer.contactTitle}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-navy-foreground/72">{t.footer.contactDescription}</p>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="shrink-0 border-white/14 bg-white/7 text-navy-foreground hover:border-white/24 hover:bg-white/10"
                >
                  <a href="#contact">
                    {t.nav.contactUs}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {contactDetails.slice(0, 2).map((detail) => (
                  <a
                    key={detail.label}
                    href={detail.href}
                    className="rounded-[1.15rem] border border-white/10 bg-white/7 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
                        <detail.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-navy-foreground/52">
                          {detail.label}
                        </p>
                        <p className="mt-1 break-words text-sm leading-6 text-navy-foreground">{detail.value}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              <a
                href={contactDetails[2].href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-start gap-3 rounded-[1.15rem] border border-white/10 bg-white/7 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-white/10"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-navy-foreground/52">
                    {contactDetails[2].label}
                  </p>
                  <p className="mt-1 break-words text-sm leading-6 text-navy-foreground">{contactDetails[2].value}</p>
                </div>
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/10 pt-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-navy-foreground/58">
                {t.footer.services}
              </h3>
              <ul className="mt-4 grid gap-3">
                {footerLinks.services.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm leading-6 text-navy-foreground/74 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-navy-foreground/58">
                {t.footer.company}
              </h3>
              <ul className="mt-4 grid gap-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm leading-6 text-navy-foreground/74 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 border-t border-white/10 pt-5 md:col-span-1 md:border-t-0 md:pt-0 md:text-right">
              <p className="text-sm text-navy-foreground/54">{`(c) ${new Date().getFullYear()} Power Prestation. ${t.footer.copyright}`}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
                {footerLinks.legal.map((link) => (
                  <a key={link.label} href={link.href} className="text-sm transition-colors hover:text-primary">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
