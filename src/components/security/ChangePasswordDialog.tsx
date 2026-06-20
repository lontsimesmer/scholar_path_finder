import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { MIN_PASSWORD_LENGTH, useSecurityText } from "@/components/security/security-text";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
  const text = useSecurityText();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast({
        title: text.errorTitle,
        description: text.errorTooShort,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: text.errorTitle,
        description: text.errorMismatch,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: text.errorTitle,
        description: error.message || text.errorGeneric,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: text.successTitle,
      description: text.successDescription,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[1.5rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {text.dialogTitle}
          </DialogTitle>
          <DialogDescription>{text.dialogDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{text.newPasswordLabel}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={text.newPasswordPlaceholder}
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? text.hidePasswordLabel : text.showPasswordLabel}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{text.confirmPasswordLabel}</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={text.confirmPasswordPlaceholder}
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {text.cancelLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {text.submittingLabel}
                </>
              ) : (
                text.submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
