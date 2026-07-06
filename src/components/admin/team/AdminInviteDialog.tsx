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
import { type AdminTeamText, isValidAdminEmail } from "@/lib/admin-team";

interface AdminInviteDialogProps {
  open: boolean;
  isSubmitting: boolean;
  text: AdminTeamText;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void> | void;
}

export const AdminInviteDialog = ({
  open,
  isSubmitting,
  text,
  onClose,
  onSubmit,
}: AdminInviteDialogProps) => {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setTouched(false);
    }
  }, [open]);

  const isValid = isValidAdminEmail(email);
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
          <DialogTitle>{text.inviteDialog.title}</DialogTitle>
          <DialogDescription>{text.inviteDialog.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-invite-email">{text.inviteDialog.emailLabel}</Label>
            <Input
              id="admin-invite-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={text.inviteDialog.emailPlaceholder}
              disabled={isSubmitting}
              required
              aria-invalid={showError || undefined}
            />
            {showError ? (
              <p className="text-xs text-destructive">{text.inviteDialog.invalidEmail}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {text.inviteDialog.cancel}
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {text.inviteDialog.submitting}
                </span>
              ) : (
                text.inviteDialog.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
