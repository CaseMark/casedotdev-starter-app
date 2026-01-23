/**
 * Income Reconciliation Types
 *
 * These types support the income reconciliation system that corroborates
 * income from multiple document sources (pay stubs, W-2s, bank statements, tax returns).
 *
 * Key insight: Different documents represent the SAME income at different frequencies,
 * not additive income. We must reconcile, not sum.
 */

/**
 * Raw extraction from a single document before normalization.
 */
export interface RawIncomeExtraction {
  id: string;
  documentId: string;
  documentType: 'w2' | 'paystub' | 'bank_statement' | 'tax_return' | '1099';
  documentDate: string; // ISO date

  /** The income amount exactly as shown on document */
  rawAmount: number;

  /** Payment frequency as determined from document */
  frequency: 'annual' | 'monthly' | 'semi_monthly' | 'biweekly' | 'weekly' | 'one_time';

  /** For pay stubs: gross vs net */
  amountType: 'gross' | 'net' | 'unknown';

  /** Employer/payer identification */
  payerName: string;
  payerEIN?: string | null;

  /** Period this document covers */
  periodStart?: string | null;
  periodEnd?: string | null;

  /**
   * Tax year for annual documents (W-2, 1099, tax return)
   * For periodic documents, this is derived from periodEnd or documentDate
   */
  taxYear?: number | null;

  /** For bank statements: is this identifiable as payroll? */
  isPayrollDeposit?: boolean;
  depositDescription?: string | null;

  /** YTD figures if available (from pay stubs) */
  ytdGross?: number | null;
  ytdNet?: number | null;
  ytdFederalWithheld?: number | null;

  /** Pay stub specific */
  hoursWorked?: number | null;
  hourlyRate?: number | null;

  /** Extraction confidence from LLM (0-1) */
  extractionConfidence: number;

  /** Raw text snippet that was extracted from */
  sourceText?: string | null;
}

/**
 * Income normalized to standard annual/monthly figures.
 */
export interface NormalizedIncome {
  id: string;
  extractionId: string;
  documentId: string;
  documentType: RawIncomeExtraction['documentType'];

  /** Normalized employer name (for matching across documents) */
  employerNormalized: string;
  employerOriginal: string;
  employerEIN?: string | null;

  /** Calculated figures */
  annualizedGross: number;
  monthlyGross: number;

  /** If we have net info (bank statements, pay stubs) */
  annualizedNet?: number | null;
  monthlyNet?: number | null;

  /** How we calculated this */
  normalizationMethod: 'direct' | 'multiplied' | 'ytd_extrapolated' | 'deposit_pattern';

  /** Confidence in this normalization (0-1) */
  confidence: number;

  /** Warnings or notes */
  notes: string[];

  /**
   * Time period tracking for reconciliation
   */
  /** The year this income applies to */
  incomeYear: number;
  /** Whether this is an annual summary document (W-2, tax return, 1099) vs periodic (pay stub, bank statement) */
  isAnnualDocument: boolean;
  /** For periodic documents: which part of the year (Q1, Q2, etc.) - used for partial year reconciliation */
  periodQuarter?: number | null;

  /** Original extraction data for reference */
  rawExtraction: RawIncomeExtraction;
}

/**
 * Evidence from a single document supporting an income source.
 */
export interface IncomeEvidence {
  documentId: string;
  documentType: string;
  documentName: string;
  extractedAmount: number;
  extractedFrequency: string;
  annualizedAmount: number;
  confidence: number;
  periodCovered?: string | null;
}

/**
 * A single verified income source after reconciling multiple documents.
 * This is the final output used for means test calculations.
 */
export interface ReconciledIncomeSource {
  id: string;
  caseId: string;

  /** Employer/source identification */
  employerName: string;
  employerEIN?: string | null;
  incomeType: 'employment' | 'self_employment' | 'social_security' | 'pension' | 'rental' | 'other';

  /** The year this reconciled income applies to */
  incomeYear: number;

  /** Verified income figures */
  verifiedAnnualGross: number;
  verifiedMonthlyGross: number;
  verifiedAnnualNet?: number | null;
  verifiedMonthlyNet?: number | null;

  /** How this was determined */
  determinationMethod: 'single_source' | 'multi_source_match' | 'multi_source_averaged' | 'manual_override';

  /** All supporting evidence */
  evidence: IncomeEvidence[];

  /** Overall confidence score (0-1) */
  confidence: number;

  /** Reconciliation status */
  status: 'verified' | 'needs_review' | 'conflict' | 'manual';

  /** If there's a discrepancy */
  discrepancy?: {
    maxVariance: number;
    conflictingDocuments: string[];
    suggestedResolution: string;
  } | null;

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

/**
 * Aggregate income for a case, used in means test.
 */
export interface CaseIncomeSummary {
  caseId: string;

  /** All reconciled income sources */
  sources: ReconciledIncomeSource[];

  /** Totals across all sources */
  totalMonthlyGross: number;
  totalAnnualGross: number;
  totalMonthlyNet?: number | null;

  /** For means test - 6 month CMI */
  currentMonthlyIncome: number; // CMI = 6-month average

  /** Status */
  allSourcesReconciled: boolean;
  sourcesNeedingReview: string[];

  lastCalculatedAt: string;
}

/**
 * Result of normalizing a raw extraction
 */
export interface NormalizationResult {
  annualizedGross: number;
  monthlyGross: number;
  annualizedNet?: number | null;
  monthlyNet?: number | null;
  method: NormalizedIncome['normalizationMethod'];
  confidence: number;
  notes: string[];
}
