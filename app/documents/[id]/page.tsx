'use client';

/**
 * Document View Page
 * 
 * Displays a generated document with preview and export options.
 * Loads document from IndexedDB by ID.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  SpinnerGap,
  FileText,
  Warning,
  PencilSimple,
  Trash,
  Calendar,
  Tag,
} from '@phosphor-icons/react';
import { DocumentPreview } from '@/components/documents/document-preview';
import { getDocument, deleteDocument, updateDocument } from '@/lib/storage/document-db';
import { getTemplateById } from '@/lib/templates';
import type { GeneratedDocument, DocumentTemplate } from '@/lib/types';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<GeneratedDocument | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load document on mount
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const doc = await getDocument(documentId);
        if (doc) {
          setDocument(doc);
          // Also load the template for reference
          const tmpl = getTemplateById(doc.templateId);
          if (tmpl) {
            setTemplate(tmpl);
          }
        } else {
          setError(`Document not found`);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // Handle document deletion
  const handleDelete = useCallback(async () => {
    if (!document) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDocument(document.id);
      router.push('/documents');
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document');
      setDeleting(false);
    }
  }, [document, router]);

  // Handle status change
  const handleStatusChange = useCallback(async (newStatus: GeneratedDocument['status']) => {
    if (!document) return;

    try {
      const updated = await updateDocument(document.id, { 
        status: newStatus,
      });
      if (updated) {
        setDocument({ ...document, status: newStatus, updatedAt: new Date() });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update document status');
    }
  }, [document]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: GeneratedDocument['status']) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'final':
        return 'default';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center py-16">
          <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state - document not found
  if (error && !document) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Warning className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/documents')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{document.name}</h1>
              <p className="text-muted-foreground mt-1">
                Based on: {document.templateName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/generate/${document.templateId}`)}
            >
              <PencilSimple className="h-4 w-4 mr-2" />
              Create New
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-destructive">
              <Warning className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document metadata */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(document.status)}>
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created: {formatDate(document.createdAt)}</span>
            </div>

            {document.updatedAt && document.updatedAt !== document.createdAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <PencilSimple className="h-4 w-4" />
                <span>Updated: {formatDate(document.updatedAt)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Template: {document.templateName}</span>
            </div>
          </div>

          {/* Status actions */}
          <div className="mt-4 pt-4 border-t flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Change status:</span>
            {document.status !== 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('draft')}
              >
                Mark as Draft
              </Button>
            )}
            {document.status !== 'final' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('final')}
              >
                Mark as Final
              </Button>
            )}
            {document.status !== 'archived' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('archived')}
              >
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Preview with Export Options */}
      {template ? (
        <DocumentPreview
          template={template}
          values={document.variables}
          documentName={document.name}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none bg-white border rounded-lg p-8 shadow-inner"
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                minHeight: '300px',
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: document.content.replace(/\n/g, '<br/>') }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables used */}
      {Object.keys(document.variables).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(document.variables).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className="text-sm">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
