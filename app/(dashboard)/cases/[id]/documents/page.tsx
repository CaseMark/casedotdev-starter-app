"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  Trash2,
  Loader2,
  X,
  ArrowLeft,
  Filter,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/cases/financial/delete-confirmation-modal";
import { Label } from "@/components/ui/label";
import { DocumentUploadWizard } from "@/components/cases/document-upload-wizard";

interface CaseData {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
}

interface Document {
  id: string;
  fileName: string;
  documentType: string | null;
  validationStatus: string;
  uploadedAt: string;
  fileUrl: string | null;
  vaultObjectId?: string | null;
}

const DOCUMENT_TYPES = [
  { value: "paystub", label: "Pay Stub" },
  { value: "w2", label: "W-2 Form" },
  { value: "tax_return", label: "Tax Return" },
  { value: "1099", label: "1099 Form" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "mortgage", label: "Mortgage Statement" },
  { value: "lease", label: "Lease Agreement" },
  { value: "utility", label: "Utility Bill" },
  { value: "insurance", label: "Insurance Statement" },
  { value: "credit_card", label: "Credit Card Statement" },
  { value: "loan_statement", label: "Loan Statement" },
  { value: "medical_bill", label: "Medical Bill" },
  { value: "collection_notice", label: "Collection Notice" },
  { value: "vehicle_title", label: "Vehicle Title" },
  { value: "property_deed", label: "Property Deed" },
  { value: "other", label: "Other" },
];

const REQUIRED_DOCUMENTS = [
  { type: "tax_return", label: "Tax Returns (Last 2 Years)", required: true },
  { type: "paystub", label: "Pay Stubs (Last 6 Months)", required: true },
  { type: "bank_statement", label: "Bank Statements (Last 6 Months)", required: true },
  { type: "mortgage", label: "Mortgage Statement or Lease", required: true },
  { type: "vehicle_title", label: "Vehicle Titles & Loan Statements", required: false },
  { type: "credit_card", label: "Credit Card Statements", required: true },
  { type: "medical_bill", label: "Medical Bills", required: false },
  { type: "utility", label: "Utility Bills", required: false },
];

