import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminTeamMember, AdminTeamText } from "@/lib/admin-team";

interface AdminTeamTableProps {
  admins: AdminTeamMember[];
  isLoading: boolean;
  currentEmail: string | null;
  dateFormatter: Intl.DateTimeFormat;
  text: AdminTeamText;
  onRemove: (admin: AdminTeamMember) => void;
}

export const AdminTeamTable = ({
  admins,
  isLoading,
  currentEmail,
  dateFormatter,
  text,
  onRemove,
}: AdminTeamTableProps) => (
  <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.columns.email}</TableHead>
          <TableHead className="w-52">{text.columns.createdAt}</TableHead>
          <TableHead className="w-40 text-right">{text.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={3} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : admins.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="py-16 text-center text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          admins.map((admin) => {
            const isSelf = currentEmail !== null && admin.email === currentEmail;
            return (
              <TableRow key={admin.email} className="align-middle">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{admin.email}</span>
                    {isSelf ? (
                      <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {text.badges.you}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateFormatter.format(new Date(admin.created_at))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(admin)}
                      disabled={isSelf}
                      className="text-destructive hover:bg-destructive/5 hover:text-destructive disabled:text-muted-foreground"
                      title={text.actions.remove}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {text.actions.remove}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  </div>
);
