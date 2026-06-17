import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Receipt,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLanguage } from "@/i18n/language";

type AdminCommandPaletteText = {
  placeholder: string;
  empty: string;
  groups: {
    navigation: string;
    actions: string;
  };
  actions: {
    newArticle: string;
    newFaq: string;
  };
};

type AdminSidebarText = {
  items: {
    dashboard: string;
    students: string;
    leads: string;
    payments: string;
    manualPayments: string;
    blog: string;
    faq: string;
  };
};

type CommandEntry = {
  label: string;
  icon: LucideIcon;
  to: string;
  keywords?: string[];
};

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminCommandPalette = ({ open, onOpenChange }: AdminCommandPaletteProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const text = t.adminCommandPalette as AdminCommandPaletteText;
  const sidebarText = t.adminSidebar as AdminSidebarText;

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const navigationEntries: CommandEntry[] = [
    { label: sidebarText.items.dashboard, icon: LayoutDashboard, to: "/admin", keywords: ["home", "overview"] },
    { label: sidebarText.items.students, icon: Users, to: "/admin/crm", keywords: ["crm", "students", "etudiants"] },
    { label: sidebarText.items.leads, icon: UserPlus, to: "/admin/leads", keywords: ["leads", "prospects"] },
    { label: sidebarText.items.payments, icon: Receipt, to: "/admin/payments", keywords: ["paiements", "transactions"] },
    {
      label: sidebarText.items.manualPayments,
      icon: ShieldCheck,
      to: "/admin/manual-payments",
      keywords: ["manual", "orange", "money", "manuels"],
    },
    { label: sidebarText.items.blog, icon: FileText, to: "/admin/blog", keywords: ["articles", "posts"] },
    { label: sidebarText.items.faq, icon: HelpCircle, to: "/admin/faq", keywords: ["help", "questions"] },
  ];

  const actionEntries: CommandEntry[] = [
    {
      label: text.actions.newArticle,
      icon: Plus,
      to: "/admin/blog?action=new",
      keywords: ["create", "blog", "post", "article"],
    },
    {
      label: text.actions.newFaq,
      icon: Plus,
      to: "/admin/faq?action=new",
      keywords: ["create", "faq", "question"],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={text.placeholder} />
      <CommandList>
        <CommandEmpty>{text.empty}</CommandEmpty>

        <CommandGroup heading={text.groups.navigation}>
          {navigationEntries.map((entry) => (
            <CommandItem
              key={entry.to}
              value={`${entry.label} ${(entry.keywords ?? []).join(" ")}`}
              onSelect={() => go(entry.to)}
            >
              <entry.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{entry.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={text.groups.actions}>
          {actionEntries.map((entry) => (
            <CommandItem
              key={entry.to}
              value={`${entry.label} ${(entry.keywords ?? []).join(" ")}`}
              onSelect={() => go(entry.to)}
            >
              <entry.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{entry.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
