'use client';

/**
 * Generate Document Page
 * 
 * Multi-step wizard for generating a document from a template.
 * Uses the FormWizard component and saves to IndexedDB.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SpinnerGap, FileText, Warning } from '@phosphor-icons/react';
import { FormWizard } from '@/components/documents/form-wizard';
import { getTemplateById } from '@/lib/templates';
import { saveDocument } from '@/lib/storage/document-db';
import { processTemplate } from '@/lib/case-api';
import type { DocumentTemplate, GeneratedDocument } from '@/lib/types';

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template on mount
  useEffect(() => {
    const loadTemplate = () => {
      try {
        const foundTemplate = getTemplateById(templateId);
        if (foundTemplate) {
          setTemplate(foundTemplate);
        } else {
          setError(`Template "${templateId}" not found`);
        }
      } catch (err) {
        console.error('Failed to load template:', err);
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // Handle form completion - generate document
  const handleComplete = useCallback(async (values: Record<string, string | number | boolean>) => {
    if (!template) return;

    setGenerating(true);
    setError(null);

    try {
      // Process the template with the provided values
      const content = processTemplate(template.content, values);

      // Create the generated document
      const now = new Date();
      const document: GeneratedDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        templateId: template.id,
        templateName: template.name,
        name: `${template.name} - ${now.toLocaleDateString()}`,
        content,
        variables: values,
        format: 'markdown',
        status: 'final',
        createdAt: now,
        updatedAt: now,
      };

      // Save to IndexedDB
      const saved = await saveDocument(document);
      
      if (saved) {
        // Navigate to the document view page
        router.push(`/documents/${document.id}`);
      } else {
        setError('Failed to save document. Please try again.');
        setGenerating(false);
      }
    } catch (err) {
      console.error('Failed to generate document:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate document');
      setGenerating(false);
    }
  }, [template, router]);

  // Handle cancel - go back to home
  const handleCancel = useCallback(() => {
    router.push('/');
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-16">
          <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state - template not found
  if (error && !template) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Warning className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Template Not Found</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Generating state
  if (generating) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-16 text-center">
              <SpinnerGap className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Generating Document</h2>
              <p className="text-muted-foreground">
                Processing your information and creating the document...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main form wizard
  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{template?.name}</h1>
            <p className="text-muted-foreground mt-1">
              {template?.description}
            </p>
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

      {/* Form Wizard */}
      {template && (
        <FormWizard
          template={template}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
