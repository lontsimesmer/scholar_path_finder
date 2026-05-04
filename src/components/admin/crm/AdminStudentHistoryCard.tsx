import { History, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AdminStudentActivityLog,
  AdminStudentDetailText,
  getAdminStudentActivityDescription,
} from "@/lib/admin-student-detail";

interface AdminStudentHistoryCardProps {
  activityLogs: AdminStudentActivityLog[];
  applicationStatusLabels: Record<string, string>;
  dateFormatter: Intl.DateTimeFormat;
  isLoading: boolean;
  text: AdminStudentDetailText;
}

export const AdminStudentHistoryCard = ({
  activityLogs,
  applicationStatusLabels,
  dateFormatter,
  isLoading,
  text,
}: AdminStudentHistoryCardProps) => (
  <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <CardTitle>{text.historyTitle}</CardTitle>
        <CardDescription>{text.historyDescription}</CardDescription>
      </div>
      <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
        {activityLogs.length}
      </Badge>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        </div>
      ) : activityLogs.length === 0 ? (
        <p className="rounded-[1.5rem] border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
          {text.noHistory}
        </p>
      ) : (
        <div className="space-y-4">
          {activityLogs.map((activity) => {
            const activityDescription = getAdminStudentActivityDescription(
              activity,
              text,
              applicationStatusLabels,
            );
            const activityTitle =
              text.historyActions[activity.action_type] ||
              activity.action_label ||
              activity.action_type;

            return (
              <div key={activity.id} className="rounded-[1.5rem] border border-border/40 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{activityTitle}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {activity.admin_email}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(activity.created_at))}</p>
                </div>
                {activityDescription ? (
                  <div className="mt-4 border-l-2 border-primary/20 pl-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{activityDescription}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);
