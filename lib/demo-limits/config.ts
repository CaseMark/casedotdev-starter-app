// Centralized demo limits configuration
// All limits can be overridden via environment variables

import type { DemoLimits } from '@/lib/types/demo-limits';

function parseEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Demo limits configuration
 * Can be overridden via environment variables:
 * - DEMO_TOKEN_PER_REQUEST
 * - DEMO_TOKEN_PER_SESSION
 * - DEMO_TOKEN_PER_DAY
 * - DEMO_SESSION_HOURS (default: 24)
 * - DEMO_SESSION_PRICE_LIMIT (default: 5)
 * - DEMO_OCR_MAX_FILE_SIZE (in bytes)
 * - DEMO_OCR_MAX_PAGES_PER_DOC
 * - DEMO_MAX_DOCUMENTS_PER_SESSION (default: 20)
 * - DEMO_OCR_MAX_PAGES_PER_DAY
 * - DEMO_FEATURE_BULK_UPLOAD
 * - DEMO_FEATURE_ADVANCED_EXPORT
 * - DEMO_FEATURE_PREMIUM
 */
export const DEMO_LIMITS: DemoLimits = {
  tokens: {
    perRequest: parseEnvInt('DEMO_TOKEN_PER_REQUEST', 4_000),
    perSession: parseEnvInt('DEMO_TOKEN_PER_SESSION', 50_000),
    perDayPerUser: parseEnvInt('DEMO_TOKEN_PER_DAY', 100_000),
  },
  pricing: {
    sessionHours: parseEnvInt('DEMO_SESSION_HOURS', 24),
    sessionPriceLimit: parseEnvFloat('DEMO_SESSION_PRICE_LIMIT', 5),
  },
  ocr: {
    maxFileSize: parseEnvInt('DEMO_OCR_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    maxPagesPerDocument: parseEnvInt('DEMO_OCR_MAX_PAGES_PER_DOC', 10),
    maxDocumentsPerSession: parseEnvInt('DEMO_MAX_DOCUMENTS_PER_SESSION', 20),
    maxPagesPerDay: parseEnvInt('DEMO_OCR_MAX_PAGES_PER_DAY', 50),
  },
  features: {
    bulkUpload: parseEnvBool('DEMO_FEATURE_BULK_UPLOAD', false),
    advancedExport: parseEnvBool('DEMO_FEATURE_ADVANCED_EXPORT', false),
    premiumFeatures: parseEnvBool('DEMO_FEATURE_PREMIUM', false),
  },
};

// Human-readable limit descriptions for UI
export const LIMIT_DESCRIPTIONS = {
  tokens: {
    perRequest: `${DEMO_LIMITS.tokens.perRequest.toLocaleString()} tokens per request`,
    perSession: `${DEMO_LIMITS.tokens.perSession.toLocaleString()} tokens per session`,
    perDayPerUser: `${DEMO_LIMITS.tokens.perDayPerUser.toLocaleString()} tokens per day`,
  },
  pricing: {
    sessionLimit: `$${DEMO_LIMITS.pricing.sessionPriceLimit.toFixed(2)} per ${DEMO_LIMITS.pricing.sessionHours}hr session`,
  },
  ocr: {
    maxFileSize: `${(DEMO_LIMITS.ocr.maxFileSize / (1024 * 1024)).toFixed(0)}MB max file size`,
    maxPagesPerDocument: `${DEMO_LIMITS.ocr.maxPagesPerDocument} pages per document`,
    maxDocumentsPerSession: `${DEMO_LIMITS.ocr.maxDocumentsPerSession} documents per session`,
    maxPagesPerDay: `${DEMO_LIMITS.ocr.maxPagesPerDay} pages per day`,
  },
};

// Upgrade CTA messages
export const UPGRADE_MESSAGES = {
  tokenLimit: {
    title: 'Token Limit Reached',
    description: 'You\'ve reached the demo token limit. Upgrade to unlock unlimited translations.',
    cta: 'Upgrade to Pro',
  },
  priceLimit: {
    title: 'Session Limit Reached',
    description: `You\'ve reached the $${DEMO_LIMITS.pricing.sessionPriceLimit.toFixed(2)} demo session limit. Upgrade to unlock unlimited processing.`,
    cta: 'Upgrade to Pro',
  },
  ocrLimit: {
    title: 'Document Limit Reached',
    description: 'You\'ve reached the demo document processing limit. Upgrade for unlimited document processing.',
    cta: 'Upgrade to Pro',
  },
  featureDisabled: {
    title: 'Premium Feature',
    description: 'This feature is available in the Pro version.',
    cta: 'Upgrade to Pro',
  },
};

export default DEMO_LIMITS;
