import { NextResponse } from "next/server";

/**
 * Demo Configuration API
 * 
 * Returns the current demo mode configuration including limits and feature flags.
 * This endpoint is used by the DemoModeBanner and other demo-aware components.
 */

export async function GET() {
  // Check if we're in demo mode (default to true for demo apps)
  const isDemoMode = process.env.DEMO_MODE !== "false";
  
  // Demo limits from environment or defaults
  const maxTokens = parseInt(process.env.DEMO_MAX_TOKENS || "50000", 10);
  const maxDocuments = parseInt(process.env.DEMO_MAX_DOCUMENTS || "10", 10);
  const maxOcrPages = parseInt(process.env.DEMO_MAX_OCR_PAGES || "25", 10);
  
  // Feature flags
  const showUsageStats = process.env.DEMO_SHOW_USAGE_STATS !== "false";
  const showUpgradeCta = process.env.DEMO_SHOW_UPGRADE_CTA !== "false";
  const allowDocumentUpload = process.env.DEMO_ALLOW_DOCUMENT_UPLOAD !== "false";
  
  // Disabled features in demo mode
  const disabledFeatures = (process.env.DEMO_DISABLED_FEATURES || "")
    .split(",")
    .filter(Boolean);

  // For demo purposes, we'll use placeholder values for usage
  // In a real app, these would come from a database or session storage
  const tokensUsed = 0;
  const documentsUsed = 0;
  const ocrPagesUsed = 0;

  const config = {
    isDemoMode,
    appName: process.env.DEMO_APP_NAME || "Legal Doc Studio",
    limits: {
      maxTokens,
      maxDocuments,
      maxOcrPages,
    },
    features: {
      showUsageStats,
      showUpgradeCta,
      allowDocumentUpload,
    },
  };

  const limits = {
    tokens: { used: tokensUsed, max: maxTokens },
    documents: { used: documentsUsed, max: maxDocuments },
    ocrPages: { used: ocrPagesUsed, max: maxOcrPages },
  };

  const limitsSummary = {
    tokensUsed,
    tokensRemaining: maxTokens - tokensUsed,
    documentsUsed,
    documentsRemaining: maxDocuments - documentsUsed,
    ocrPagesUsed,
    ocrPagesRemaining: maxOcrPages - ocrPagesUsed,
  };

  return NextResponse.json({
    config,
    limits,
    limitsSummary,
    disabledFeatures,
  });
}
