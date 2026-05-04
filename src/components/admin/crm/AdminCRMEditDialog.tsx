import { FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminCRMFormData, AdminCRMStudent, AdminCRMText } from "@/lib/admin-crm";

interface AdminCRMEditDialogProps {
  formData: AdminCRMFormData;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onRequestCorrection: () => Promise<void>;
  onSave: (event: FormEvent) => Promise<void>;
  setFormData: (value: AdminCRMFormData) => void;
  student: AdminCRMStudent | null;
  text: AdminCRMText;
}

export const AdminCRMEditDialog = ({
  formData,
  isOpen,
  isSaving,
  onClose,
  onRequestCorrection,
  onSave,
  setFormData,
  student,
  text,
}: AdminCRMEditDialogProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90vh] max-w-md overflow-hidden rounded-[2rem] p-0">
      <DialogHeader className="border-b border-border/40 px-6 py-5 pr-14">
        <DialogTitle>{text.editDialogTitle}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(event) => void onSave(event)} className="flex max-h-[calc(90vh-4.5rem)] flex-col">
        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.firstName}
            </label>
            <Input
              value={formData.first_name}
              onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.lastName}
            </label>
            <Input
              value={formData.last_name}
              onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.birthDate}
            </label>
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(event) => setFormData({ ...formData, birth_date: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.targetCountry}
            </label>
            <Input
              value={formData.target_country}
              onChange={(event) => setFormData({ ...formData, target_country: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.targetProgram}
            </label>
            <Input
              value={formData.target_program}
              onChange={(event) => setFormData({ ...formData, target_program: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.currentDegree}
            </label>
            <Input
              value={formData.current_degree}
              onChange={(event) => setFormData({ ...formData, current_degree: event.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.correctionComment}
            </label>
            <Textarea
              value={formData.profile_validation_comment}
              onChange={(event) =>
                setFormData({ ...formData, profile_validation_comment: event.target.value })
              }
              placeholder={text.correctionCommentPlaceholder}
              className="rounded-xl"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {text.fields.generalNote}
            </label>
            <Textarea
              value={formData.general_notes}
              onChange={(event) => setFormData({ ...formData, general_notes: event.target.value })}
              placeholder={text.fields.generalNotePlaceholder}
              className="rounded-xl"
              rows={4}
            />
          </div>
        </div>

        <div className="border-t border-border/40 bg-white px-6 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-14 w-full rounded-xl px-4 py-4 text-center whitespace-normal leading-tight"
              disabled={isSaving || !student}
              onClick={() => void onRequestCorrection()}
            >
              {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
              {text.requestCorrection}
            </Button>
            <Button
              type="submit"
              className="h-auto min-h-14 w-full rounded-xl px-4 py-4 text-center whitespace-normal leading-tight"
              disabled={isSaving || !student}
            >
              {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
              {text.saveChanges}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);
