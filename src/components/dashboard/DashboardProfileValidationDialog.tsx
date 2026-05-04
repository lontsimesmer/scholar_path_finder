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
import { DashboardText } from "@/lib/dashboard";

interface DashboardProfileValidationDialogProps {
  completionRedirectTarget: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  text: DashboardText;
}

export const DashboardProfileValidationDialog = ({
  completionRedirectTarget,
  isOpen,
  isSaving,
  onConfirm,
  onOpenChange,
  text,
}: DashboardProfileValidationDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent className="rounded-[2rem]">
      <AlertDialogHeader>
        <AlertDialogTitle>{text.confirmValidationTitle}</AlertDialogTitle>
        <AlertDialogDescription className="leading-7">
          {text.confirmValidationDescription}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
        {text.confirmValidationWarning}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSaving}>{text.confirmValidationCancel}</AlertDialogCancel>
        <AlertDialogAction
          disabled={isSaving}
          onClick={(event) => {
            event.preventDefault();
            void onConfirm();
          }}
        >
          {isSaving
            ? text.validationInProgress
            : completionRedirectTarget
              ? text.validateAndContinue
              : text.confirmValidationAction}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
