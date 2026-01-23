/**
 * Income Reconciliation Engine
 *
 * Reconciles income from multiple document sources into verified income figures.
 * Key insight: Different documents represent the SAME income, not additive income.
 *
 * Priority order (prioritizing pay stubs and bank statements per user requirement):
 * 1. Pay stubs (most frequent, shows both gross and net)
 * 2. Bank statements (corroborates net deposits)
 * 3. W-2 (annual, official)
 * 4. Tax returns (annual, official)
 * 5. 1099 forms
 */

import type {
  NormalizedIncome,
  ReconciledIncomeSource,
  CaseIncomeSummary,
  IncomeEvidence,
} from './types';
import {
  groupByEmployerAndYear,
  getBestEmployerName,
  getEmployerEIN,
} from './employer-matching';

/**
 * Variance thresholds for reconciliation
 */
const VARIANCE_THRESHOLD = 0.10;        // 10% - sources match closely
const HIGH_VARIANCE_THRESHOLD = 0.20;   // 20% - triggers conflict status

/**
 * Source priority for determining the "best" source when there's conflict.
 * Lower number = higher priority.
 * Prioritizing pay stubs and bank statements as requested.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  paystub: 1,           // Highest priority - shows gross, frequent
  bank_statement: 2,    // Second - corroborates net deposits
  w2: 3,                // Third - official but annual
  tax_return: 4,        // Fourth - official but annual
  '1099': 5,            // Fifth
};

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `reconciled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate variance statistics for a set of amounts
 */
