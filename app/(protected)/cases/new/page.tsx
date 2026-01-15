"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useCases } from "@/lib/contexts/case-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  ArrowLeft,
  CloudArrowUp,
  FileText,
  FilePdf,
  FileImage,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createDocument } from "@/lib/storage/discovery-db";
import { processDocument } from "@/lib/processing/document-pipeline";

// Local user ID for IndexedDB isolation
const LOCAL_USER_ID = "local-user";

export default function NewCasePage() {
  const router = useRouter();
  const { createCase } = useCases();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setStagedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setStagedFiles((prev) => [...prev, ...files]);
    }
    e.target.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Case name is required");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      // Create the case
      const newCase = await createCase(name.trim(), description.trim() || undefined);

      // If there are staged files, start processing them (don't wait)
      if (stagedFiles.length > 0) {
        // Start processing files in the background
        processFilesInBackground(newCase.id, stagedFiles);
      }

      // Navigate to the case (documents will show processing status)
      router.push(`/cases/${newCase.id}/documents`);
    } catch (err) {
      console.error("Failed to create case:", err);
      setError("Failed to create case. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <>
      <AppHeader title="New Case" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back link */}
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Cases
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Create a New Case</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Field>
                  <FieldLabel htmlFor="name">Case Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g., Smith v. Johnson Discovery"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isCreating}
                  />
                  <FieldDescription>
                    Give your case a descriptive name to easily identify it later.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">
                    Description (optional)
                  </FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the case..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isCreating}
                    rows={3}
                  />
                  <FieldDescription>
                    Add notes or context about this case for reference.
                  </FieldDescription>
                </Field>

                {/* File Upload Section */}
                <Field>
                  <FieldLabel>Initial Documents (optional)</FieldLabel>
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
                    <CardContent className="py-6">
                      <label className="flex flex-col items-center justify-center cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.tiff,.txt,.doc,.docx"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={isCreating}
                        />
                        <CloudArrowUp
                          size={32}
                          className={cn(
                            "mb-2",
                            isDragging ? "text-blue-500" : "text-muted-foreground"
                          )}
                        />
                        <p className="text-sm font-medium text-foreground mb-1">
                          {isDragging ? "Drop files here" : "Drag and drop files"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          or click to browse
                        </p>
                      </label>
                    </CardContent>
                  </Card>
                  <FieldDescription>
                    Add documents now to start processing immediately after case creation.
                  </FieldDescription>
                </Field>

                {/* Staged Files List */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Files to upload ({stagedFiles.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stagedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 p-2  bg-muted/50"
                        >
                          <FileIcon fileType={file.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-muted "
                            disabled={isCreating}
                          >
                            <X size={16} className="text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-3">
                  <Link href="/cases">
                    <Button type="button" variant="ghost" disabled={isCreating}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isCreating || !name.trim()}>
                    {isCreating
                      ? stagedFiles.length > 0
                        ? "Creating & uploading..."
                        : "Creating..."
                      : stagedFiles.length > 0
                      ? `Create Case & Upload ${stagedFiles.length} File${stagedFiles.length > 1 ? "s" : ""}`
                      : "Create Case"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Helper to process files in the background after case creation
async function processFilesInBackground(caseId: string, files: File[]) {
  for (const file of files) {
    try {
      // Create document record
      const doc = await createDocument({
        caseId,
        uploadedBy: LOCAL_USER_ID,
        status: "pending",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Start processing (this runs in the background)
      processDocument(doc.id, file, () => {
        // Progress callback - could be used for notifications
      }).catch((err) => {
        console.error(`Failed to process ${file.name}:`, err);
      });
    } catch (err) {
      console.error(`Failed to create document for ${file.name}:`, err);
    }
  }
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === "application/pdf") {
    return <FilePdf size={20} className="text-muted-foreground shrink-0" />;
  }
  if (fileType.startsWith("image/")) {
    return <FileImage size={20} className="text-muted-foreground shrink-0" />;
  }
  return <FileText size={20} className="text-muted-foreground shrink-0" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
