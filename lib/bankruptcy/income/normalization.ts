/**
 * Income Normalization
 *
 * Converts income from various frequencies to annualized/monthly figures.
 * Handles different document types with appropriate strategies.
 */

import type {
  RawIncomeExtraction,
  NormalizedIncome,
  NormalizationResult,
} from './types';

/**
 * Annual multipliers for different pay frequencies
 */
export const ANNUAL_MULTIPLIERS: Record<string, number> = {
  annual: 1,
  monthly: 12,
  semi_monthly: 24,  // Twice per month (1st and 15th)
  biweekly: 26,      // Every two weeks
  weekly: 52,
  one_time: 1,       // Don't annualize one-time payments
};

/**
 * Convert an amount to annualized figure based on frequency
 */
export function annualizeAmount(amount: number, frequency: string): number {
  const multiplier = ANNUAL_MULTIPLIERS[frequency];
  if (!multiplier) {
    console.warn(`Unknown frequency: ${frequency}, defaulting to monthly`);
    return amount * 12;
  }
  return amount * multiplier;
}

/**
 * Convert annual amount to monthly
 */
export function monthlyFromAnnual(annual: number): number {
  return annual / 12;
}

/**
 * Get day of year for YTD extrapolation
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Normalize a pay stub extraction
 * Prioritizes YTD extrapolation when available as it accounts for raises, bonuses, etc.
 */
function normalizePaystub(extraction: RawIncomeExtraction): NormalizationResult {
  const notes: string[] = [];
  let annualizedGross: number;
  let annualizedNet: number | null = null;
  let method: NormalizationResult['method'];
  let confidence = extraction.extractionConfidence;

  // Prefer YTD extrapolation if available and we have a period end date
  if (extraction.ytdGross && extraction.ytdGross > 0 && extraction.periodEnd) {
    const periodEndDate = new Date(extraction.periodEnd);
    const dayOfYear = getDayOfYear(periodEndDate);

    // Extrapolate YTD to annual
    const ytdExtrapolated = (extraction.ytdGross / dayOfYear) * 365;

    // Also calculate direct multiplication for comparison
    const directMultiplied = annualizeAmount(extraction.rawAmount, extraction.frequency);

    // Calculate variance between the two methods
    const variance = directMultiplied > 0
      ? Math.abs(ytdExtrapolated - directMultiplied) / directMultiplied
      : 0;

    if (variance < 0.1) {
      // Within 10% - use YTD as it's more accurate
      annualizedGross = ytdExtrapolated;
      method = 'ytd_extrapolated';
      confidence *= 0.95; // High confidence when methods align
      notes.push(`YTD extrapolation matches direct calculation (${(variance * 100).toFixed(1)}% variance)`);
    } else if (variance < 0.25) {
      // Moderate variance - still use YTD but note the discrepancy
      annualizedGross = ytdExtrapolated;
      method = 'ytd_extrapolated';
      confidence *= 0.85;
      notes.push(`YTD extrapolation differs from direct calc by ${(variance * 100).toFixed(1)}% - possible raise, bonus, or variable hours`);
    } else {
      // Large variance - use direct multiplication, flag for review
      annualizedGross = directMultiplied;
      method = 'multiplied';
      confidence *= 0.7;
      notes.push(`Large variance (${(variance * 100).toFixed(1)}%) between YTD and direct calc - using direct multiplication`);
    }

    // Handle YTD net if available
    if (extraction.ytdNet && extraction.ytdNet > 0) {
      annualizedNet = (extraction.ytdNet / dayOfYear) * 365;
    }
  } else {
    // No YTD - use direct multiplication
    annualizedGross = annualizeAmount(extraction.rawAmount, extraction.frequency);
    method = 'multiplied';
    confidence *= 0.85;
  }

  // Handle gross vs net amount type
  const result: NormalizationResult = {
    annualizedGross,
    monthlyGross: annualizedGross / 12,
    annualizedNet,
    monthlyNet: annualizedNet ? annualizedNet / 12 : null,
    method,
    confidence,
    notes,
  };

  // If the raw amount is net (not gross), adjust
  if (extraction.amountType === 'net') {
    // We have net, not gross - swap the values
    result.annualizedNet = result.annualizedGross;
    result.monthlyNet = result.monthlyGross;
    // Estimate gross from net (typical ~25-30% deductions)
    result.annualizedGross = result.annualizedNet * 1.35;
    result.monthlyGross = result.annualizedGross / 12;
    result.confidence *= 0.7; // Lower confidence when estimating gross
    notes.push('Gross estimated from net amount (assumed ~26% deductions)');
  }

  return result;
}

/**
 * Normalize a bank statement deposit
 * Bank deposits are net (after deductions) - we can't determine exact gross
 */