function calculateVariance(amounts: number[]): { mean: number; maxVariance: number; stdDev: number } {
  if (amounts.length === 0) return { mean: 0, maxVariance: 0, stdDev: 0 };
  if (amounts.length === 1) return { mean: amounts[0], maxVariance: 0, stdDev: 0 };

  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const maxDiff = Math.max(...amounts.map(a => Math.abs(a - mean)));
  const maxVariance = mean > 0 ? maxDiff / mean : 0;

  // Standard deviation
  const squaredDiffs = amounts.map(a => Math.pow(a - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { mean, maxVariance, stdDev };
}

/**
 * Generate a resolution suggestion based on the discrepancy
 */
function generateResolutionSuggestion(
  group: NormalizedIncome[],
  variance: number,
  incomeYear: number
): string {
  const hasPaystub = group.some(g => g.documentType === 'paystub');
  const hasW2 = group.some(g => g.documentType === 'w2');
  const hasBankStatement = group.some(g => g.documentType === 'bank_statement');
  const hasAnnualDoc = group.some(g => g.isAnnualDocument);
  const hasPeriodicDoc = group.some(g => !g.isAnnualDocument);

  if (variance > 0.25) {
    return `Large discrepancy detected for ${incomeYear}. Please verify documents are for the same employer and time period. Consider requesting additional documentation.`;
  }

  // Check for partial year coverage
  if (hasPeriodicDoc && !hasAnnualDoc) {
    const quarters = new Set(group.filter(g => !g.isAnnualDocument).map(g => g.periodQuarter).filter(Boolean));
    if (quarters.size < 4) {
      return `Only partial year data available for ${incomeYear} (${quarters.size} quarter(s)). Annualized figures are estimates. W-2 would provide definitive annual total.`;
    }
  }

  // W-2 vs pay stub comparison
  if (hasW2 && hasPaystub) {
    const w2Income = group.find(g => g.documentType === 'w2');
    const paystubs = group.filter(g => g.documentType === 'paystub');
    if (w2Income && paystubs.length > 0) {
      return `W-2 for ${incomeYear} shows different amount than annualized pay stubs. This may be due to raises, bonuses, or variable hours throughout the year. W-2 is the official annual total.`;
    }
  }

  if (!hasPaystub && !hasBankStatement) {
    return `Only annual documents available for ${incomeYear}. Request recent pay stubs or bank statements for more accurate verification.`;
  }

  if (hasPaystub && hasBankStatement) {
    // Check if discrepancy is gross vs net
    const paystubIncome = group.find(g => g.documentType === 'paystub');
    const bankIncome = group.find(g => g.documentType === 'bank_statement');

    if (paystubIncome && bankIncome) {
      const paystubNet = paystubIncome.annualizedNet || paystubIncome.annualizedGross * 0.75;
      const bankNet = bankIncome.annualizedNet || bankIncome.annualizedGross;

      const netVariance = Math.abs(paystubNet - bankNet) / Math.max(paystubNet, bankNet);
      if (netVariance < 0.1) {
        return 'Gross and net amounts align when accounting for deductions. Income verified.';
      }
    }
  }

  if (hasPaystub && !hasW2) {
    return `Variance in ${incomeYear} may be due to raises, bonuses, or variable hours. W-2 would provide definitive annual total.`;
  }

  if (hasBankStatement && !hasPaystub) {
    return 'Bank deposits show net income only. Pay stubs would clarify gross income and deductions.';
  }

  return 'Review documents to confirm amounts. Minor variance may be due to rounding or timing differences.';
}

/**
 * Reconcile a group of income records from the same employer AND year
 *
 * Time-aware reconciliation logic:
 * - If we have a W-2/annual doc, it represents the definitive annual total
 * - Pay stubs from the same year should corroborate (not add to) the W-2
 * - If annualized pay stubs match W-2 within threshold, high confidence
 * - If they differ significantly, flag for review (could be raises, bonuses, etc.)
 */
function reconcileEmployerYearGroup(
  caseId: string,
  group: NormalizedIncome[],
  incomeYear: number
): ReconciledIncomeSource {
  // Separate annual documents from periodic documents
  const annualDocs = group.filter(g => g.isAnnualDocument);
  const periodicDocs = group.filter(g => !g.isAnnualDocument);

  // Sort by source priority (pay stubs first, then bank statements, etc.)
  const sorted = [...group].sort((a, b) =>
    (SOURCE_PRIORITY[a.documentType] || 99) - (SOURCE_PRIORITY[b.documentType] || 99)
  );

  // Determine status, verified amount, and method
  let status: ReconciledIncomeSource['status'];
  let verifiedAnnualGross: number;
  let verifiedAnnualNet: number | null = null;
  let determinationMethod: ReconciledIncomeSource['determinationMethod'];
  let confidence: number;
  let notes: string[] = [];

  // CASE 1: We have an annual document (W-2, tax return, 1099)
  if (annualDocs.length > 0) {
    // W-2 is the authoritative source for the year
    const annualDoc = annualDocs[0];
    verifiedAnnualGross = annualDoc.annualizedGross;
    verifiedAnnualNet = annualDoc.annualizedNet ?? null;
    confidence = annualDoc.confidence;

    if (periodicDocs.length > 0) {
      // Compare annualized periodic docs against the annual doc
      const periodicGrossAmounts = periodicDocs.map(d => d.annualizedGross).filter(a => a > 0);
      const periodicMean = periodicGrossAmounts.length > 0
        ? periodicGrossAmounts.reduce((a, b) => a + b, 0) / periodicGrossAmounts.length
        : 0;

      if (periodicMean > 0) {
        const variance = Math.abs(verifiedAnnualGross - periodicMean) / Math.max(verifiedAnnualGross, periodicMean);

        if (variance <= VARIANCE_THRESHOLD) {
          // Pay stubs corroborate W-2 - high confidence!
          status = 'verified';
          determinationMethod = 'multi_source_match';
          confidence = Math.min(1.0, confidence * 1.15);
          notes.push(`${annualDoc.documentType.toUpperCase()} corroborated by ${periodicDocs.length} periodic document(s)`);
        } else if (variance <= HIGH_VARIANCE_THRESHOLD) {
          // Moderate variance - W-2 is still authoritative but flag for review
          status = 'needs_review';
          determinationMethod = 'multi_source_averaged';
          notes.push(`${annualDoc.documentType.toUpperCase()} differs from annualized pay stubs by ${(variance * 100).toFixed(1)}%`);
        } else {
          // Large variance - flag as conflict
          status = 'conflict';
          determinationMethod = 'multi_source_averaged';
          confidence *= 0.7;
          notes.push(`Large variance (${(variance * 100).toFixed(1)}%) between ${annualDoc.documentType.toUpperCase()} and pay stubs`);
        }
      } else {
        // No valid periodic amounts to compare
        status = annualDoc.confidence >= 0.7 ? 'verified' : 'needs_review';
        determinationMethod = 'single_source';
      }
    } else {
      // Only annual document(s), no periodic docs to corroborate
      status = annualDoc.confidence >= 0.7 ? 'verified' : 'needs_review';
      determinationMethod = 'single_source';
      notes.push(`Based on ${annualDoc.documentType.toUpperCase()} only`);
    }
  }
  // CASE 2: Only periodic documents (pay stubs, bank statements)
  else if (periodicDocs.length > 0) {
    // Get all annualized gross amounts
    const grossAmounts = periodicDocs.map(e => e.annualizedGross).filter(a => a > 0);
    const netAmounts = periodicDocs.map(e => e.annualizedNet).filter((a): a is number => a !== null && a !== undefined && a > 0);

    const grossStats = calculateVariance(grossAmounts);
    const netStats = calculateVariance(netAmounts);

    // Check coverage - do we have data for the full year?
    const quarters = new Set(periodicDocs.map(d => d.periodQuarter).filter(Boolean));
    const hasFullYearCoverage = quarters.size >= 3; // At least 3 quarters

    if (periodicDocs.length === 1) {
      // Single source
      verifiedAnnualGross = periodicDocs[0].annualizedGross || 0;
      verifiedAnnualNet = periodicDocs[0].annualizedNet ?? null;
      status = periodicDocs[0].confidence >= 0.7 ? 'verified' : 'needs_review';
      determinationMethod = 'single_source';
      confidence = periodicDocs[0].confidence;
      if (!hasFullYearCoverage) {
        notes.push('Annualized from partial year data');
        confidence *= 0.85;
      }
    } else if (grossStats.maxVariance <= VARIANCE_THRESHOLD) {
      // Multiple sources match closely
      verifiedAnnualGross = grossStats.mean;
      verifiedAnnualNet = netStats.mean || null;
      status = 'verified';
      determinationMethod = 'multi_source_match';
      confidence = Math.min(1.0, Math.max(...periodicDocs.map(g => g.confidence)) * 1.15);
      if (!hasFullYearCoverage) {
        notes.push('Annualized from partial year data');
      }
    } else if (grossStats.maxVariance <= HIGH_VARIANCE_THRESHOLD) {
      // Moderate variance - use highest priority source
      const primarySource = sorted.find(s => !s.isAnnualDocument) || sorted[0];
      verifiedAnnualGross = primarySource.annualizedGross;
      verifiedAnnualNet = primarySource.annualizedNet ?? null;
      status = 'needs_review';
      determinationMethod = 'multi_source_averaged';
      confidence = primarySource.confidence * 0.85;
    } else {
      // High variance - conflict
      const primarySource = sorted.find(s => !s.isAnnualDocument) || sorted[0];
      verifiedAnnualGross = primarySource.annualizedGross;
      verifiedAnnualNet = primarySource.annualizedNet ?? null;
      status = 'conflict';
      determinationMethod = 'multi_source_averaged';
      confidence = primarySource.confidence * 0.6;
    }

    // Special case: Check if pay stub gross/bank statement net align
    if (status === 'needs_review' || status === 'conflict') {
      const paystubSource = periodicDocs.find(s => s.documentType === 'paystub');
      const bankSource = periodicDocs.find(s => s.documentType === 'bank_statement');

      if (paystubSource && bankSource && paystubSource.annualizedNet && bankSource.annualizedNet) {
        const netVariance = Math.abs(paystubSource.annualizedNet - bankSource.annualizedNet) /
          Math.max(paystubSource.annualizedNet, bankSource.annualizedNet);

        if (netVariance < VARIANCE_THRESHOLD) {
          // Net amounts align! This corroborates the pay stub gross
          status = 'verified';
          confidence = Math.min(1.0, paystubSource.confidence * 1.1);
          verifiedAnnualGross = paystubSource.annualizedGross;
          verifiedAnnualNet = paystubSource.annualizedNet;
          notes.push('Pay stub gross corroborated by bank statement net deposits');
        }
      }
    }
  } else {
    // No documents at all (shouldn't happen, but handle gracefully)
    verifiedAnnualGross = 0;
    verifiedAnnualNet = null;
    status = 'needs_review';
    determinationMethod = 'single_source';
    confidence = 0;
  }

  // Build evidence array with year context
  const evidence: IncomeEvidence[] = group.map(e => ({
    documentId: e.documentId,
    documentType: e.documentType,
    documentName: `${e.documentType} - ${e.employerOriginal} (${incomeYear})`,
    extractedAmount: e.rawExtraction.rawAmount,
    extractedFrequency: e.rawExtraction.frequency,
    annualizedAmount: e.annualizedGross,
    confidence: e.confidence,
    periodCovered: e.isAnnualDocument
      ? `${incomeYear} (annual)`
      : e.rawExtraction.periodStart && e.rawExtraction.periodEnd
        ? `${e.rawExtraction.periodStart} to ${e.rawExtraction.periodEnd}`
        : `${incomeYear}`,
  }));

  // Build discrepancy info if needed
  let discrepancy: ReconciledIncomeSource['discrepancy'] | null = null;
  if (status === 'needs_review' || status === 'conflict') {
    const grossAmounts = group.map(e => e.annualizedGross).filter(a => a > 0);
    const grossStats = calculateVariance(grossAmounts);

    discrepancy = {
      maxVariance: grossStats.maxVariance,
      conflictingDocuments: group.map(g => g.documentId),
      suggestedResolution: generateResolutionSuggestion(group, grossStats.maxVariance, incomeYear),
    };
  }

  // Determine employer name and EIN
  const employerName = getBestEmployerName(group);
  const employerEIN = getEmployerEIN(group);

  // Determine income type
  let incomeType: ReconciledIncomeSource['incomeType'] = 'employment';
  const firstSource = sorted[0];
  if (firstSource.rawExtraction.documentType === '1099') {
    incomeType = 'self_employment';
  }

  return {
    id: generateId(),
    caseId,
    employerName,
    employerEIN,
    incomeType,
    incomeYear,
    verifiedAnnualGross,
    verifiedMonthlyGross: verifiedAnnualGross / 12,
    verifiedAnnualNet,
    verifiedMonthlyNet: verifiedAnnualNet ? verifiedAnnualNet / 12 : null,
    determinationMethod,
    evidence,
    confidence: Math.min(confidence, 1),
    status,
    discrepancy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate summary totals from reconciled sources
 *
 * For the means test, we use the most recent year's income for each employer.
 * If the same employer has income for multiple years, only the most recent counts.
 */
function calculateSummary(
  caseId: string,
  sources: ReconciledIncomeSource[]
): CaseIncomeSummary {
  // Group sources by employer to get only the most recent year per employer
  const employerLatest = new Map<string, ReconciledIncomeSource>();

  for (const source of sources) {
    const key = source.employerEIN || source.employerName.toLowerCase();
    const existing = employerLatest.get(key);

    if (!existing || source.incomeYear > existing.incomeYear) {
      employerLatest.set(key, source);
    }
  }

  // Calculate totals using only the most recent year per employer
  const latestSources = Array.from(employerLatest.values());
  const totalAnnualGross = latestSources.reduce((sum, s) => sum + s.verifiedAnnualGross, 0);
  const totalMonthlyGross = totalAnnualGross / 12;

  const totalAnnualNet = latestSources.reduce((sum, s) => sum + (s.verifiedAnnualNet || 0), 0);
  const totalMonthlyNet = totalAnnualNet > 0 ? totalAnnualNet / 12 : null;

  const sourcesNeedingReview = sources
    .filter(s => s.status === 'needs_review' || s.status === 'conflict')
    .map(s => s.id);

  return {
    caseId,
    sources, // Include all sources for display, but totals use latest per employer
    totalMonthlyGross,
    totalAnnualGross,
    totalMonthlyNet,
    currentMonthlyIncome: totalMonthlyGross, // CMI for means test
    allSourcesReconciled: sourcesNeedingReview.length === 0,
    sourcesNeedingReview,
    lastCalculatedAt: new Date().toISOString(),
  };
}

/**
 * Main reconciliation function
 * Takes normalized income records and produces reconciled income sources
 */
export interface ReconciliationInput {
  caseId: string;
  normalizedIncomes: NormalizedIncome[];
}

export interface ReconciliationOutput {
  sources: ReconciledIncomeSource[];
  summary: CaseIncomeSummary;
}

export function reconcileIncome(input: ReconciliationInput): ReconciliationOutput {
  const { caseId, normalizedIncomes } = input;

  if (normalizedIncomes.length === 0) {
    return {
      sources: [],
      summary: {
        caseId,
        sources: [],
        totalMonthlyGross: 0,
        totalAnnualGross: 0,
        totalMonthlyNet: null,
        currentMonthlyIncome: 0,
        allSourcesReconciled: true,
        sourcesNeedingReview: [],
        lastCalculatedAt: new Date().toISOString(),
      },
    };
  }

  // Group by employer AND year for time-aware reconciliation
  const employerYearGroups = groupByEmployerAndYear(normalizedIncomes);

  // Reconcile each employer-year group
  const sources: ReconciledIncomeSource[] = [];

  for (const [employerKey, yearMap] of employerYearGroups) {
    for (const [year, group] of yearMap) {
      const reconciled = reconcileEmployerYearGroup(caseId, group, year);
      sources.push(reconciled);
    }
  }

  // Sort by year (most recent first), then by employer
  sources.sort((a, b) => {
    if (a.incomeYear !== b.incomeYear) {
      return b.incomeYear - a.incomeYear; // Most recent first
    }
    return a.employerName.localeCompare(b.employerName);
  });

  // Calculate totals (using the most recent year for each employer for current income)
  const summary = calculateSummary(caseId, sources);

  return { sources, summary };
}

/**
 * Re-export types for convenience
 */
export type {
  NormalizedIncome,
  ReconciledIncomeSource,
  CaseIncomeSummary,
  IncomeEvidence,
} from './types';
