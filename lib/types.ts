/**
 * Legal Document Generation Studio - Type Definitions
 * 
 * Core TypeScript interfaces for document templates, variables,
 * generated documents, and form handling.
 */

// ============================================================================
// Template Types
// ============================================================================

/**
 * Represents a variable within a document template
 */
export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'boolean';
  required: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: string[]; // For select type
  helpText?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Represents a section within a document template
 */
export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  variables: TemplateVariable[];
  showIf?: {
    variableId: string;
    value: string | boolean;
  };
}

/**
 * Represents a complete document template
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'employment' | 'nda' | 'services' | 'lease' | 'corporate' | 'litigation';
  content: string; // Template content with Handlebars-like syntax
  sections: TemplateSection[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
  tags?: string[];
}

// ============================================================================
// Generated Document Types
// ============================================================================

/**
 * Represents a generated document stored in the client
 */
export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  content: string; // Markdown content with variables filled in
  variables: Record<string, string | number | boolean>;
  format: 'markdown' | 'html' | 'pdf' | 'docx';
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'final' | 'archived';
}

// ============================================================================
// Form/Questionnaire Types
// ============================================================================

/**
 * State for the questionnaire/form filling process
 */
export interface QuestionnaireState {
  templateId: string;
  currentSectionIndex: number;
  values: Record<string, string | number | boolean>;
  errors: Record<string, string>;
  isComplete: boolean;
  startedAt: Date;
  lastUpdatedAt: Date;
}

/**
 * Natural language input for AI-assisted form filling
 */
export interface NaturalLanguageInput {
  text: string;
  templateId: string;
  timestamp: Date;
}

/**
 * Parsed result from natural language input
 */
export interface ParsedInput {
  variables: Record<string, string | number | boolean>;
  confidence: number;
  suggestions?: string[];
  unmatchedText?: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to format a document via Case.dev API
 */
export interface FormatDocumentRequest {
  content: string;
  format: 'pdf' | 'docx' | 'html';
  options?: {
    pageSize?: 'letter' | 'a4';
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    headerText?: string;
    footerText?: string;
  };
}

/**
 * Response from document formatting
 */
export interface FormatDocumentResponse {
  success: boolean;
  data?: Blob | string;
  error?: string;
  format: 'pdf' | 'docx' | 'html';
}

/**
 * Request for natural language parsing
 */
export interface ParseNLRequest {
  text: string;
  templateId: string;
  variables: TemplateVariable[];
}

/**
 * Chat completion request for AI assistance
 */
export interface ChatCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Document generation wizard state
 */
export interface WizardState {
  step: 'select-template' | 'fill-form' | 'review' | 'generate' | 'complete';
  selectedTemplateId?: string;
  questionnaireState?: QuestionnaireState;
  generatedDocumentId?: string;
}

/**
 * Document list filter options
 */
export interface DocumentFilters {
  status?: GeneratedDocument['status'];
  templateId?: string;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Template category metadata
 */
export interface CategoryInfo {
  id: DocumentTemplate['category'];
  name: string;
  description: string;
  icon: string;
  count: number;
}
