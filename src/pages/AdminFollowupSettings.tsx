import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
import {
  type AdminFollowupSettingsText,
  type FollowupConfigDto,
  fetchFollowupSettings,
  isValidFollowupConfig,
  saveFollowupSettings,
} from "@/lib/admin-followup-settings";

const AdminFollowupSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const text = t.adminFollowupSettings as AdminFollowupSettingsText;

  const [config, setConfig] = useState<FollowupConfigDto | null>(null);
  const [defaults, setDefaults] = useState<FollowupConfigDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;
    const initialize = async () => {
      const session = await getAdminSession();
      if (!isActive) return;
      if (!session) {
        navigate("/login?redirect=/admin/followup-settings", { replace: true });
        return;
      }
      const result = await fetchFollowupSettings();
      if (!isActive) return;
      if (result.success) {
        setConfig(result.config);
        setDefaults(result.defaults ?? result.config);
      } else {
        toast({
          title: text.toasts.loadErrorTitle,
          description: result.message,
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };
    void initialize();
    return () => {
      isActive = false;
    };
  }, [navigate, text.toasts.loadErrorTitle, toast]);

  const handleFieldChange = useCallback(
    <K extends keyof FollowupConfigDto>(field: K, value: FollowupConfigDto[K]) => {
      setConfig((current) => (current ? { ...current, [field]: value } : current));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!config) return;
    if (!isValidFollowupConfig(config)) {
      toast({ title: text.toasts.invalidValues, variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const result = await saveFollowupSettings(config);
    setIsSaving(false);
    if (result.success) {
      setConfig(result.config);
      toast({
        title: text.toasts.saveSuccessTitle,
        description: text.toasts.saveSuccessDescription,
      });
    } else {
      toast({
        title: text.toasts.saveErrorTitle,
        description: result.message,
        variant: "destructive",
      });
    }
  }, [config, text.toasts, toast]);

  const handleReset = useCallback(() => {
    if (defaults) {
      setConfig(defaults);
    }
  }, [defaults]);

  return (
    <AdminLayout title={text.title} subtitle={text.subtitle}>
      <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
        <CardHeader className="flex flex-row items-start gap-3 border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Timer size={20} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{text.cardTitle}</CardTitle>
            <CardDescription>{text.cardDescription}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-6 md:p-8">
          {isLoading || !config ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-secondary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="followup-enabled" className="text-base font-semibold text-foreground">
                    {text.enabledLabel}
                  </Label>
                  <p className="text-sm text-muted-foreground">{text.enabledDescription}</p>
                </div>
                <Switch
                  id="followup-enabled"
                  checked={config.enabled}
                  onCheckedChange={(value) => handleFieldChange("enabled", Boolean(value))}
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="followup-max">{text.maxFollowUpsLabel}</Label>
                  <Input
                    id="followup-max"
                    type="number"
                    min={1}
                    max={60}
                    value={config.max_follow_ups}
                    onChange={(event) =>
                      handleFieldChange(
                        "max_follow_ups",
                        Number.parseInt(event.target.value || "0", 10),
                      )
                    }
                    disabled={isSaving || !config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">{text.maxFollowUpsHelper}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followup-interval">{text.intervalHoursLabel}</Label>
                  <Input
                    id="followup-interval"
                    type="number"
                    min={1}
                    max={24 * 30}
                    value={config.interval_hours}
                    onChange={(event) =>
                      handleFieldChange(
                        "interval_hours",
                        Number.parseInt(event.target.value || "0", 10),
                      )
                    }
                    disabled={isSaving || !config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">{text.intervalHoursHelper}</p>
                </div>
              </div>

              <p className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-xs leading-6 text-primary/90">
                {text.cronNote}
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={isSaving || !defaults}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {text.resetButton}
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSaving ? text.savingButton : text.saveButton}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminFollowupSettings;
