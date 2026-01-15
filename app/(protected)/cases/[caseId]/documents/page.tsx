"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { CaseNav } from "@/components/layout/case-nav";
import { useCases } from "@/lib/contexts/case-context";
import { DocumentUploadZone } from "@/components/documents/document-upload-zone";

export default function DocumentsPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { selectCase } = useCases();

  useEffect(() => {
    selectCase(caseId);
  }, [caseId, selectCase]);

  return (
    <>
      <AppHeader />
      <CaseNav caseId={caseId} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl text-foreground">Documents</h2>
            <p className="text-muted-foreground mt-1">
              Upload and manage documents for this case
            </p>
          </div>

          <DocumentUploadZone caseId={caseId} />
        </div>
      </div>
    </>
  );
}
