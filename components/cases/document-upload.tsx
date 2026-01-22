"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DocumentUploadProps {
  caseId: string;
  onUploadComplete?: () => void;
}

interface UploadedFile {
  file: File;
  status: "uploading" | "processing" | "success" | "error";
  error?: string;
  documentId?: string;
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

export function DocumentUpload({ caseId, onUploadComplete }: DocumentUploadProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [documentType, setDocumentType] = useState("paystub");
  const [isDragging, setIsDragging] = useState(false);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load connection string and API key from localStorage on mount
  useEffect(() => {
    const storedConnectionString = localStorage.getItem('bankruptcy_db_connection');
    const storedApiKey = localStorage.getItem('casedev_api_key');
    
    if (!storedConnectionString) {
      setConfigError('Database not initialized. Please go back to the dashboard.');
    } else if (!storedApiKey) {
      setConfigError('API key not found. Please log in again.');
    } else {
      setConnectionString(storedConnectionString);
      setApiKey(storedApiKey);
      setConfigError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [documentType, connectionString, apiKey]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (selectedFiles: File[]) => {
    if (!connectionString || !apiKey) {
      setConfigError('Missing configuration. Please refresh the page.');
      return;
    }

    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      file,
      status: "uploading" as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileIndex = files.length + i;

      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "uploading" as const } : f
          )
        );

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", caseId);
        formData.append("documentType", documentType);

        // Upload file with connectionString as query param and apiKey as header
        const response = await fetch(
          `/api/documents/upload?connectionString=${encodeURIComponent(connectionString)}`,
          {
            method: "POST",
            headers: {
              'x-api-key': apiKey,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();

        // Update status to processing (OCR)
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: "processing" as const,
                  documentId: data.documentId,
                }
              : f
          )
        );

        // Wait a moment for OCR to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Update status to success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "success" as const } : f
          )
        );
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: "error" as const,
                  error: error.message || "Upload failed. Please try again.",
                }
              : f
          )
        );
      }
    }

    // Call onUploadComplete callback if provided
    if (onUploadComplete) {
      onUploadComplete();
    }

    // Refresh the page after all uploads complete
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Show error if configuration is missing
  if (configError) {
    return (
      <div className="p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">{configError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Type Selection */}
      <div>
        <Label htmlFor="documentType" className="text-base mb-2 block">
          Document Type
        </Label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">Drop files here</p>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <Button type="button" onClick={() => document.getElementById("file-upload")?.click()}>
          Select Files
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
        </p>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Uploading Files</h3>
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
            >
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {uploadedFile.status === "uploading" && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Uploading...</span>
                  </div>
                )}
                {uploadedFile.status === "processing" && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Processing OCR...</span>
                  </div>
                )}
                {uploadedFile.status === "success" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Complete</span>
                  </div>
                )}
                {uploadedFile.status === "error" && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">{uploadedFile.error}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-muted rounded"
                  disabled={uploadedFile.status === "uploading"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
