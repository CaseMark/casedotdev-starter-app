"use client";

import { useCallback, useState } from "react";
import { useDocuments } from "@/lib/hooks/use-documents";
import { Card, CardContent } from "@/components/ui/card";
import {
  CloudArrowUp,
  Spinner,
  X,
  FileText,
  FilePdf,
  FileImage,
  CheckCircle,
  Clock,
  Warning,
  Trash,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Document, DocumentStatus } from "@/types/discovery";

interface DocumentUploadZoneProps {
  caseId: string;
  showDocuments?: boolean;
}

export function DocumentUploadZone({ caseId, showDocuments = true }: DocumentUploadZoneProps) {
  const { documents, uploadFiles, uploadProgress, deleteDocument, isLoading } = useDocuments(caseId);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setIsUploading(true);
        try {
          await uploadFiles(files);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [uploadFiles]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setIsUploading(true);
        try {
          await uploadFiles(files);
        } finally {
          setIsUploading(false);
        }
      }
      // Reset input
      e.target.value = "";
    },
    [uploadFiles]
  );

  const handleDelete = async (documentId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      await deleteDocument(documentId);
    }
  };

  const activeUploads = Array.from(uploadProgress.values());

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-border hover:border-muted-foreground"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.txt,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <CloudArrowUp
              size={40}
              className={cn(
                "mb-3",
                isDragging ? "text-blue-500" : "text-muted-foreground"
              )}
            />
            <p className="text-base font-medium text-foreground mb-1">
              {isDragging ? "Drop files here" : "Drag and drop files"}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, images (PNG, JPG, TIFF), and text files
            </p>
          </label>
        </CardContent>
      </Card>

      {/* Active Uploads / Processing */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Processing</h4>
          {activeUploads.map((upload) => (
            <Card key={upload.documentId}>
              <CardContent className="py-3 flex items-center gap-4">
                <div className="w-8 h-8  bg-muted flex items-center justify-center">
                  {upload.stage === "error" ? (
                    <X size={18} className="text-red-500" />
                  ) : (
                    <Spinner size={18} className="text-muted-foreground animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {upload.fileName}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground capitalize">
                      {upload.stage === "error" ? (
                        <span className="text-red-500">{upload.error || "Error"}</span>
                      ) : (
                        getStageLabel(upload.stage)
                      )}
                    </p>
                    {upload.stage !== "error" && (
                      <div className="flex-1 h-1 bg-muted  overflow-hidden max-w-32">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document List */}
      {showDocuments && (
        <>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading documents...
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  Documents ({documents.length})
                </h4>
              </div>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  onDelete={() => handleDelete(doc.id, doc.fileName)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// Inline DocumentRow for immediate display
interface DocumentRowProps {
  document: Document;
  onDelete: () => void;
}

function DocumentRow({ document, onDelete }: DocumentRowProps) {
  const FileIcon = getFileIcon(document.fileType);
  const StatusIcon = getStatusIcon(document.status);
  const statusColor = getStatusColor(document.status);

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="py-3 flex items-center gap-4">
        {/* File Icon */}
        <div className="w-10 h-10  bg-muted flex items-center justify-center">
          <FileIcon size={22} className="text-muted-foreground" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">
            {document.fileName}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>·</span>
            <span>{formatDate(document.uploadedAt)}</span>
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 ${statusColor}`}>
          <StatusIcon
            size={16}
            className={document.status === "ocr" || document.status === "chunking" || document.status === "embedding" ? "animate-spin" : ""}
          />
          <span className="text-xs">{getStatusLabel(document.status)}</span>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center p-2  hover:bg-muted transition-colors">
            <DotsThreeVertical size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash size={16} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case "pending":
      return "Preparing...";
    case "ocr":
      return "Extracting text...";
    case "chunking":
      return "Processing text...";
    case "embedding":
      return "Generating embeddings...";
    case "completed":
      return "Complete";
    default:
      return stage;
  }
}

function getFileIcon(fileType: string) {
  if (fileType === "application/pdf") return FilePdf;
  if (fileType.startsWith("image/")) return FileImage;
  return FileText;
}

function getStatusIcon(status: DocumentStatus) {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "pending":
      return Clock;
    case "error":
      return Warning;
    default:
      return Spinner;
  }
}

function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "error":
      return "text-red-600";
    case "pending":
      return "text-muted-foreground";
    default:
      return "text-amber-600";
  }
}

function getStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "ocr":
      return "Extracting text";
    case "chunking":
      return "Processing";
    case "embedding":
      return "Indexing";
    case "completed":
      return "Ready";
    case "error":
      return "Error";
    default:
      return status;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
