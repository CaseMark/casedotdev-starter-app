"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  db,
  createCase as dbCreateCase,
  getCasesByUser,
  getCase as dbGetCase,
  updateCase as dbUpdateCase,
  deleteCase as dbDeleteCase,
  getDocumentStats,
} from "@/lib/storage/discovery-db";
import type { Case, CaseStatus } from "@/types/discovery";

// Local user ID for IndexedDB isolation
const LOCAL_USER_ID = "local-user";

// ============================================================================
// Types
// ============================================================================

interface CaseWithStats extends Case {
  documentCount: number;
  completedCount: number;
  processingCount: number;
}

interface CaseContextValue {
  cases: CaseWithStats[];
  currentCase: CaseWithStats | null;
  isLoading: boolean;
  error: string | null;
  createCase: (name: string, description?: string) => Promise<Case>;
  selectCase: (caseId: string) => Promise<void>;
  updateCase: (caseId: string, updates: { name?: string; description?: string; status?: CaseStatus }) => Promise<void>;
  deleteCase: (caseId: string) => Promise<void>;
  refreshCases: () => Promise<void>;
  refreshCurrentCase: () => Promise<void>;
}

const CaseContext = createContext<CaseContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function CaseProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<CaseWithStats[]>([]);
  const [currentCase, setCurrentCase] = useState<CaseWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load case with stats
  const loadCaseWithStats = useCallback(async (c: Case): Promise<CaseWithStats> => {
    const stats = await getDocumentStats(c.id);
    return {
      ...c,
      documentCount: stats.total,
      completedCount: stats.byStatus["completed"] || 0,
      processingCount: (stats.byStatus["pending"] || 0) +
        (stats.byStatus["ocr"] || 0) +
        (stats.byStatus["chunking"] || 0) +
        (stats.byStatus["embedding"] || 0),
    };
  }, []);

  // Load all cases for user
  const loadCases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userCases = await getCasesByUser(LOCAL_USER_ID);
      const casesWithStats = await Promise.all(userCases.map(loadCaseWithStats));
      setCases(casesWithStats);
    } catch (err) {
      console.error("Failed to load cases:", err);
      setError("Failed to load cases");
    } finally {
      setIsLoading(false);
    }
  }, [loadCaseWithStats]);

  // Initial load
  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Create new case
  const createCase = useCallback(async (name: string, description?: string): Promise<Case> => {
    const newCase = await dbCreateCase({
      name,
      description,
      createdBy: LOCAL_USER_ID,
      status: "active",
    });

    const caseWithStats = await loadCaseWithStats(newCase);
    setCases((prev) => [caseWithStats, ...prev]);
    return newCase;
  }, [loadCaseWithStats]);

  // Select a case
  const selectCase = useCallback(async (caseId: string) => {
    try {
      const c = await dbGetCase(caseId);
      if (c) {
        const caseWithStats = await loadCaseWithStats(c);
        setCurrentCase(caseWithStats);
        // Also update this case in the cases list to keep stats in sync
        setCases((prev) => prev.map((pc) => (pc.id === caseId ? caseWithStats : pc)));
      } else {
        setCurrentCase(null);
        setError("Case not found");
      }
    } catch (err) {
      console.error("Failed to select case:", err);
      setError("Failed to load case");
    }
  }, [loadCaseWithStats]);

  // Update a case
  const updateCase = useCallback(async (
    caseId: string,
    updates: { name?: string; description?: string; status?: CaseStatus }
  ) => {
    await dbUpdateCase(caseId, updates);

    // Refresh the case in state
    const updatedCase = await dbGetCase(caseId);
    if (updatedCase) {
      const caseWithStats = await loadCaseWithStats(updatedCase);
      setCases((prev) => prev.map((c) => (c.id === caseId ? caseWithStats : c)));
      if (currentCase?.id === caseId) {
        setCurrentCase(caseWithStats);
      }
    }
  }, [currentCase?.id, loadCaseWithStats]);

  // Delete a case
  const deleteCase = useCallback(async (caseId: string) => {
    await dbDeleteCase(caseId);
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    if (currentCase?.id === caseId) {
      setCurrentCase(null);
    }
  }, [currentCase?.id]);

  // Refresh cases
  const refreshCases = useCallback(async () => {
    await loadCases();
  }, [loadCases]);

  // Refresh current case
  const refreshCurrentCase = useCallback(async () => {
    if (currentCase) {
      await selectCase(currentCase.id);
    }
  }, [currentCase, selectCase]);

  return (
    <CaseContext.Provider
      value={{
        cases,
        currentCase,
        isLoading,
        error,
        createCase,
        selectCase,
        updateCase,
        deleteCase,
        refreshCases,
        refreshCurrentCase,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useCases() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCases must be used within a CaseProvider");
  }
  return context;
}

export function useCurrentCase() {
  const { currentCase, refreshCurrentCase } = useCases();
  return { currentCase, refresh: refreshCurrentCase };
}
