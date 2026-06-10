import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/language";
import { cn } from "@/lib/utils";

type AdminSidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

type AdminSidebarSection = {
  label: string;
  items: AdminSidebarNavItem[];
};

interface AdminSidebarProps {
  onSignOut: () => void;
  adminEmail?: string | null;
  onNavigate?: () => void;
}

type AdminSidebarText = {
  brand: string;
  sections: {
    overview: string;
    operations: string;
    payments: string;
    content: string;
  };
  items: {
    dashboard: string;
    students: string;
    leads: string;
    payments: string;
    manualPayments: string;
    blog: string;
    faq: string;
  };
  signOut: string;
};

export const AdminSidebar = ({ onSignOut, adminEmail, onNavigate }: AdminSidebarProps) => {
  const { t } = useLanguage();
  const text = t.adminSidebar as AdminSidebarText;

  const sections: AdminSidebarSection[] = [
    {
      label: text.sections.overview,
      items: [
        { href: "/admin", label: text.items.dashboard, icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: text.sections.operations,
      items: [
        { href: "/admin/crm", label: text.items.students, icon: Users },
        { href: "/admin/leads", label: text.items.leads, icon: UserPlus },
      ],
    },
    {
      label: text.sections.payments,
      items: [
        { href: "/admin/payments", label: text.items.payments, icon: Receipt },
        { href: "/admin/manual-payments", label: text.items.manualPayments, icon: ShieldCheck },
      ],
    },
    {
      label: text.sections.content,
      items: [
        { href: "/admin/blog", label: text.items.blog, icon: FileText },
        { href: "/admin/faq", label: text.items.faq, icon: HelpCircle },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-full flex-col border-r border-border/40 bg-white">
      <Link
        to="/admin"
        onClick={onNavigate}
        className="flex h-14 items-center gap-2 border-b border-border/40 px-5 text-sm font-semibold tracking-tight text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          PP
        </span>
        <span>{text.brand}</span>
      </Link>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {section.label}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/8 text-primary"
                        : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary transition-opacity",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-border/40 p-3">
        {adminEmail ? (
          <p className="mb-2 truncate px-2 text-[11px] text-muted-foreground" title={adminEmail}>
            {adminEmail}
          </p>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start gap-2 text-foreground/70 hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {text.signOut}
        </Button>
      </div>
    </aside>
  );
};
