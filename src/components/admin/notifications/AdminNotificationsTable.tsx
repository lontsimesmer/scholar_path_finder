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
import type { AdminNotificationsText } from "@/lib/admin-notifications";

interface AdminNotificationsTableProps {
  emails: string[];
  isLoading: boolean;
  isRemoving: boolean;
  text: AdminNotificationsText;
  onRemove: (email: string) => void;
}

export const AdminNotificationsTable = ({
  emails,
  isLoading,
  isRemoving,
  text,
  onRemove,
}: AdminNotificationsTableProps) => (
  <div className="admin-table overflow-hidden rounded-xl border border-border/40 bg-white">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.columns.email}</TableHead>
          <TableHead className="w-40 text-right">{text.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={2} className="py-20 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            </TableCell>
          </TableRow>
        ) : emails.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2} className="py-16 text-center text-muted-foreground">
              {text.empty}
            </TableCell>
          </TableRow>
        ) : (
          emails.map((email) => {
            const isLast = emails.length === 1;
            return (
              <TableRow key={email} className="align-middle">
                <TableCell>
                  <span className="font-medium text-foreground">{email}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(email)}
                      disabled={isRemoving || isLast}
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
