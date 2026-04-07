import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandMark from "@/components/BrandMark";
import { useLanguage } from "@/i18n/language";
import { createLogger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const logger = createLogger("Header");

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    // Auth check
    const checkAuth = async () => {
      logger.info("Checking header auth session");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        logger.info("Header session found", { userId: session.user.id });
        setUser({ email: session.user.email });
        const { data: admin } = await supabase
          .from("admins")
          .select("email")
          .eq("email", session.user.email)
          .maybeSingle();
        
        logger.info("Header admin status resolved", { isAdmin: Boolean(admin) });
        setIsAdmin(!!admin);
      } else {
        logger.info("No active session in header");
        setUser(null);
        setIsAdmin(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info("Header auth state changed", { event, hasSession: Boolean(session) });
      if (session) {
        setUser({ email: session.user.email });
        checkAuth();
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const navLinks = [
    { href: isHomePage ? "#services" : "/#services", label: t.nav.services },
    { href: isHomePage ? "#about" : "/#about", label: t.nav.aboutUs },
    { href: isHomePage ? "#how-it-works" : "/#how-it-works", label: t.nav.howItWorks },
    { href: "/blog", label: t.nav.blog, isInternal: true },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[90rem] px-0">
        <div
          className={cn(
            "mx-auto w-full rounded-[1.75rem] border px-4 transition-all duration-300 md:rounded-full md:px-6",
            isScrolled
              ? "border-white/60 bg-white/85 shadow-medium backdrop-blur-xl"
              : "border-white/35 bg-white/62 shadow-soft backdrop-blur-xl",
          )}
        >
          <div className="flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <BrandMark
                size="md"
                className={cn(
                  "transition-transform duration-300",
                  isScrolled ? "scale-[0.97]" : "scale-100",
                )}
              />
              <div className="hidden min-w-0 lg:block">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/55">
                  Power Prestation
                </p>
              </div>
            </Link>

            <div className="hidden xl:flex flex-1 justify-center px-4">
              <nav className="flex items-center rounded-full border border-border/40 bg-secondary/40 px-1.5 py-1.5 shadow-sm min-w-max">
                {navLinks.map((link) => (
                  link.isInternal ? (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="rounded-full px-5 py-2 text-[13px] font-bold uppercase tracking-widest text-foreground/60 transition-all duration-200 hover:text-primary hover:bg-white/50 text-center"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      className="rounded-full px-5 py-2 text-[13px] font-bold uppercase tracking-widest text-foreground/60 transition-all duration-200 hover:text-primary hover:bg-white/50 text-center"
                    >
                      {link.label}
                    </a>
                  )
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              <div className="hidden md:flex items-center gap-3">
                <LanguageSwitcher />
                
                {user ? (
                  <Link 
                    to={isAdmin ? "/admin" : "/dashboard"}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <User size={14} />
                    {isAdmin ? "Admin Hub" : (language === "fr" ? "Mon Dossier" : "My Portal")}
                  </Link>
                ) : (
                  <Link 
                    to="/login" 
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-border/40 text-foreground/60 hover:text-primary hover:border-primary/30 transition-all text-center"
                    title={t.login.signInTab}
                  >
                    <User size={18} />
                  </Link>
                )}
              </div>
              <Button size="lg" asChild className="hidden sm:flex px-6 h-11 rounded-full text-[13px] font-bold uppercase tracking-widest text-center">
                <a href={isHomePage ? "#contact" : "/#contact"}>{t.nav.contactUs}</a>
              </Button>
              
              <div className="xl:hidden">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/55 text-foreground shadow-soft backdrop-blur-sm"
                  onClick={() => setIsMenuOpen((value) => !value)}
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <div className="xl:hidden pb-4 animate-fade-in">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-medium">
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    link.isInternal ? (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:bg-secondary/70 hover:text-primary text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.href}
                        href={link.href}
                        className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:bg-secondary/70 hover:text-primary text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    )
                  ))}
                  <div className="h-px bg-border/40 my-2" />
                  {user ? (
                    <Link
                      to={isAdmin ? "/admin/crm" : "/dashboard"}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary hover:bg-secondary/70 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User size={18} />
                      {isAdmin ? "Admin CRM" : (language === "fr" ? "Mon Dossier" : "My Portal")}
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary hover:bg-secondary/70 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User size={18} />
                      {t.login.signInTab}
                    </Link>
                  )}
                  <Button variant="outline" className="mt-3 w-full text-center" asChild>
                    <a href={isHomePage ? "#contact" : "/#contact"} onClick={() => setIsMenuOpen(false)}>
                      {t.nav.contactUs}
                    </a>
                  </Button>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
