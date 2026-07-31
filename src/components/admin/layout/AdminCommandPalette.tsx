import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
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
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("AdminCommandPalette");

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 5;

type AdminCommandPaletteText = {
  placeholder: string;
  empty: string;
  searchingLabel: string;
  groups: {
    navigation: string;
    actions: string;
    leads: string;
    students: string;
  };
  actions: {
    newArticle: string;
    newFaq: string;
  };
  searchHint: string;
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
    seo: string;
  };
};

type CommandEntry = {
  label: string;
  icon: LucideIcon;
  to: string;
  keywords?: string[];
};

type LeadSearchHit = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type StudentSearchHit = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
};

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const escapeIlikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

const buildStudentLabel = (student: StudentSearchHit) => {
  const parts = [student.first_name, student.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0));
  if (parts.length > 0) return parts.join(" ");
  if (student.email) return student.email;
  return student.id;
};

export const AdminCommandPalette = ({ open, onOpenChange }: AdminCommandPaletteProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const text = t.adminCommandPalette as AdminCommandPaletteText;
  const sidebarText = t.adminSidebar as AdminSidebarText;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [leadHits, setLeadHits] = useState<LeadSearchHit[]>([]);
  const [studentHits, setStudentHits] = useState<StudentSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTokenRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setLeadHits([]);
      setStudentHits([]);
      setIsSearching(false);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setLeadHits([]);
      setStudentHits([]);
      setIsSearching(false);
      return;
    }
    const currentToken = ++searchTokenRef.current;
    const pattern = `%${escapeIlikePattern(debouncedQuery)}%`;
    setIsSearching(true);
    void (async () => {
      try {
        const [leadsResult, studentsResult] = await Promise.all([
          supabase
            .from("leads")
            .select("id, name, email, phone")
            .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
            .order("updated_at", { ascending: false })
            .limit(SEARCH_LIMIT),
          supabase
            .from("student_profiles")
            .select("id, first_name, last_name, email, phone_number")
            .or(
              `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone_number.ilike.${pattern}`,
            )
            .order("updated_at", { ascending: false })
            .limit(SEARCH_LIMIT),
        ]);
        if (currentToken !== searchTokenRef.current) return;
        if (leadsResult.error) {
          logger.warn("Failed to search leads for palette", {
            message: leadsResult.error.message,
          });
        }
        if (studentsResult.error) {
          logger.warn("Failed to search students for palette", {
            message: studentsResult.error.message,
          });
        }
        setLeadHits((leadsResult.data as LeadSearchHit[] | null) ?? []);
        setStudentHits((studentsResult.data as StudentSearchHit[] | null) ?? []);
      } catch (error: unknown) {
        if (currentToken !== searchTokenRef.current) return;
        logger.warn("Palette search threw", {
          message: getErrorMessage(error),
        });
        setLeadHits([]);
        setStudentHits([]);
      } finally {
        if (currentToken === searchTokenRef.current) {
          setIsSearching(false);
        }
      }
    })();
  }, [debouncedQuery]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const navigationEntries: CommandEntry[] = useMemo(
    () => [
      { label: sidebarText.items.dashboard, icon: LayoutDashboard, to: "/admin", keywords: ["home", "overview"] },
      { label: sidebarText.items.students, icon: Users, to: "/admin/crm", keywords: ["crm", "students", "etudiants"] },
      { label: sidebarText.items.leads, icon: UserPlus, to: "/admin/leads", keywords: ["leads", "prospects"] },
      {
        label: sidebarText.items.manualPayments,
        icon: ShieldCheck,
        to: "/admin/manual-payments",
        keywords: ["manual", "orange", "money", "manuels", "paiements"],
      },
      { label: sidebarText.items.blog, icon: FileText, to: "/admin/blog", keywords: ["articles", "posts"] },
      { label: sidebarText.items.faq, icon: HelpCircle, to: "/admin/faq", keywords: ["help", "questions"] },
      {
        label: sidebarText.items.seo,
        icon: Search,
        to: "/admin/seo",
        keywords: ["seo", "pagespeed", "lighthouse", "vitals", "referencement", "performance"],
      },
    ],
    [sidebarText.items],
  );

  const actionEntries: CommandEntry[] = useMemo(
    () => [
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
    ],
    [text.actions.newArticle, text.actions.newFaq],
  );

  const trimmedQuery = query.trim();
  const searchActive = trimmedQuery.length >= SEARCH_MIN_LENGTH;
  const hasResults =
    !searchActive || leadHits.length > 0 || studentHits.length > 0 || isSearching;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={!searchActive}
    >
      <CommandInput
        placeholder={text.placeholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
          {searchActive && !isSearching && leadHits.length === 0 && studentHits.length === 0 ? (
            <CommandEmpty>{text.empty}</CommandEmpty>
          ) : null}
          {!searchActive ? <CommandEmpty>{text.empty}</CommandEmpty> : null}

          {searchActive && isSearching ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{text.searchingLabel}</span>
            </div>
          ) : null}

          {searchActive && leadHits.length > 0 ? (
            <CommandGroup heading={text.groups.leads}>
              {leadHits.map((lead) => (
                <CommandItem
                  key={`lead-${lead.id}`}
                  value={`lead ${lead.name} ${lead.email} ${lead.phone ?? ""}`}
                  onSelect={() =>
                    go(`/admin/leads?search=${encodeURIComponent(lead.email || lead.name)}`)
                  }
                >
                  <UserPlus className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{lead.name}</span>
                    <span className="text-xs text-muted-foreground">{lead.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {searchActive && studentHits.length > 0 ? (
            <CommandGroup heading={text.groups.students}>
              {studentHits.map((student) => {
                const label = buildStudentLabel(student);
                return (
                  <CommandItem
                    key={`student-${student.id}`}
                    value={`student ${label} ${student.email ?? ""} ${student.phone_number ?? ""}`}
                    onSelect={() => go(`/admin/students/${student.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{label}</span>
                      {student.email ? (
                        <span className="text-xs text-muted-foreground">{student.email}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}

          {(searchActive && hasResults ? true : !searchActive) ? (
            <>
              {searchActive ? <CommandSeparator /> : null}
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
            </>
          ) : null}

          {!searchActive ? (
            <p className="border-t px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {text.searchHint}
            </p>
          ) : null}
        </CommandList>
    </CommandDialog>
  );
};
