import { NextResponse } from 'next/server';
import { DEMO_LIMITS, LIMIT_DESCRIPTIONS } from '@/lib/demo-limits/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = {
    isDemoMode: true,
    appName: 'Multi-Language Processor',
    upgradeUrl: 'https://case.dev',
    contactEmail: 'sales@case.dev',
    demoExpiryDays: 0,
    features: {
      bulkUpload: DEMO_LIMITS.features.bulkUpload,
      advancedExport: DEMO_LIMITS.features.advancedExport,
      premiumFeatures: DEMO_LIMITS.features.premiumFeatures,
    },
  };

  const limitsSummary = {
    tokens: [
      LIMIT_DESCRIPTIONS.tokens.perRequest,
      LIMIT_DESCRIPTIONS.tokens.perSession,
      LIMIT_DESCRIPTIONS.tokens.perDayPerUser,
    ],
    ocr: [
      LIMIT_DESCRIPTIONS.ocr.maxFileSize,
      LIMIT_DESCRIPTIONS.ocr.maxPagesPerDocument,
      LIMIT_DESCRIPTIONS.ocr.maxDocumentsPerSession,
      LIMIT_DESCRIPTIONS.ocr.maxPagesPerDay,
    ],
    features: [],
  };

  const disabledFeatures: string[] = [];
  if (!DEMO_LIMITS.features.bulkUpload) {
    disabledFeatures.push('Bulk document upload');
  }
  if (!DEMO_LIMITS.features.advancedExport) {
    disabledFeatures.push('Advanced export formats (PDF, DOCX)');
  }
  if (!DEMO_LIMITS.features.premiumFeatures) {
    disabledFeatures.push('Premium translation models');
  }

  return NextResponse.json({
    config,
    limits: DEMO_LIMITS,
    limitsSummary,
    disabledFeatures,
  });
}
