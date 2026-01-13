/**
 * Document Preview Component
 * 
 * Displays a preview of the generated document with filled-in variables.
 * Provides export options (PDF, DOCX, HTML) using the Case.dev Format API.
 */

'use client';

import { useState, useMemo } from 'react';
import { 
  Download, 
  FilePdf, 
  FileDoc, 
  FileHtml, 
  SpinnerGap,
  Eye,
  PencilSimple,
  Check,
  Warning
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { processTemplate, formatDocument, markdownToHtml } from '@/lib/case-api';
import type { DocumentTemplate, GeneratedDocument } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

interface DocumentPreviewProps {
  template: DocumentTemplate;
  values: Record<string, string | number | boolean>;
  documentName?: string;
  onEdit?: () => void;
  onSave?: (document: Omit<GeneratedDocument, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onExport?: (format: 'pdf' | 'docx' | 'html', blob: Blob | string) => void;
}

type ExportFormat = 'pdf' | 'docx' | 'html';

interface ExportState {
  isExporting: boolean;
  format: ExportFormat | null;
  error: string | null;
  success: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentPreview({
  template,
  values,
  documentName,
  onEdit,
  onSave,
  onExport,
}: DocumentPreviewProps) {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    format: null,
    error: null,
    success: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Process the template with values
  const processedContent = useMemo(() => {
    return processTemplate(template.content, values);
  }, [template.content, values]);

  // Convert to HTML for preview
  const htmlContent = useMemo(() => {
    return markdownToHtml(processedContent);
  }, [processedContent]);

  // Count filled vs total variables
  const variableStats = useMemo(() => {
    const allVariables = template.sections.flatMap(s => s.variables);
    const requiredVariables = allVariables.filter(v => v.required);
    const filledRequired = requiredVariables.filter(v => {
      const value = values[v.name];
      return value !== undefined && value !== '';
    });
    const filledOptional = allVariables.filter(v => {
      if (v.required) return false;
      const value = values[v.name];
      return value !== undefined && value !== '';
    });

    return {
      total: allVariables.length,
      required: requiredVariables.length,
      filledRequired: filledRequired.length,
      filledOptional: filledOptional.length,
      isComplete: filledRequired.length === requiredVariables.length,
    };
  }, [template.sections, values]);

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    setExportState({
      isExporting: true,
      format,
      error: null,
      success: false,
    });

    try {
      if (format === 'html') {
        // For HTML, we can generate it client-side
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentName || template.name}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      max-width: 8.5in;
      margin: 1in auto;
      padding: 0 0.5in;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 24px; text-align: center; margin-bottom: 24px; }
    h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
    h3 { font-size: 16px; margin-top: 18px; margin-bottom: 8px; }
    p { margin-bottom: 12px; text-align: justify; }
    .document-content { padding: 20px 0; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
        
        const blob = new Blob([fullHtml], { type: 'text/html' });
        downloadBlob(blob, `${documentName || template.name}.html`);
        
        if (onExport) {
          onExport('html', fullHtml);
        }

        setExportState({
          isExporting: false,
          format: null,
          error: null,
          success: true,
        });
      } else {
        // For PDF and DOCX, use the format API
        const result = await formatDocument({
          content: processedContent,
          format,
          options: {
            pageSize: 'letter',
            margins: { top: 72, bottom: 72, left: 72, right: 72 },
            headerText: documentName || template.name,
          },
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to generate document');
        }

        const blob = result.data as Blob;
        const extension = format === 'pdf' ? 'pdf' : 'docx';
        downloadBlob(blob, `${documentName || template.name}.${extension}`);

        if (onExport) {
          onExport(format, blob);
        }

        setExportState({
          isExporting: false,
          format: null,
          error: null,
          success: true,
        });
      }

      // Reset success state after 3 seconds
      setTimeout(() => {
        setExportState(prev => ({ ...prev, success: false }));
      }, 3000);
    } catch (error) {
      setExportState({
        isExporting: false,
        format: null,
        error: error instanceof Error ? error.message : 'Export failed',
        success: false,
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      onSave({
        templateId: template.id,
        templateName: template.name,
        name: documentName || `${template.name} - ${new Date().toLocaleDateString()}`,
        content: processedContent,
        variables: values,
        format: 'markdown',
        status: variableStats.isComplete ? 'final' : 'draft',
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Download helper
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {documentName || template.name}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={variableStats.isComplete ? 'default' : 'secondary'}>
              {variableStats.isComplete ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Complete
                </>
              ) : (
                <>
                  <Warning className="w-3 h-3 mr-1" />
                  {variableStats.filledRequired}/{variableStats.required} Required
                </>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {variableStats.filledRequired + variableStats.filledOptional} of {variableStats.total} fields filled
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <PencilSimple className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {onSave && (
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {saveSuccess ? 'Saved!' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Export options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={exportState.isExporting}
            >
              {exportState.isExporting && exportState.format === 'pdf' ? (
                <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FilePdf className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('docx')}
              disabled={exportState.isExporting}
            >
              {exportState.isExporting && exportState.format === 'docx' ? (
                <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDoc className="w-4 h-4 mr-2" />
              )}
              Export Word
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('html')}
              disabled={exportState.isExporting}
            >
              {exportState.isExporting && exportState.format === 'html' ? (
                <SpinnerGap className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileHtml className="w-4 h-4 mr-2" />
              )}
              Export HTML
            </Button>
          </div>

          {exportState.error && (
            <p className="text-sm text-destructive mt-3">
              {exportState.error}
            </p>
          )}

          {exportState.success && (
            <p className="text-sm text-green-600 mt-3 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Document exported successfully!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Document preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Document Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="prose prose-sm max-w-none bg-white border rounded-lg p-8 shadow-inner"
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              minHeight: '500px',
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              className="document-preview"
            />
          </div>
        </CardContent>
      </Card>

      {/* Variable summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Document Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {template.sections.map(section => (
              <div key={section.id} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.variables.map(variable => {
                    const value = values[variable.name];
                    const hasValue = value !== undefined && value !== '';
                    
                    return (
                      <div 
                        key={variable.id}
                        className="flex items-start justify-between text-sm"
                      >
                        <span className={hasValue ? '' : 'text-muted-foreground'}>
                          {variable.label}
                          {variable.required && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </span>
                        <span className={`ml-2 truncate max-w-[150px] ${
                          hasValue ? 'font-medium' : 'text-muted-foreground italic'
                        }`}>
                          {hasValue ? formatValue(value, variable.type) : 'Not set'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to format values for display
function formatValue(
  value: string | number | boolean,
  type: string
): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}

export default DocumentPreview;
