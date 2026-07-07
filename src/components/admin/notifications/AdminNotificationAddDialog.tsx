import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminNotificationsText, isValidNotificationEmail } from "@/lib/admin-notifications";

interface AdminNotificationAddDialogProps {
  open: boolean;
  isSubmitting: boolean;
  text: AdminNotificationsText;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void> | void;
}

export const AdminNotificationAddDialog = ({
  open,
  isSubmitting,
  text,
  onClose,
  onSubmit,
}: AdminNotificationAddDialogProps) => {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setTouched(false);
    }
  }, [open]);

  const isValid = isValidNotificationEmail(email);
  const showError = touched && !isValid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      setTouched(true);
      return;
    }
    await onSubmit(email.trim().toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{text.addDialog.title}</DialogTitle>
          <DialogDescription>{text.addDialog.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-notification-email">{text.addDialog.emailLabel}</Label>
            <Input
              id="admin-notification-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={text.addDialog.emailPlaceholder}
              disabled={isSubmitting}
              required
              aria-invalid={showError || undefined}
            />
            {showError ? (
              <p className="text-xs text-destructive">{text.addDialog.invalidEmail}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {text.addDialog.cancel}
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {text.addDialog.submitting}
                </span>
              ) : (
                text.addDialog.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
