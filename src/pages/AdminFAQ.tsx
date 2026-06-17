import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
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
import { getAdminSession } from "@/lib/admin-session";
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setEditing(null);
      setDialogOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    <AdminLayout
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {text.actions.create}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <AdminMetricCard
            title={text.metrics.total}
            value={stats.total}
            description={text.metrics.totalDescription}
            icon={ListChecks}
          />
          <AdminMetricCard
            title={text.metrics.published}
            value={stats.published}
            description={text.metrics.publishedDescription}
            icon={CheckCircle2}
            tone="success"
          />
          <AdminMetricCard
            title={text.metrics.unpublished}
            value={stats.unpublished}
            description={text.metrics.unpublishedDescription}
            icon={EyeOff}
            tone="neutral"
          />
        </div>

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
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
    </AdminLayout>
  );
};

export default AdminFAQ;