export default function CaseDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload states
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [selectedUploadType, setSelectedUploadType] = useState("paystub");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{
    name: string;
    status: 'uploading' | 'processing' | 'validating' | 'done' | 'error';
    documentId?: string;
    progress?: number;
    statusMessage?: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const eventSourcesRef = useRef<Map<number, EventSource>>(new Map());

  // Filter state
  const [filterType, setFilterType] = useState<string>("all");

  // Action states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  // Guided upload wizard state
  const [showGuidedUpload, setShowGuidedUpload] = useState(false);

  const connectionString = typeof window !== 'undefined' ? localStorage.getItem("bankruptcy_db_connection") : null;
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem("casedev_api_key") : null;

  // Cleanup SSE connections on unmount
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((es) => es.close());
      eventSourcesRef.current.clear();
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!caseId || !connectionString) return;

    try {
      const docsResponse = await fetch(
        `/api/cases/${caseId}/documents?connectionString=${encodeURIComponent(connectionString)}`
      );

      if (docsResponse.ok) {
        const docsResult = await docsResponse.json();
        setDocuments(docsResult.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  }, [caseId, connectionString]);

  // Subscribe to SSE for document processing status
  const subscribeToDocumentStatus = useCallback(
    (documentId: string, fileIndex: number) => {
      if (!connectionString || !apiKey) return;

      const searchParams = new URLSearchParams({
        connectionString,
        apiKey,
      });

      const url = `/api/documents/${documentId}/status?${searchParams.toString()}`;
      const eventSource = new EventSource(url);
      eventSourcesRef.current.set(fileIndex, eventSource);

      eventSource.addEventListener("status", (event) => {
        try {
          const data = JSON.parse(event.data);

          setUploadingFiles((prev) =>
            prev.map((f, idx) => {
              if (idx !== fileIndex) return f;

              let status: typeof f.status = "processing";
              if (data.status === "completed") {
                status = "done";
              } else if (data.status === "error") {
                status = "error";
              } else if (data.status === "validating") {
                status = "validating";
              }

              return {
                ...f,
                status,
                progress: data.progress || f.progress,
                statusMessage: data.message,
              };
            })
          );

          // If completed, close connection and refresh documents
          if (data.status === "completed") {
            eventSource.close();
            eventSourcesRef.current.delete(fileIndex);

            // Check if all uploads are complete
            setTimeout(() => {
              setUploadingFiles((prev) => {
                const allDone = prev.every(f => f.status === "done" || f.status === "error");
                if (allDone) {
                  fetchDocuments();
                  return [];
                }
                return prev;
              });
            }, 1000);
          }
        } catch (e) {
          console.error("Failed to parse SSE event:", e);
        }
      });

      eventSource.addEventListener("error", () => {
        eventSource.close();
        eventSourcesRef.current.delete(fileIndex);
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourcesRef.current.delete(fileIndex);
      };
    },
    [connectionString, apiKey, fetchDocuments]
  );

  useEffect(() => {
    if (!caseId) return;

    if (!apiKey) {
      router.push("/login");
      return;
    }

    if (!connectionString) {
      setError("Database not provisioned. Please go to settings to set up your database.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const caseResponse = await fetch(
          `/api/cases/${caseId}?connectionString=${encodeURIComponent(connectionString)}`
        );

        if (!caseResponse.ok) {
          if (caseResponse.status === 404) {
            router.push("/cases");
            return;
          }
          throw new Error("Failed to fetch case");
        }

        const caseResult = await caseResponse.json();
        setCaseData(caseResult.case);

        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId, router, connectionString, apiKey, fetchDocuments]);

  const handleUpload = async (files: File[], documentType: string) => {
    if (!connectionString || !apiKey || !caseId) return;

    const startIndex = uploadingFiles.length;
    const newUploadingFiles = files.map(f => ({
      name: f.name,
      status: 'uploading' as const,
      progress: 0,
      statusMessage: 'Uploading...',
    }));
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = startIndex + i;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId);
        formData.append("documentType", documentType);

        const response = await fetch(
          `/api/documents/upload?connectionString=${encodeURIComponent(connectionString)}`,
          {
            method: "POST",
            headers: { 'x-api-key': apiKey },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();

        // Update status to processing and store document ID
        setUploadingFiles(prev =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: 'processing' as const,
                  documentId: data.documentId,
                  progress: 10,
                  statusMessage: 'Processing document...',
                }
              : f
          )
        );

        // Subscribe to SSE for real-time processing updates
        subscribeToDocumentStatus(data.documentId, fileIndex);
      } catch (err) {
        setUploadingFiles(prev =>
          prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'error' as const } : f)
        );
      }
    }

    setUploadingType(null);
  };

  const handleQuickUpload = (type: string) => {
    setUploadingType(type);
    quickUploadRef.current?.click();
  };

  const handleQuickUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && uploadingType) {
      handleUpload(Array.from(e.target.files), uploadingType);
    }
    if (quickUploadRef.current) {
      quickUploadRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files, selectedUploadType);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(Array.from(e.target.files), selectedUploadType);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!connectionString) return;

    setDownloadingId(doc.id);
    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/${doc.id}?connectionString=${encodeURIComponent(connectionString)}&action=download`,
        {
          headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();

      if (data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || doc.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc: Document) => {
    setViewingDocument(doc);
    setDocumentText(null);
    setLoadingText(true);

    if (!connectionString) {
      setLoadingText(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/${doc.id}?connectionString=${encodeURIComponent(connectionString)}&action=text`,
        {
          headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocumentText(data.text);
      }
    } catch (err) {
      console.error('Error fetching document text:', err);
    } finally {
      setLoadingText(false);
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete || !connectionString) return;

    const response = await fetch(
      `/api/cases/${caseId}/documents/${documentToDelete.id}?connectionString=${encodeURIComponent(connectionString)}&deleteFromVault=true`,
      {
        method: 'DELETE',
        headers: apiKey ? { 'x-casedev-api-key': apiKey } : {},
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    await fetchDocuments();
    setDocumentToDelete(null);
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <Link
            href="/cases"
            className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  const documentStats = {
    total: documents.length,
    valid: documents.filter((d) => d.validationStatus === "valid").length,
    pending: documents.filter((d) => d.validationStatus === "pending").length,
    invalid: documents.filter((d) => d.validationStatus === "invalid").length,
  };

  const getDocumentsByType = (type: string) =>
    documents.filter((d) => d.documentType === type);

  const missingRequiredDocs = REQUIRED_DOCUMENTS.filter(reqDoc => {
    const uploadedDocs = getDocumentsByType(reqDoc.type);
    return reqDoc.required && uploadedDocs.length === 0;
  });

  const missingDocTypes = missingRequiredDocs.map(d => d.type);

  const handleGuidedUploadComplete = () => {
    setShowGuidedUpload(false);
    fetchDocuments();
  };

  const uploadedRequiredDocs = REQUIRED_DOCUMENTS.filter(reqDoc => {
    const uploadedDocs = getDocumentsByType(reqDoc.type);
    return uploadedDocs.length > 0;
  });

  const filteredDocuments = filterType === "all"
    ? documents
    : documents.filter(d => d.documentType === filterType);

  const getDocTypeLabel = (type: string | null) => {
    if (!type) return "Unknown";
    const found = DOCUMENT_TYPES.find(dt => dt.value === type);
    return found ? found.label : type.replace(/_/g, " ");
  };

  // Show guided upload wizard
  if (showGuidedUpload && caseId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/cases" className="hover:text-foreground">
                Cases
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/cases/${caseId}`} className="hover:text-foreground">
                {caseData.clientName}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/cases/${caseId}/documents`} className="hover:text-foreground">
                Documents
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span>Guided Upload</span>
            </div>
            <h1 className="text-3xl tracking-tight mb-2">Upload Required Documents</h1>
            <p className="text-muted-foreground">
              Complete the remaining {missingRequiredDocs.length} required document{missingRequiredDocs.length !== 1 ? 's' : ''} for this case
            </p>
          </div>

          {/* Wizard Component */}
          <DocumentUploadWizard
            caseId={caseId}
            onComplete={handleGuidedUploadComplete}
            onSkip={() => setShowGuidedUpload(false)}
            documentTypes={missingDocTypes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Hidden file inputs */}
      <input
        ref={quickUploadRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleQuickUploadChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileSelect}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Document?"
        description={`Are you sure you want to delete "${documentToDelete?.fileName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{viewingDocument.fileName}</h2>
                <p className="text-sm text-muted-foreground">
                  {getDocTypeLabel(viewingDocument.documentType)} • Uploaded {new Date(viewingDocument.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewingDocument)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingText ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : documentText ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                    {documentText}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No text content available for this document.</p>
                  <p className="text-sm mt-2">
                    The document may still be processing or OCR text is not available.
                  </p>
                  <button
                    onClick={() => handleDownload(viewingDocument)}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Download Original File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/cases" className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/cases/${caseId}`} className="hover:text-foreground">
            {caseData.clientName}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>Documents</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push(`/cases/${caseId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground mt-1">
                Manage case documents and uploads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{documentStats.total}</div>
          <div className="text-sm text-muted-foreground">Total Documents</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{documentStats.valid}</div>
          <div className="text-sm text-muted-foreground">Validated</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{documentStats.pending}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
      </div>

      {/* Required Documents Section */}
      {missingRequiredDocs.length > 0 && (
        <div className="bg-card p-6 rounded-lg border mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Required Documents Needed</h2>
            <Button
              onClick={() => setShowGuidedUpload(true)}
              className="gap-2"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              Guided Upload
            </Button>
          </div>

          {/* Guided Upload Banner */}
          <div className="bg-accent/50 border border-primary/20 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Need help uploading?</p>
                <p className="text-sm text-muted-foreground">
                  Use guided upload to walk through each required document step by step
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowGuidedUpload(true)}
              variant="outline"
              size="sm"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              Start Guided Upload
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missingRequiredDocs.map((reqDoc) => (
              <div
                key={reqDoc.type}
                className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">{reqDoc.label}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickUpload(reqDoc.type)}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Required Documents */}
      {uploadedRequiredDocs.length > 0 && (
        <div className="bg-card p-6 rounded-lg border mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Completed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploadedRequiredDocs.map((reqDoc) => {
              const uploadedDocs = getDocumentsByType(reqDoc.type);
              return (
                <div
                  key={reqDoc.type}
                  className="flex items-center justify-between p-4 border border-green-200 bg-green-50/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <span className="text-sm font-medium">{reqDoc.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({uploadedDocs.length} uploaded)
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuickUpload(reqDoc.type)}
                    className="gap-2 text-muted-foreground"
                  >
                    <Upload className="w-4 h-4" />
                    Add more
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-card p-6 rounded-lg border mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Upload Documents</h2>

        {/* Document Type Selection */}
        <div className="mb-4 max-w-xs">
          <Label htmlFor="uploadType" className="mb-2 block">Document Type</Label>
          <select
            id="uploadType"
            value={selectedUploadType}
            onChange={(e) => setSelectedUploadType(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium mb-1">Drop files here</p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
          </p>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadingFiles.map((file, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  {file.status === 'uploading' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading
                    </span>
                  )}
                  {file.status === 'processing' && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {file.statusMessage || 'Processing'}
                    </span>
                  )}
                  {file.status === 'validating' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {file.statusMessage || 'Validating'}
                    </span>
                  )}
                  {file.status === 'done' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
                {/* Progress bar for processing files */}
                {(file.status === 'processing' || file.status === 'validating') && (
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${file.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Uploaded Documents</h2>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No documents {filterType !== "all" ? "of this type" : "uploaded yet"}</p>
            <p className="text-sm">Upload documents using the form above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => handleView(doc)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-muted rounded-lg group-hover:bg-background transition-colors">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getDocTypeLabel(doc.documentType)}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleView(doc)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                      title="Download"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(doc)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
