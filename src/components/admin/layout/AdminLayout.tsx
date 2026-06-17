import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AdminCommandPalette } from "@/components/admin/layout/AdminCommandPalette";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopbar } from "@/components/admin/layout/AdminTopbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSession } from "@/lib/admin-session";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * When true, the layout will not redirect unauthenticated users. Use this for
   * routes that handle their own session gate (e.g. the login page).
   */
  skipAuthGuard?: boolean;
}

export const AdminLayout = ({
  title,
  subtitle,
  actions,
  children,
  skipAuthGuard = false,
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(skipAuthGuard);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (skipAuthGuard) {
      return;
    }

    let isActive = true;

    const verify = async () => {
      const session = await getAdminSession();
      if (!isActive) {
        return;
      }

      if (!session) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }

      setAdminEmail(session.user.email ?? null);
      setAuthChecked(true);
    };

    void verify();

    return () => {
      isActive = false;
    };
  }, [location.pathname, navigate, skipAuthGuard]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (!authChecked) {
    return null;
  }

  return (
    <div className="flex h-screen bg-secondary/20">
      <div className="hidden w-60 shrink-0 md:block">
        <AdminSidebar onSignOut={handleSignOut} adminEmail={adminEmail} />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar
            onSignOut={handleSignOut}
            adminEmail={adminEmail}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main className="flex-1 overflow-auto px-4 py-6 md:px-8">{children}</main>
      </div>

      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
};
