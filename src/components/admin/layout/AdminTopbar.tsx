import { Menu, Search } from "lucide-react";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/language";

type AdminCommandPaletteText = {
  triggerHint: string;
};

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onOpenMobileNav: () => void;
  onOpenCommand: () => void;
}

export const AdminTopbar = ({
  title,
  subtitle,
  actions,
  onOpenMobileNav,
  onOpenCommand,
}: AdminTopbarProps) => {
  const { t } = useLanguage();
  const commandText = t.adminCommandPalette as AdminCommandPaletteText;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/40 bg-white/90 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        className="md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden h-8 items-center gap-2 rounded-md border border-border/50 bg-secondary/30 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground sm:inline-flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{commandText.triggerHint}</span>
        <kbd className="ml-2 inline-flex h-5 items-center rounded border border-border/60 bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenCommand}
        className="sm:hidden"
        aria-label={commandText.triggerHint}
      >
        <Search className="h-5 w-5" />
      </Button>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
};
