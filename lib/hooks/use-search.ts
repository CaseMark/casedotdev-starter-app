"use client";

import { useState, useCallback } from "react";
import { semanticSearch } from "@/lib/vector-store";
import { createSearchHistory } from "@/lib/storage/discovery-db";
import type { SearchResult } from "@/types/discovery";

interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  search: (searchQuery: string) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(caseId: string): UseSearchResult {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      // Generate embedding for query via API
      const embeddingResponse = await fetch("/api/embeddings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [searchQuery] }),
      });

      if (!embeddingResponse.ok) {
        throw new Error("Failed to generate query embedding");
      }

      const { embeddings } = await embeddingResponse.json();
      const queryEmbedding = embeddings[0];

      // Perform semantic search
      // Lower threshold (0.1) for local bag-of-words embeddings
      // Real neural embeddings would use 0.5-0.7
      const matches = await semanticSearch({
        caseId,
        query: searchQuery,
        limit: 20,
        threshold: 0.1,
      }, queryEmbedding);

      const searchedAt = new Date();

      setResults({
        query: searchQuery,
        caseId,
        matches,
        totalMatches: matches.length,
        searchedAt,
      });

      // Save to search history
      await createSearchHistory({
        caseId,
        query: searchQuery,
        resultCount: matches.length,
        searchedAt,
      });
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [caseId]);

  const clearResults = useCallback(() => {
    setResults(null);
    setQuery("");
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}
