import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  services: [
    { label: "University Selection", href: "#services" },
    { label: "Scholarship Assistance", href: "#services" },
    { label: "Visa Guidance", href: "#services" },
    { label: "Internship Placement", href: "#services" },
  ],
  company: [
    { label: "About Us", href: "#about" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Contact", href: "#contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

const Footer = () => {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="section-container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <img src={logo} alt="Power Prestation" className="h-10 mb-6 brightness-0 invert" />
            <p className="text-navy-foreground/70 mb-6 max-w-sm leading-relaxed">
              Your trusted partner in academic and professional mobility. Helping students achieve their dreams of studying abroad since 2014.
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
            <h4 className="font-semibold text-navy-foreground mb-4">Services</h4>
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
            <h4 className="font-semibold text-navy-foreground mb-4">Company</h4>
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
            <h4 className="font-semibold text-navy-foreground mb-4">Stay Updated</h4>
            <p className="text-navy-foreground/70 text-sm mb-4">
              Subscribe to get the latest news and updates.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-foreground/50" />
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-primary/10 border border-primary/20 text-navy-foreground placeholder:text-navy-foreground/50 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-navy-foreground/50 text-sm">
            © {new Date().getFullYear()} Power Prestation. All rights reserved.
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
