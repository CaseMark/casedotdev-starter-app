// Types for demo limits tracking and enforcement

export interface TokenUsage {
  userId: string;
  sessionId: string;
  requestTokens: number;
  sessionTokens: number;
  dailyTokens: number;
  lastRequestAt: string; // ISO string
  dailyResetAt: string; // ISO string
}

export interface OCRUsage {
  userId: string;
  sessionId: string;
  sessionDocuments: number;
  sessionPages: number;
  dailyPages: number;
  dailyResetAt: string; // ISO string
}

export interface PriceUsage {
  userId: string;
  sessionId: string;
  sessionPrice: number; // Total price in dollars for the session
  sessionStartAt: string; // ISO string - when the session started
  sessionResetAt: string; // ISO string - when the session should reset
  lastRequestAt: string; // ISO string
  requestCount: number;
}

export interface DemoLimits {
  tokens: {
    perRequest: number;
    perSession: number;
    perDayPerUser: number;
  };
  pricing: {
    sessionHours: number;
    sessionPriceLimit: number; // dollars
  };
  ocr: {
    maxFileSize: number; // bytes
    maxPagesPerDocument: number;
    maxDocumentsPerSession: number;
    maxPagesPerDay: number;
  };
  features: {
    bulkUpload: boolean;
    advancedExport: boolean;
    premiumFeatures: boolean;
  };
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  remainingUsage?: number;
  suggestedAction?: string;
}

export interface UsageStats {
  tokens: {
    sessionUsed: number;
    sessionLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    percentUsed: number;
  };
  pricing: {
    sessionPriceUsed: number;
    sessionPriceLimit: number;
    percentUsed: number;
    timeRemaining: string; // e.g., "23h 45m"
  };
  ocr: {
    documentsUsed: number;
    documentsLimit: number;
    pagesUsed: number;
    dailyPagesUsed: number;
    dailyPagesLimit: number;
    percentUsed: number;
  };
}
