/**
 * Income Reconciliation System
 *
 * Exports all income reconciliation functionality.
 */

// Types
export * from './types';

// Normalization
export {
  normalizeExtraction,
  createNormalizedIncome,
  normalizeEmployerName,
  annualizeAmount,
  monthlyFromAnnual,
  ANNUAL_MULTIPLIERS,
} from './normalization';

// Employer matching
export {
  employerSimilarity,
  groupByEmployer,
  groupByEmployerAndYear,
  getBestEmployerName,
  getEmployerEIN,
} from './employer-matching';

// Reconciliation
export {
  reconcileIncome,
  type ReconciliationInput,
  type ReconciliationOutput,
} from './reconciliation';