function normalizeBankDeposit(extraction: RawIncomeExtraction): NormalizationResult {
  const notes: string[] = [];
  const confidence = extraction.extractionConfidence * 0.7; // Lower confidence for bank statements

  // Bank deposits are net income
  const annualizedNet = annualizeAmount(extraction.rawAmount, extraction.frequency);

  // Estimate gross from net (typical payroll deductions ~25-35%)
  // Use conservative estimate
  const estimatedGrossMultiplier = 1.30; // Assumes ~23% deductions
  const annualizedGross = annualizedNet * estimatedGrossMultiplier;

  notes.push('Bank deposit provides net income only');
  notes.push(`Gross estimated using ${((estimatedGrossMultiplier - 1) * 100).toFixed(0)}% deduction assumption`);

  return {
    annualizedGross,
    monthlyGross: annualizedGross / 12,
    annualizedNet,
    monthlyNet: annualizedNet / 12,
    method: 'deposit_pattern',
    confidence,
    notes,
  };
}

/**
 * Normalize a W-2 or tax return (already annual)
 */
function normalizeAnnualDocument(extraction: RawIncomeExtraction): NormalizationResult {
  return {
    annualizedGross: extraction.rawAmount,
    monthlyGross: extraction.rawAmount / 12,
    annualizedNet: null,
    monthlyNet: null,
    method: 'direct',
    confidence: extraction.extractionConfidence * 0.95, // High confidence for official docs
    notes: [],
  };
}

/**
 * Main normalization function
 * Routes to appropriate handler based on document type
 */
export function normalizeExtraction(extraction: RawIncomeExtraction): NormalizationResult {
  switch (extraction.documentType) {
    case 'w2':
    case 'tax_return':
      return normalizeAnnualDocument(extraction);

    case 'paystub':
      return normalizePaystub(extraction);

    case 'bank_statement':
      return normalizeBankDeposit(extraction);

    case '1099':
      // 1099s are typically annual
      return normalizeAnnualDocument(extraction);

    default:
      // Unknown type - use basic multiplication
      return {
        annualizedGross: annualizeAmount(extraction.rawAmount, extraction.frequency),
        monthlyGross: annualizeAmount(extraction.rawAmount, extraction.frequency) / 12,
        annualizedNet: null,
        monthlyNet: null,
        method: 'multiplied',
        confidence: extraction.extractionConfidence * 0.6,
        notes: ['Unknown document type - using basic multiplication'],
      };
  }
}

/**
 * Normalize employer name for matching
 * Handles abbreviations, suffixes, and truncation (common in bank statements)
 */
export function normalizeEmployerName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, '') // Remove punctuation
    .replace(/\b(INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|LP|LLP|PC|PLLC|NA|FSB)\b/g, '') // Remove business suffixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Determine if a document type is an annual summary document
 * Annual documents (W-2, tax return, 1099) represent full-year totals
 * Periodic documents (pay stubs, bank statements) represent specific periods
 */
function isAnnualDocumentType(documentType: RawIncomeExtraction['documentType']): boolean {
  return ['w2', 'tax_return', '1099'].includes(documentType);
}

/**
 * Extract the income year from an extraction
 * Priority: taxYear > periodEnd year > periodStart year > documentDate year > current year
 */
function getIncomeYear(extraction: RawIncomeExtraction): number {
  // For annual documents, prefer explicit tax year
  if (extraction.taxYear) {
    return extraction.taxYear;
  }

  // Try to get year from period end (most relevant for the income period)
  if (extraction.periodEnd) {
    const year = new Date(extraction.periodEnd).getFullYear();
    if (!isNaN(year) && year > 2000) return year;
  }

  // Try period start
  if (extraction.periodStart) {
    const year = new Date(extraction.periodStart).getFullYear();
    if (!isNaN(year) && year > 2000) return year;
  }

  // Fall back to document date
  if (extraction.documentDate) {
    const year = new Date(extraction.documentDate).getFullYear();
    if (!isNaN(year) && year > 2000) return year;
  }

  // Last resort: current year
  return new Date().getFullYear();
}

/**
 * Get the quarter (1-4) for a date, used for partial-year reconciliation
 */
function getQuarter(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return Math.ceil((date.getMonth() + 1) / 3);
}

/**
 * Create a NormalizedIncome record from a raw extraction
 */
export function createNormalizedIncome(
  extraction: RawIncomeExtraction,
  id: string
): NormalizedIncome {
  const result = normalizeExtraction(extraction);
  const isAnnual = isAnnualDocumentType(extraction.documentType);
  const incomeYear = getIncomeYear(extraction);

  return {
    id,
    extractionId: extraction.id,
    documentId: extraction.documentId,
    documentType: extraction.documentType,
    employerNormalized: normalizeEmployerName(extraction.payerName),
    employerOriginal: extraction.payerName,
    employerEIN: extraction.payerEIN,
    annualizedGross: result.annualizedGross,
    monthlyGross: result.monthlyGross,
    annualizedNet: result.annualizedNet,
    monthlyNet: result.monthlyNet,
    normalizationMethod: result.method,
    confidence: result.confidence,
    notes: result.notes,
    // Time period tracking
    incomeYear,
    isAnnualDocument: isAnnual,
    periodQuarter: isAnnual ? null : getQuarter(extraction.periodEnd),
    rawExtraction: extraction,
  };
}
