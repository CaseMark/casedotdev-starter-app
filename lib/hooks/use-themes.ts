"use client";

/**
 * useThemes Hook
 *
 * Manages theme analysis state and provides methods to trigger
 * theme extraction and refresh for a case.
 */

import { useState, useEffect, useCallback } from "react";
import type { CaseTheme, SuggestedQuestion, ThemeAnalysis } from "@/types/discovery";
import {
  getThemeAnalysisByCase,
  createThemeAnalysis,
  updateThemeAnalysis,
  getThemesByCase,
  getSuggestedQuestionsByCase,
  getChunksByCase,
  getDocumentStats,
  saveThemesAndQuestions,
} from "@/lib/storage/discovery-db";
import { graphStore } from "@/lib/storage/graph-store";
import { extractThemes, linkQuestionsToThemes } from "@/lib/processing/theme-extractor";

// 20% threshold for auto-refresh
const REFRESH_THRESHOLD = 0.2;

export interface UseThemesResult {
  themes: CaseTheme[];
  suggestedQuestions: SuggestedQuestion[];
  analysis: ThemeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  triggerAnalysis: () => Promise<void>;
  shouldRefresh: boolean;
}

export function useThemes(
  caseId: string | undefined,
  caseName: string,
  caseDescription?: string
): UseThemesResult {
  const [themes, setThemes] = useState<CaseTheme[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [analysis, setAnalysis] = useState<ThemeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Load existing themes and analysis
  useEffect(() => {
    async function loadThemes() {
      if (!caseId) return;

      try {
        const [existingAnalysis, existingThemes, existingQuestions] = await Promise.all([
          getThemeAnalysisByCase(caseId),
          getThemesByCase(caseId),
          getSuggestedQuestionsByCase(caseId),
        ]);

        setAnalysis(existingAnalysis || null);
        setThemes(existingThemes);
        setSuggestedQuestions(existingQuestions);

        // Check if refresh is needed based on 20% threshold
        if (existingAnalysis && existingAnalysis.status === "completed") {
          const stats = await getDocumentStats(caseId);
          const currentCount = stats.byStatus["completed"] || 0;
          const previousCount = existingAnalysis.documentCountAtAnalysis;

          if (previousCount > 0 && currentCount > previousCount) {
            const growthRate = (currentCount - previousCount) / previousCount;
            setShouldRefresh(growthRate >= REFRESH_THRESHOLD);
          }
        } else if (!existingAnalysis) {
          // No analysis yet, check if there are documents to analyze
          const stats = await getDocumentStats(caseId);
          const completedCount = stats.byStatus["completed"] || 0;
          if (completedCount > 0) {
            setShouldRefresh(true); // Prompt user to analyze
          }
        }
      } catch (err) {
        console.error("[useThemes] Failed to load themes:", err);
      }
    }

    loadThemes();
  }, [caseId]);

  const triggerAnalysis = useCallback(async () => {
    if (!caseId) {
      setError("No case selected");
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Get current document count
      const stats = await getDocumentStats(caseId);
      const completedCount = stats.byStatus["completed"] || 0;

      if (completedCount === 0) {
        setError("No completed documents to analyze");
        setIsAnalyzing(false);
        return;
      }

      // Get chunks and entities
      const [chunks, entities] = await Promise.all([
        getChunksByCase(caseId),
        graphStore.getEntitiesByCase(caseId),
      ]);

      if (chunks.length === 0) {
        setError("No document chunks found");
        setIsAnalyzing(false);
        return;
      }

      // Create or update analysis record
      let analysisRecord = await getThemeAnalysisByCase(caseId);
      if (!analysisRecord) {
        analysisRecord = await createThemeAnalysis({
          caseId,
          documentCountAtAnalysis: completedCount,
          status: "processing",
          analyzedAt: new Date(),
        });
      } else {
        await updateThemeAnalysis(analysisRecord.id, {
          status: "processing",
          documentCountAtAnalysis: completedCount,
        });
      }

      setAnalysis({ ...analysisRecord, status: "processing" });

      // Extract themes
      const result = await extractThemes({
        caseId,
        caseName,
        caseDescription,
        chunks,
        entities,
        documentCount: completedCount,
      });

      if (result.themes.length === 0) {
        setError("Could not extract themes from documents");
        await updateThemeAnalysis(analysisRecord.id, {
          status: "failed",
          errorMessage: "No themes extracted",
        });
        setIsAnalyzing(false);
        return;
      }

      // Save themes first to get IDs
      const { themes: savedThemes } = await saveThemesAndQuestions(
        caseId,
        result.themes,
        [] // Save questions separately after linking
      );

      // Link questions to saved themes
      const linkedQuestions = linkQuestionsToThemes(savedThemes, result.suggestedQuestions);

      // Save linked questions
      const { questions: savedQuestions } = await saveThemesAndQuestions(
        caseId,
        result.themes, // Re-save themes (will be replaced)
        linkedQuestions
      );

      // Update analysis status
      await updateThemeAnalysis(analysisRecord.id, {
        status: "completed",
        analyzedAt: new Date(),
        errorMessage: undefined,
      });

      // Update local state
      setThemes(savedThemes);
      setSuggestedQuestions(savedQuestions);
      setAnalysis({
        ...analysisRecord,
        status: "completed",
        documentCountAtAnalysis: completedCount,
        analyzedAt: new Date(),
      });
      setShouldRefresh(false);
    } catch (err) {
      console.error("[useThemes] Analysis failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");

      // Update analysis record with error
      if (caseId) {
        const analysisRecord = await getThemeAnalysisByCase(caseId);
        if (analysisRecord) {
          await updateThemeAnalysis(analysisRecord.id, {
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Analysis failed",
          });
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [caseId, caseName, caseDescription]);

  return {
    themes,
    suggestedQuestions,
    analysis,
    isAnalyzing,
    error,
    triggerAnalysis,
    shouldRefresh,
  };
}

/**
 * Helper hook to check if theme analysis should auto-trigger
 * Returns true if themes should be analyzed (first time or threshold met)
 */
export function useShouldAnalyzeThemes(
  caseId: string | undefined,
  completedDocCount: number
): boolean {
  const [shouldAnalyze, setShouldAnalyze] = useState(false);

  useEffect(() => {
    async function check() {
      if (!caseId || completedDocCount === 0) {
        setShouldAnalyze(false);
        return;
      }

      const analysis = await getThemeAnalysisByCase(caseId);

      if (!analysis) {
        // No analysis yet, should analyze
        setShouldAnalyze(true);
        return;
      }

      if (analysis.status !== "completed") {
        setShouldAnalyze(false);
        return;
      }

      // Check 20% threshold
      const previousCount = analysis.documentCountAtAnalysis;
      if (previousCount > 0 && completedDocCount > previousCount) {
        const growthRate = (completedDocCount - previousCount) / previousCount;
        setShouldAnalyze(growthRate >= REFRESH_THRESHOLD);
      } else {
        setShouldAnalyze(false);
      }
    }

    check();
  }, [caseId, completedDocCount]);

  return shouldAnalyze;
}
