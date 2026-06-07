import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Header from "@/components/Header";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminFaqDialog } from "@/components/admin/faq/AdminFaqDialog";
import { AdminFaqTable } from "@/components/admin/faq/AdminFaqTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminFaq } from "@/hooks/use-admin-faq";
import { useLanguage } from "@/i18n/language";
import { ADMIN_DASHBOARD_PATH, getAdminSession } from "@/lib/admin-session";
import {
  type AdminFaqInput,
  type AdminFaqText,
  buildFaqStats,
  filterFaqEntries,
} from "@/lib/admin-faq";
import type { FaqEntry } from "@/lib/faq";
import { CheckCircle2, EyeOff, ListChecks } from "lucide-react";

const AdminFAQ = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const text = t.adminFaq as AdminFaqText;
  const { toast } = useToast();
  const {
    entries,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    togglePublish,
    moveEntry,
  } = useAdminFaq();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<FaqEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const session = await getAdminSession();
      if (!session) {
        navigate("/login?redirect=/admin/faq", { replace: true });
        return;
      }
      if (isActive) await loadEntries();
    };
    void initialize();
    return () => {
      isActive = false;
    };
  }, [loadEntries, navigate]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const filtered = useMemo(
    () => filterFaqEntries({ entries, query: searchQuery, statusFilter }),
    [entries, searchQuery, statusFilter],
  );

  const stats = useMemo(() => buildFaqStats(entries), [entries]);

  const navItems = [
    { href: "/admin", label: text.breadcrumbDashboard },
    { href: "/admin/crm", label: t.adminCRM.breadcrumbCurrent },
    { href: "/admin/leads", label: t.adminLeads.breadcrumbCurrent },
    { href: "/admin/payments", label: t.adminPayments.breadcrumbCurrent },
    { href: "/admin/manual-payments", label: t.adminManualPayments.breadcrumbCurrent },
    { href: "/admin/blog", label: t.adminBlog.breadcrumbCurrent },
    { href: "/admin/faq", label: text.breadcrumbCurrent },
  ];

  const highlights = [
    { label: text.metrics.total, value: stats.total },
    { label: text.metrics.published, value: stats.published, tone: "success" as const },
    {
      label: text.metrics.unpublished,
      value: stats.unpublished,
      tone: "neutral" as const,
    },
  ];

  const handleSave = useCallback(
    async (input: AdminFaqInput) => {
      setIsSaving(true);
      const result = editing
        ? await updateEntry(editing.id, input)
        : await createEntry(input);
      setIsSaving(false);
      if (result.success) {
        toast({
          title: editing ? text.toasts.updateSuccess : text.toasts.createSuccess,
        });
        setDialogOpen(false);
        setEditing(null);
      } else {
        toast({
          title: text.toasts.errorTitle,
          description: result.message,
          variant: "destructive",
        });
      }
    },
    [createEntry, editing, text.toasts.createSuccess, text.toasts.errorTitle, text.toasts.updateSuccess, toast, updateEntry],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const result = await deleteEntry(deleting.id);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: text.toasts.deleteSuccess });
      setDeleting(null);
    } else {
      toast({
        title: text.toasts.errorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [deleteEntry, deleting, text.toasts.deleteSuccess, text.toasts.errorTitle, toast]);

  const handleTogglePublish = useCallback(
    async (entry: FaqEntry) => {
      const result = await togglePublish(entry);
      if (result.success) {
        toast({
          title: entry.is_published ? text.toasts.unpublishSuccess : text.toasts.publishSuccess,
        });
      } else {
        toast({
          title: text.toasts.errorTitle,
          description: result.message,
          variant: "destructive",
        });
      }
    },
    [text.toasts.errorTitle, text.toasts.publishSuccess, text.toasts.unpublishSuccess, toast, togglePublish],
  );

  const handleMove = useCallback(
    async (entry: FaqEntry, direction: "up" | "down") => {
      const result = await moveEntry(entry, direction);
      if (!result.success && result.message !== "out_of_range") {
        toast({
          title: text.toasts.errorTitle,
          description: result.message,
          variant: "destructive",
        });
      }
    },
    [moveEntry, text.toasts.errorTitle, toast],
  );

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />
      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <AdminWorkspaceHeader
            dashboardHref={ADMIN_DASHBOARD_PATH}
            dashboardLabel={text.breadcrumbDashboard}
            currentLabel={text.breadcrumbCurrent}
            title={text.title}
            subtitle={text.subtitle}
            navItems={navItems}
            highlights={highlights}
            actions={
              <Button
                className="rounded-xl"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {text.actions.create}
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-3">
            <AdminMetricCard
              title={text.metrics.total}
              value={stats.total}
              description={text.metrics.totalDescription}
              icon={ListChecks}
              index={0}
            />
            <AdminMetricCard
              title={text.metrics.published}
              value={stats.published}
              description={text.metrics.publishedDescription}
              icon={CheckCircle2}
              tone="success"
              index={1}
            />
            <AdminMetricCard
              title={text.metrics.unpublished}
              value={stats.unpublished}
              description={text.metrics.unpublishedDescription}
              icon={EyeOff}
              tone="neutral"
              index={2}
            />
          </div>

          <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
            <CardContent className="space-y-6 p-6 pt-6 md:pt-6">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={text.filters.searchPlaceholder}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={text.filters.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{text.filters.all}</SelectItem>
                    <SelectItem value="published">{text.filters.published}</SelectItem>
                    <SelectItem value="unpublished">{text.filters.unpublished}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AdminFaqTable
                entries={filtered}
                isLoading={isLoading}
                dateFormatter={dateFormatter}
                language={language}
                text={text}
                onEdit={(entry) => {
                  setEditing(entry);
                  setDialogOpen(true);
                }}
                onDelete={(entry) => setDeleting(entry)}
                onTogglePublish={handleTogglePublish}
                onMoveUp={(entry) => void handleMove(entry, "up")}
                onMoveDown={(entry) => void handleMove(entry, "down")}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <AdminFaqDialog
        open={dialogOpen}
        entry={editing}
        text={text}
        isSaving={isSaving}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => (!value ? setDeleting(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.dialog.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.dialog.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{text.dialog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {text.dialog.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminFAQ;
