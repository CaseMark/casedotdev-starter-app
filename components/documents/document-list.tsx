/**
 * Document List Component
 * 
 * Displays a list of generated documents with filtering, search,
 * and management options (view, edit, delete, export).
 */

'use client';

import { useState, useMemo } from 'react';
import { 
  MagnifyingGlass,
  FunnelSimple,
  Plus,
  File,
  FilePdf,
  FileDoc,
  FileHtml,
  Trash,
  PencilSimple,
  Eye,
  DotsThree,
  Clock,
  CheckCircle,
  Archive,
  CaretDown
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GeneratedDocument, DocumentFilters } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

interface DocumentListProps {
  documents: GeneratedDocument[];
  onView?: (document: GeneratedDocument) => void;
  onEdit?: (document: GeneratedDocument) => void;
  onDelete?: (documentId: string) => void;
  onExport?: (document: GeneratedDocument, format: 'pdf' | 'docx' | 'html') => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentList({
  documents,
  onView,
  onEdit,
  onDelete,
  onExport,
  onCreateNew,
  isLoading = false,
}: DocumentListProps) {
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Apply status filter
    if (filters.status) {
      result = result.filter(doc => doc.status === filters.status);
    }

    // Apply template filter
    if (filters.templateId) {
      result = result.filter(doc => doc.templateId === filters.templateId);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.templateName.toLowerCase().includes(query)
      );
    }

    // Sort by most recent first
    result.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return result;
  }, [documents, filters, searchQuery]);

  // Get unique templates for filter
  const uniqueTemplates = useMemo(() => {
    const templates = new Map<string, string>();
    documents.forEach(doc => {
      templates.set(doc.templateId, doc.templateName);
    });
    return Array.from(templates.entries());
  }, [documents]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: documents.length,
      draft: documents.filter(d => d.status === 'draft').length,
      final: documents.filter(d => d.status === 'final').length,
      archived: documents.filter(d => d.status === 'archived').length,
    };
  }, [documents]);

  const getStatusIcon = (status: GeneratedDocument['status']) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-3 h-3" />;
      case 'final':
        return <CheckCircle className="w-3 h-3" />;
      case 'archived':
        return <Archive className="w-3 h-3" />;
    }
  };

  const getStatusVariant = (status: GeneratedDocument['status']): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'final':
        return 'default';
      case 'archived':
        return 'outline';
    }
  };

  const getFormatIcon = (format: GeneratedDocument['format']) => {
    switch (format) {
      case 'pdf':
        return <FilePdf className="w-4 h-4" />;
      case 'docx':
        return <FileDoc className="w-4 h-4" />;
      case 'html':
        return <FileHtml className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props) => (
                <Button {...props} variant="outline" className="gap-2">
                  <FunnelSimple className="w-4 h-4" />
                  {filters.status ? (
                    <span className="capitalize">{filters.status}</span>
                  ) : (
                    'Status'
                  )}
                  <CaretDown className="w-3 h-3" />
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilters(f => ({ ...f, status: undefined }))}>
                All ({statusCounts.all})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilters(f => ({ ...f, status: 'draft' }))}>
                <Clock className="w-4 h-4 mr-2" />
                Draft ({statusCounts.draft})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters(f => ({ ...f, status: 'final' }))}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Final ({statusCounts.final})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters(f => ({ ...f, status: 'archived' }))}>
                <Archive className="w-4 h-4 mr-2" />
                Archived ({statusCounts.archived})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Template filter */}
          {uniqueTemplates.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props) => (
                  <Button {...props} variant="outline" className="gap-2">
                    <File className="w-4 h-4" />
                    {filters.templateId ? (
                      <span className="max-w-[100px] truncate">
                        {uniqueTemplates.find(([id]) => id === filters.templateId)?.[1]}
                      </span>
                    ) : (
                      'Template'
                    )}
                    <CaretDown className="w-3 h-3" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilters(f => ({ ...f, templateId: undefined }))}>
                  All Templates
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {uniqueTemplates.map(([id, name]) => (
                  <DropdownMenuItem 
                    key={id}
                    onClick={() => setFilters(f => ({ ...f, templateId: id }))}
                  >
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Create new button */}
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          )}
        </div>
      </div>

      {/* Active filters */}
      {(filters.status || filters.templateId) && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filters:</span>
          {filters.status && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => setFilters(f => ({ ...f, status: undefined }))}
            >
              {filters.status} ×
            </Badge>
          )}
          {filters.templateId && (
            <Badge 
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setFilters(f => ({ ...f, templateId: undefined }))}
            >
              {uniqueTemplates.find(([id]) => id === filters.templateId)?.[1]} ×
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilters({})}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Document list */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <File className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-4">
              {documents.length === 0
                ? "You haven't created any documents yet."
                : "No documents match your current filters."}
            </p>
            {onCreateNew && documents.length === 0 && (
              <Button onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(document => (
            <Card 
              key={document.id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onView?.(document)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getFormatIcon(document.format)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {document.name}
                      </h3>
                      <Badge variant={getStatusVariant(document.status)}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1 capitalize">{document.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {document.templateName} • Updated {formatDate(document.updatedAt)} at {formatTime(document.updatedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {onView && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onView(document)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(document)}
                      >
                        <PencilSimple className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={(props) => (
                          <Button {...props} variant="ghost" size="sm">
                            <DotsThree className="w-4 h-4" />
                          </Button>
                        )}
                      />
                      <DropdownMenuContent align="end">
                        {onExport && (
                          <>
                            <DropdownMenuItem onClick={() => onExport(document, 'pdf')}>
                              <FilePdf className="w-4 h-4 mr-2" />
                              Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExport(document, 'docx')}>
                              <FileDoc className="w-4 h-4 mr-2" />
                              Export as Word
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExport(document, 'html')}>
                              <FileHtml className="w-4 h-4 mr-2" />
                              Export as HTML
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(document.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredDocuments.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      )}
    </div>
  );
}

export default DocumentList;
