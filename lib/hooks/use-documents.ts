"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDocumentsByCase,
  createDocument,
  deleteDocument as dbDeleteDocument,
  updateDocument,
  getProcessingJobsByDocument,
} from "@/lib/storage/discovery-db";
import { processDocument } from "@/lib/processing/document-pipeline";
import type { Document, ProcessingJob, UploadProgress } from "@/types/discovery";

// Local user ID for IndexedDB isolation
const LOCAL_USER_ID = "local-user";

interface UseDocumentsResult {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  uploadProgress: Map<string, UploadProgress>;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDocuments(caseId: string): UseDocumentsResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());

  // Load documents for case
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docs = await getDocumentsByCase(caseId);
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      loadDocuments();
    }
  }, [caseId, loadDocuments]);

  // Upload files
  const uploadFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      // Create document record
      const doc = await createDocument({
        caseId,
        uploadedBy: LOCAL_USER_ID,
        status: "pending",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Initialize progress tracking
      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.set(doc.id, {
          documentId: doc.id,
          fileName: file.name,
          stage: "pending",
          progress: 0,
        });
        return next;
      });

      // Add to documents list
      setDocuments((prev) => [doc, ...prev]);

      // Start processing pipeline
      try {
        await processDocument(doc.id, file, (progress) => {
          setUploadProgress((prev) => {
            const next = new Map(prev);
            next.set(doc.id, progress);
            return next;
          });

          // Update document in list when status changes
          if (progress.stage !== "pending") {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === doc.id
                  ? { ...d, status: progress.stage, errorMessage: progress.error }
                  : d
              )
            );
          }
        });

        // Remove from progress tracking after completion
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.delete(doc.id);
          return next;
        });

        // Refresh to get final state
        await loadDocuments();
      } catch (err) {
        console.error("Processing failed:", err);
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(doc.id, {
            documentId: doc.id,
            fileName: file.name,
            stage: "error",
            progress: 0,
            error: err instanceof Error ? err.message : "Processing failed",
          });
          return next;
        });
      }
    }
  }, [caseId, loadDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string) => {
    await dbDeleteDocument(documentId);
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    setUploadProgress((prev) => {
      const next = new Map(prev);
      next.delete(documentId);
      return next;
    });
  }, []);

  return {
    documents,
    isLoading,
    error,
    uploadProgress,
    uploadFiles,
    deleteDocument,
    refresh: loadDocuments,
  };
}
