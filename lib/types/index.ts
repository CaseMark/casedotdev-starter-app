// Supported languages for OCR and translation
// Currently limited to Latin alphabet languages only
export const SUPPORTED_LANGUAGES = {
  // Western European
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  // Central European
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  cs: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  ro: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  // Nordic
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  da: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  fi: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  no: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  is: { name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸' },
  // Other Latin-script languages
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  tl: { name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭' },
  // English (target language)
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Document processing status
export type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'detecting_language'
  | 'ocr_processing'
  | 'cleaning_text'
  | 'translating'
  | 'indexing'
  | 'completed'
  | 'error';

// Document model
export interface Document {
  id: string;
  filename: string;
  originalLanguage: LanguageCode;
  originalText: string;
  translatedText: string;
  pageCount: number;
  uploadedAt: string;
  processedAt?: string;
  status: ProcessingStatus;
  error?: string;
  confidence?: number;
}

// Search result
export interface SearchResult {
  documentId: string;
  filename: string;
  originalLanguage: LanguageCode;
  chunks: SearchChunk[];
}

export interface SearchChunk {
  text: string;
  translatedText?: string;
  pageNumber?: number;
  score: number;
  isOriginal: boolean;
}

// OCR response
export interface OCRResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text?: string;
  confidence?: number;
  page_count?: number;
  links?: {
    text: string;
    json: string;
    pdf: string;
  };
}

// Translation request/response
export interface TranslationRequest {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: 'en';
  preserveFormatting: boolean;
}

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage?: LanguageCode;
  confidence: number;
}

// Certified translation export
export interface CertifiedTranslation {
  documentId: string;
  originalFilename: string;
  originalLanguage: LanguageCode;
  translationDate: string;
  certificationStatement: string;
  originalText: string;
  translatedText: string;
  pageCount: number;
}

// API error
export interface APIError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}
