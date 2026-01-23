'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FileText,
  Upload,
  DollarSign,
  Calculator,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { DocumentUpload } from "@/components/cases/document-upload";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { EditClientModal } from "@/components/cases/edit-client-modal";
import { OutboundCallModal } from "@/components/voice/outbound-call-modal";
import {
  getRequiredDocuments,
  getMissingDocuments,
  getDocumentCompletionPercentage,
} from "@/lib/bankruptcy/required-documents";
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
import { Button } from "@/components/ui/button";

interface CaseData {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  ssnLast4?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  caseType: string;
  filingType: string;
  householdSize?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  filingDate?: string;
}

interface Document {
  id: string;
  fileName: string;
  documentType: string;
  validationStatus: string;
  uploadedAt: string;
}

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAllMissingDocs, setShowAllMissingDocs] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [callPlaced, setCallPlaced] = useState(false);

  const handleDeleteCase = async () => {
    const connectionString = localStorage.getItem('bankruptcy_db_connection');
    if (!connectionString) {
      setError('Database connection not found');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete case');
      }

      router.push('/cases');
    } catch (err) {
      console.error('Error deleting case:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete case');
      setDeleting(false);
    }
  };

  useEffect(() => {
    const apiKey = localStorage.getItem('casedev_api_key');
    if (!apiKey) {
      router.push('/login');
      return;
    }

    const connectionString = localStorage.getItem('bankruptcy_db_connection');
    if (!connectionString) {
      setError('Database not initialized. Please log in again.');
      setLoading(false);
      return;
    }

    fetchCaseData(connectionString);
    fetchDocuments(connectionString);
  }, [id, router]);

  const fetchCaseData = async (connectionString: string) => {
    try {
      const response = await fetch(
        `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Case not found');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch case');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCaseData(data.case);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching case:', err);
      setError('Failed to fetch case data');
      setLoading(false);
    }
  };

  const fetchDocuments = async (connectionString: string) => {
    try {
      const response = await fetch(
        `/api/cases/${id}/documents?connectionString=${encodeURIComponent(connectionString)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      // Don't set error - documents are optional
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
        <Link href="/cases" className="text-primary hover:underline mt-4 inline-block">
          ← Back to Cases
        </Link>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-muted-foreground">Case not found</div>
        <Link href="/cases" className="text-primary hover:underline mt-4 inline-block">
          ← Back to Cases
        </Link>
      </div>
    );
  }

  const documentStats = {
    total: documents.length,
    valid: documents.filter((d) => d.validationStatus === "valid").length,
    pending: documents.filter((d) => d.validationStatus === "pending").length,
    invalid: documents.filter((d) => d.validationStatus === "invalid").length,
  };

  // Calculate document completion for Chapter 7
  const uploadedDocTypes = documents.map((d) => d.documentType);
  const missingDocs = getMissingDocuments(uploadedDocTypes);
  const completionPercentage = getDocumentCompletionPercentage(uploadedDocTypes);
  const hasAllRequiredDocs = missingDocs.length === 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Back Button and Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/cases')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOutboundModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call for Intake
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Case
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/cases" className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>{caseData.clientName}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl tracking-tight">
                {caseData.clientName}
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Client Info
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">
              {caseData.caseType === "chapter7" ? "Chapter 7" : "Chapter 13"}{" "}
              Bankruptcy Case
            </p>
          </div>
          <CaseStatusBadge status={caseData.status} />
        </div>
      </div>

      {/* Document Upload Reminder Banner */}
      {!hasAllRequiredDocs && caseData.status === 'intake' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                Required Documents Missing
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                {missingDocs.length} required document{missingDocs.length !== 1 ? 's' : ''} still needed to proceed with your Chapter 7 filing.
                Upload them to continue.
              </p>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-amber-700 mb-1">
                  <span>Document Completion</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Missing Documents List */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(showAllMissingDocs ? missingDocs : missingDocs.slice(0, 4)).map((doc) => (
                  <span
                    key={doc.type}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs"
                  >
                    <FileText className="w-3 h-3" />
                    {doc.name}
                  </span>
                ))}
                {missingDocs.length > 4 && !showAllMissingDocs && (
                  <button
                    onClick={() => setShowAllMissingDocs(true)}
                    className="text-xs text-amber-700 hover:text-amber-900 hover:underline font-medium cursor-pointer"
                  >
                    +{missingDocs.length - 4} more
                  </button>
                )}
                {showAllMissingDocs && missingDocs.length > 4 && (
                  <button
                    onClick={() => setShowAllMissingDocs(false)}
                    className="text-xs text-amber-700 hover:text-amber-900 hover:underline font-medium cursor-pointer"
                  >
                    Show less
                  </button>
                )}
              </div>

              <Link href={`/cases/${id}/documents`}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* All Documents Complete Banner */}
      {hasAllRequiredDocs && documents.length > 0 && caseData.status === 'intake' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">All Required Documents Uploaded</h3>
              <p className="text-sm text-green-700">
                You have uploaded all required documents. Review your financial data and run the means test.
              </p>
            </div>
            <Link href={`/cases/${id}/means-test`} className="ml-auto">
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                Run Means Test
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      <EditClientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        caseData={caseData}
        onSuccess={(updatedCase) => setCaseData(updatedCase)}
      />

      {/* Outbound Call Modal */}
      {caseData && (
        <OutboundCallModal
          open={outboundModalOpen}
          onOpenChange={setOutboundModalOpen}
          clientName={caseData.clientName}
          caseId={caseData.id}
          existingPhone={caseData.clientPhone}
          onCallScheduled={() => {
            // Show success notification
            setCallPlaced(true);
            setTimeout(() => setCallPlaced(false), 3000);

            // Refresh case data after call is scheduled
            const connectionString = localStorage.getItem('bankruptcy_db_connection');
            if (connectionString) {
              fetchCaseData(connectionString);
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the case for <strong>{caseData.clientName}</strong>?
              This action cannot be undone and will permanently remove all case data, documents, and forms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Case'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Call Placed Notification */}
      {callPlaced && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Call placed</span>
        </div>
      )}

      {/* Case Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-6 rounded border border-border">
          <h3 className="text-lg font-semibold mb-5">Client Information</h3>
          <dl className="space-y-2 text-sm">
            {caseData.clientEmail && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{caseData.clientEmail}</dd>
              </div>
            )}
            {caseData.clientPhone && (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{caseData.clientPhone}</dd>
              </div>
            )}
            {caseData.ssnLast4 && (
              <div>
                <dt className="text-muted-foreground">SSN</dt>
                <dd className="font-medium">***-**-{caseData.ssnLast4}</dd>
              </div>
            )}
            {caseData.householdSize && (
              <div>
                <dt className="text-muted-foreground">Household Size</dt>
                <dd className="font-medium">{caseData.householdSize}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-card p-6 rounded border border-border">
          <h3 className="text-lg font-semibold mb-5">Address</h3>
          <div className="text-sm">
            {caseData.address && <p>{caseData.address}</p>}
            {caseData.city && caseData.state && (
              <p>
                {caseData.city}, {caseData.state} {caseData.zip}
              </p>
            )}
            {caseData.county && (
              <p className="text-muted-foreground mt-1">
                {caseData.county} County
              </p>
            )}
          </div>
        </div>

        <div className="bg-card p-6 rounded border border-border">
          <h3 className="text-lg font-semibold mb-5">Case Details</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Filing Type</dt>
              <dd className="font-medium capitalize">{caseData.filingType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {new Date(caseData.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {caseData.filingDate && (
              <div>
                <dt className="text-muted-foreground">Filed</dt>
                <dd className="font-medium">
                  {new Date(caseData.filingDate).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href={`/cases/${id}/documents`}
          className="bg-card p-4 rounded border border-border hover:shadow-md transition-shadow hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Documents</div>
              <div className="text-sm text-muted-foreground">
                {documentStats.valid}/{documentStats.total} validated
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/financial`}
          className="bg-card p-4 rounded border border-border hover:shadow-md transition-shadow hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Financial Data</div>
              <div className="text-sm text-muted-foreground">
                Income, debts, assets
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/means-test`}
          className="bg-card p-4 rounded border border-border hover:shadow-md transition-shadow hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Means Test</div>
              <div className="text-sm text-muted-foreground">
                Chapter 7 eligibility
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/forms`}
          className="bg-card p-4 rounded border border-border hover:shadow-md transition-shadow hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Forms</div>
              <div className="text-sm text-muted-foreground">
                Generate & review
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Document Upload Section */}
      <div className="bg-card p-6 rounded border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <p className="text-sm text-muted-foreground">
              Upload client documents for automatic processing
            </p>
          </div>
        </div>

        <DocumentUpload caseId={id} />

        {/* Recent Documents */}
        {documents.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Recent Documents</h3>
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      doc.validationStatus === "valid"
                        ? "bg-green-100 text-green-700"
                        : doc.validationStatus === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {doc.validationStatus}
                  </span>
                </div>
              ))}
              {documents.length > 5 && (
                <Link
                  href={`/cases/${id}/documents`}
                  className="block text-center text-sm text-primary hover:underline py-2"
                >
                  View all {documents.length} documents →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
