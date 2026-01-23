/**
 * Employer Name Matching
 *
 * Matches employer names across different document types.
 * Handles abbreviations, truncation (bank statements), and variations.
 */

import type { NormalizedIncome } from './types';
import { normalizeEmployerName } from './normalization';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // Deletion
          dp[i][j - 1],     // Insertion
          dp[i - 1][j - 1]  // Substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two employer names.
 * Returns 0-1 score where 1 is exact match.
 */
export function employerSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeEmployerName(name1);
  const norm2 = normalizeEmployerName(name2);

  // Exact match after normalization
  if (norm1 === norm2) return 1.0;

  // Empty strings
  if (!norm1 || !norm2) return 0;

  // One contains the other (handles bank statement truncation)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Give higher score if one is a significant portion of the other
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;
    const containmentScore = shorter.length / longer.length;
    return Math.max(0.85, containmentScore);
  }

  // Check if significant words match (Jaccard similarity)
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) {
    // Fall back to Levenshtein only
    const maxLen = Math.max(norm1.length, norm2.length);
    return 1 - (levenshteinDistance(norm1, norm2) / maxLen);
  }

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  const jaccard = intersection.size / union.size;

  // Also use Levenshtein for fuzzy match
  const maxLen = Math.max(norm1.length, norm2.length);
  const levenshteinScore = 1 - (levenshteinDistance(norm1, norm2) / maxLen);

  // Weight: prefer Jaccard for multi-word names, Levenshtein for single words
  if (words1.size > 1 || words2.size > 1) {
    return Math.max(jaccard * 0.8 + levenshteinScore * 0.2, levenshteinScore);
  }

  return Math.max(jaccard, levenshteinScore);
}

/**
 * Group normalized incomes by EIN (most reliable match)
 */
function matchByEIN(incomes: NormalizedIncome[]): {
  einGroups: Map<string, NormalizedIncome[]>;
  noEIN: NormalizedIncome[];
} {
  const einGroups = new Map<string, NormalizedIncome[]>();
  const noEIN: NormalizedIncome[] = [];

  for (const income of incomes) {
    if (income.employerEIN) {
      const normalizedEIN = income.employerEIN.replace(/\D/g, ''); // Remove non-digits
      const group = einGroups.get(normalizedEIN) || [];
      group.push(income);
      einGroups.set(normalizedEIN, group);
    } else {
      noEIN.push(income);
    }
  }

  return { einGroups, noEIN };
}

/**
 * Group income extractions by employer using name matching and EIN.
 * Returns a map where key is employer identifier and value is array of matching incomes.
 *
 * Note: This groups by employer only, not by year. Year-based grouping happens
 * in the reconciliation step to allow cross-year analysis.
 */
export function groupByEmployer(
  incomes: NormalizedIncome[],
  similarityThreshold = 0.75
): Map<string, NormalizedIncome[]> {
  // First, group by EIN where available
  const { einGroups, noEIN } = matchByEIN(incomes);

  // For items without EIN, use name matching
  const nameGroups: NormalizedIncome[][] = [];

  for (const income of noEIN) {
    let matched = false;

    // Try to match to existing name group
    for (const group of nameGroups) {
      const groupName = group[0].employerNormalized;
      const similarity = employerSimilarity(income.employerNormalized, groupName);

      if (similarity >= similarityThreshold) {
        group.push(income);
        matched = true;
        break;
      }
    }

    // Try to match to EIN groups by name
    if (!matched) {
      for (const [ein, group] of einGroups) {
        const groupName = group[0].employerNormalized;
        const similarity = employerSimilarity(income.employerNormalized, groupName);

        if (similarity >= similarityThreshold) {
          group.push(income);
          matched = true;
          break;
        }
      }
    }

    // Create new group if no match found
    if (!matched) {
      nameGroups.push([income]);
    }
  }

  // Merge into final result
  const result = new Map<string, NormalizedIncome[]>();

  for (const [ein, group] of einGroups) {
    result.set(`ein:${ein}`, group);
  }

  for (const group of nameGroups) {
    const key = `name:${group[0].employerNormalized}`;
    result.set(key, group);
  }

  return result;
}

/**
 * Group incomes by employer AND year for time-aware reconciliation.
 * Returns nested map: employer -> year -> incomes
 */
export function groupByEmployerAndYear(
  incomes: NormalizedIncome[],
  similarityThreshold = 0.75
): Map<string, Map<number, NormalizedIncome[]>> {
  // First group by employer
  const employerGroups = groupByEmployer(incomes, similarityThreshold);

  // Then subdivide each employer group by year
  const result = new Map<string, Map<number, NormalizedIncome[]>>();

  for (const [employerKey, employerIncomes] of employerGroups) {
    const yearMap = new Map<number, NormalizedIncome[]>();

    for (const income of employerIncomes) {
      const year = income.incomeYear;
      const existing = yearMap.get(year) || [];
      existing.push(income);
      yearMap.set(year, existing);
    }

    result.set(employerKey, yearMap);
  }

  return result;
}

/**
 * Get the best employer name from a group of incomes.
 * Prefers pay stub names, then W-2 names (more complete than bank statement truncations).
 */
export function getBestEmployerName(incomes: NormalizedIncome[]): string {
  // Priority: paystub > w2 > tax_return > 1099 > bank_statement
  const priority = ['paystub', 'w2', 'tax_return', '1099', 'bank_statement'];

  for (const docType of priority) {
    const match = incomes.find(i => i.documentType === docType);
    if (match) {
      return match.employerOriginal;
    }
  }

  return incomes[0].employerOriginal;
}

/**
 * Get the EIN from a group of incomes (if any have it).
 */
export function getEmployerEIN(incomes: NormalizedIncome[]): string | null {
  for (const income of incomes) {
    if (income.employerEIN) {
      return income.employerEIN;
    }
  }
  return null;
}
