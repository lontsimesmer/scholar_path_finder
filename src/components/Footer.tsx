import { Facebook, Instagram, Linkedin, Mail, Send } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import footerLogo from "@/assets/footer-logo.png";

// TikTok icon component
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
      { label: t.footer.links.privacyPolicy, href: "#" },
      { label: t.footer.links.termsOfService, href: "#" },
      { label: t.footer.links.cookiePolicy, href: "#" },
    ],
  };

  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="section-container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <img src={footerLogo} alt="Power Prestation" className="h-16 mb-6" />
            <p className="text-navy-foreground/70 mb-6 max-w-sm leading-relaxed">
              {t.footer.description}
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary transition-colors group"
                >
                  <social.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-navy-foreground mb-4">{t.footer.services}</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-navy-foreground/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-navy-foreground mb-4">{t.footer.company}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-navy-foreground/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-navy-foreground mb-4">{t.footer.stayUpdated}</h4>
            <p className="text-navy-foreground/70 text-sm mb-4">
              {t.footer.subscribeText}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-foreground/50" />
                <input
                  type="email"
                  placeholder={t.footer.emailPlaceholder}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-primary/10 border border-primary/20 text-navy-foreground placeholder:text-navy-foreground/50 focus:outline-none focus:border-primary"
                />
              </div>
              <Button size="sm" className="h-10 px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-navy-foreground/50 text-sm">
            © {new Date().getFullYear()} Power Prestation. {t.footer.copyright}
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm text-navy-foreground/50 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
