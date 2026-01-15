"use client";

import { useState, useCallback } from "react";
import {
  enhancedSemanticSearch,
  type EnhancedSearchResult,
  type EnhancedSearchOptions,
} from "@/lib/search/enhanced-search";
import { checkUsageLimits, updateUsage } from "@/lib/usage";
import type { SearchResult, SearchMatch } from "@/types/discovery";
import type { GraphContext } from "@/lib/search/enhanced-search";

export class DemoLimitExceededError extends Error {
  reason: string;

  constructor(reason: string) {
    super(`Demo limit exceeded: ${reason}`);
    this.name = "DemoLimitExceededError";
    this.reason = reason;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface EnhancedSearchState {
  /** Search query text */
  query: string;
  /** Set the query text */
  setQuery: (query: string) => void;
  /** Standard search results (for backwards compatibility) */
  results: SearchResult | null;
  /** Graph-enriched search results */
  enhancedResults: EnhancedSearchResult | null;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Perform search */
  search: (searchQuery: string, options?: SearchOptions) => Promise<void>;
  /** Clear all results */
  clearResults: () => void;
  /** Whether enhanced search is enabled */
  enhancedMode: boolean;
  /** Toggle enhanced search mode */
  setEnhancedMode: (enabled: boolean) => void;
}

export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Minimum similarity threshold */
  threshold?: number;
  /** Include graph-enriched results */
  includeGraph?: boolean;
  /** Maximum graph traversal hops */
  maxHops?: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnhancedSearch(caseId: string): EnhancedSearchState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [enhancedResults, setEnhancedResults] = useState<EnhancedSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedMode, setEnhancedMode] = useState(true);

  const search = useCallback(
    async (searchQuery: string, options: SearchOptions = {}) => {
      if (!searchQuery.trim()) {
        setResults(null);
        setEnhancedResults(null);
        return;
      }

      const {
        limit = 20,
        threshold = 0.1,
        includeGraph = enhancedMode,
        maxHops = 2,
      } = options;

      try {
        setIsSearching(true);
        setError(null);

        // Check usage limits before making API call
        const limits = checkUsageLimits();
        if (!limits.allowed) {
          throw new DemoLimitExceededError(limits.reason || "limit_exceeded");
        }

        // Generate embedding for query via API
        const embeddingResponse = await fetch("/api/embeddings/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [searchQuery] }),
        });

        if (!embeddingResponse.ok) {
          throw new Error("Failed to generate query embedding");
        }

        const { embeddings, tokensUsed } = await embeddingResponse.json();
        const queryEmbedding = embeddings[0];

        // Track embedding usage
        if (tokensUsed) {
          updateUsage({ inputTokens: tokensUsed });
        }

        // Perform enhanced semantic search with graph context
        const enhanced = await enhancedSemanticSearch(searchQuery, queryEmbedding, {
          caseId,
          query: searchQuery,
          limit,
          threshold,
          maxHops,
          includeGraphChunks: includeGraph,
          graphWeight: 0.3,
          minEntityConfidence: 0.7,
        });

        // Set enhanced results
        setEnhancedResults(enhanced);

        // Also set standard results for backwards compatibility
        // Combine vector matches with graph-enriched chunks if in enhanced mode
        const allMatches = includeGraph
          ? [...enhanced.matches, ...enhanced.graphEnrichedChunks]
          : enhanced.matches;

        // Sort by score and deduplicate
        const uniqueMatches = new Map<string, SearchMatch>();
        for (const match of allMatches) {
          const existing = uniqueMatches.get(match.chunkId);
          if (!existing || match.score > existing.score) {
            uniqueMatches.set(match.chunkId, match);
          }
        }

        const sortedMatches = Array.from(uniqueMatches.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        setResults({
          query: searchQuery,
          caseId,
          matches: sortedMatches,
          totalMatches: sortedMatches.length,
          searchedAt: new Date(),
        });
      } catch (err) {
        console.error("Enhanced search failed:", err);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [caseId, enhancedMode]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setEnhancedResults(null);
    setQuery("");
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    enhancedResults,
    isSearching,
    error,
    search,
    clearResults,
    enhancedMode,
    setEnhancedMode,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format graph context for display
 */
export function formatGraphContext(context: GraphContext | undefined): {
  entityCount: number;
  relationshipCount: number;
  crossDocCount: number;
  summary: string;
} {
  if (!context) {
    return {
      entityCount: 0,
      relationshipCount: 0,
      crossDocCount: 0,
      summary: "No graph context available",
    };
  }

  const entityCount =
    context.queryEntities.length + context.relatedEntities.length;
  const relationshipCount = context.entityPaths.length;
  const crossDocCount = context.crossDocumentLinks.length;

  let summary = "";
  if (context.queryEntities.length > 0) {
    const entityNames = context.queryEntities
      .slice(0, 3)
      .map((e) => e.name)
      .join(", ");
    summary = `Found entities: ${entityNames}`;
    if (context.queryEntities.length > 3) {
      summary += ` (+${context.queryEntities.length - 3} more)`;
    }
  }

  if (crossDocCount > 0) {
    summary += summary ? ". " : "";
    summary += `${crossDocCount} related document${crossDocCount > 1 ? "s" : ""} found`;
  }

  return {
    entityCount,
    relationshipCount,
    crossDocCount,
    summary: summary || "No entities found in query",
  };
}
