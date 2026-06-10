import { AdminCRMDocumentsManager } from "@/components/admin/crm/AdminCRMDocumentsManager";
import { AdminCRMStudentOverviewCards } from "@/components/admin/crm/AdminCRMStudentOverviewCards";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminCRMStudent, AdminCRMText, StudentDocument, StudentDocumentRequest } from "@/lib/admin-crm";
import { getStudentDisplayName } from "@/lib/student-profile";

interface AdminCRMStudentSheetProps {
  applicationStatusLabels: Record<string, string>;
  documents: StudentDocument[];
  documentRequests: StudentDocumentRequest[];
  isLoading: boolean;
  isRequestingDocument: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreateDocumentRequest: (title: string, description: string) => Promise<void>;
  onGetFileUrl: (path: string) => Promise<void>;
  onSetDocuments: (documents: StudentDocument[]) => void;
  onUpdateDoc: (docId: string, updates: Partial<StudentDocument>) => Promise<void>;
  student: AdminCRMStudent | null;
  text: AdminCRMText;
}

export const AdminCRMStudentSheet = ({
  applicationStatusLabels,
  documents,
  documentRequests,
  isLoading,
  isRequestingDocument,
  isOpen,
  onClose,
  onCreateDocumentRequest,
  onGetFileUrl,
  onSetDocuments,
  onUpdateDoc,
  student,
  text,
}: AdminCRMStudentSheetProps) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl">
      <DialogHeader>
        <DialogTitle>
          {text.sheet.title} {student ? getStudentDisplayName(student.profile, student.email) : ""}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-8 pt-4">
        {student ? (
          <AdminCRMStudentOverviewCards
            applicationStatusLabels={applicationStatusLabels}
            student={student}
            text={text}
          />
        ) : null}

        <AdminCRMDocumentsManager
          documents={documents}
          documentRequests={documentRequests}
          isLoading={isLoading}
          isRequestingDocument={isRequestingDocument}
          onCreateDocumentRequest={onCreateDocumentRequest}
          onGetFileUrl={onGetFileUrl}
          onSetDocuments={onSetDocuments}
          onUpdateDoc={onUpdateDoc}
          text={text}
        />
      </div>
    </DialogContent>
  </Dialog>
);
