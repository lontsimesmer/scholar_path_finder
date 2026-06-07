import { Input } from "@/components/ui/input";
import { DashboardText, StudentProfile } from "@/lib/dashboard";

interface DashboardProfileFormFieldsProps {
  formData: StudentProfile;
  isDisabled: boolean;
  onFieldChange: (field: keyof StudentProfile, value: string) => void;
  text: DashboardText;
}

export const DashboardProfileFormFields = ({
  formData,
  isDisabled,
  onFieldChange,
  text,
}: DashboardProfileFormFieldsProps) => (
  <>
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {text.firstName}
        </label>
        <Input
          value={formData.first_name || ""}
          onChange={(event) => onFieldChange("first_name", event.target.value)}
          placeholder={text.firstNamePlaceholder}
          className="h-12 rounded-xl"
          autoComplete="given-name"
          disabled={isDisabled}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {text.lastName}
        </label>
        <Input
          value={formData.last_name || ""}
          onChange={(event) => onFieldChange("last_name", event.target.value)}
          placeholder={text.lastNamePlaceholder}
          className="h-12 rounded-xl"
          autoComplete="family-name"
          disabled={isDisabled}
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.birthDate}
      </label>
      <Input
        type="date"
        value={formData.birth_date || ""}
        onChange={(event) => onFieldChange("birth_date", event.target.value)}
        className="h-12 rounded-xl"
        max={new Date().toISOString().split("T")[0]}
        disabled={isDisabled}
      />
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.targetCountry}
      </label>
      <Input
        value={formData.target_country || ""}
        onChange={(event) => onFieldChange("target_country", event.target.value)}
        placeholder={text.targetCountryPlaceholder}
        className="h-12 rounded-xl"
        disabled={isDisabled}
      />
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.targetProgram}
      </label>
      <Input
        value={formData.target_program || ""}
        onChange={(event) => onFieldChange("target_program", event.target.value)}
        placeholder={text.targetProgramPlaceholder}
        className="h-12 rounded-xl"
        disabled={isDisabled}
      />
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {text.currentDegree}
      </label>
      <Input
        value={formData.current_degree || ""}
        onChange={(event) => onFieldChange("current_degree", event.target.value)}
        placeholder={text.currentDegreePlaceholder}
        className="h-12 rounded-xl"
        disabled={isDisabled}
      />
    </div>
  </>
);
