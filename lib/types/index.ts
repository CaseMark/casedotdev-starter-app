// Supported languages for translation
// Supports all 100+ languages available via Google Translate
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
  // East Asian
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  // South Asian
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  // Middle Eastern
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  he: { name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  fa: { name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' },
  // Cyrillic
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  bg: { name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  sr: { name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  // Greek
  el: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  // Thai
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  // Additional languages
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  sq: { name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿' },
  eu: { name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾' },
  bs: { name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  ca: { name: 'Catalan', nativeName: 'Català', flag: '🇪🇸' },
  et: { name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  ka: { name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  kk: { name: 'Kazakh', nativeName: 'Қазақ', flag: '🇰🇿' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭' },
  lo: { name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  mk: { name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  mn: { name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲' },
  ne: { name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  si: { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
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
