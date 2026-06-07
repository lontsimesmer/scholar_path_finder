import { Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StartProcedureText } from "@/lib/start-procedure";

interface ProcedureNextStepsCardProps {
  text: StartProcedureText;
}

export const ProcedureNextStepsCard = ({ text }: ProcedureNextStepsCardProps) => (
  <Card className="rounded-[2.5rem] border-border/40 bg-white/90 shadow-soft">
    <CardContent className="space-y-4 p-8 pt-8">
      <p className="text-sm font-semibold text-foreground">{text.nextStepsTitle}</p>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>1. {text.nextStepsProfile}</p>
        <p>2. {text.nextStepsSubmit}</p>
        <p>3. {text.nextStepsPayment}</p>
      </div>
      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm leading-7 text-foreground">
        <Phone size={16} className="mb-2 text-primary" />
        {text.supportHint}
      </div>
    </CardContent>
  </Card>
);
