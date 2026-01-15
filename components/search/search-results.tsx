"use client";

import { useMemo } from "react";
import { MagnifyingGlass, FileText } from "@phosphor-icons/react";
import type { SearchResult, SearchMatch } from "@/types/discovery";
import type { MinScoreFilter } from "./search-input";

interface SearchResultsProps {
  results: SearchResult | null;
  isSearching: boolean;
  query: string;
  minScoreFilter?: MinScoreFilter;
}

export function SearchResults({ results, isSearching, query, minScoreFilter = 0 }: SearchResultsProps) {
  // Filter results based on minimum score (0 means show all)
  const filteredMatches = useMemo(() => {
    if (!results?.matches) return [];
    if (minScoreFilter === 0) return results.matches;

    const minScore = minScoreFilter / 100;
    return results.matches.filter((match) => match.score >= minScore);
  }, [results?.matches, minScoreFilter]);

  if (isSearching) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <MagnifyingGlass size={20} className="animate-pulse" />
          <span className="text-sm">Searching documents...</span>
        </div>
      </div>
    );
  }

  if (!results && query) {
    return null;
  }

  if (!results) {
    return (
      <div className="border bg-card py-12 text-center">
        <MagnifyingGlass size={40} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Enter a search query to find relevant passages in your documents.
        </p>
      </div>
    );
  }

  if (results.matches.length === 0) {
    return (
      <div className="border bg-card py-12 text-center">
        <MagnifyingGlass size={40} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-1">No results found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search query or uploading more documents.
        </p>
      </div>
    );
  }

  // Show message if filter reduces results to zero
  if (filteredMatches.length === 0 && results.matches.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Found {results.totalMatches} result{results.totalMatches !== 1 ? "s" : ""} for &quot;{results.query}&quot;
        </p>
        <div className="border bg-card py-12 text-center">
          <MagnifyingGlass size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium mb-1">No results match your filter</p>
          <p className="text-sm text-muted-foreground">
            Try lowering the minimum match percentage to see more results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {minScoreFilter > 0 ? (
          <>Showing {filteredMatches.length} of {results.totalMatches} result{results.totalMatches !== 1 ? "s" : ""} for &quot;{results.query}&quot;</>
        ) : (
          <>Found {results.totalMatches} result{results.totalMatches !== 1 ? "s" : ""} for &quot;{results.query}&quot;</>
        )}
      </p>

      <div className="border bg-card overflow-hidden">
        {filteredMatches.map((match, index) => (
          <SearchResultCard
            key={`${match.chunkId}-${index}`}
            match={match}
            rank={index + 1}
            isLast={index === filteredMatches.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  match: SearchMatch;
  rank: number;
  isLast: boolean;
}

function SearchResultCard({ match, rank, isLast }: SearchResultCardProps) {
  const scorePercent = Math.round(match.score * 100);

  return (
    <div className={`p-4 hover:bg-muted/50 transition-colors ${!isLast ? "border-b" : ""}`}>
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="w-7 h-7 bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Document Info */}
          <div className="flex items-center gap-2 mb-1.5">
            <FileText size={14} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {match.documentName}
            </span>
            {match.pageNumber && (
              <span className="text-xs text-muted-foreground">
                p. {match.pageNumber}
              </span>
            )}
          </div>

          {/* Chunk Content */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {match.content}
          </p>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <div
            className={`text-sm font-medium ${
              scorePercent >= 80
                ? "text-green-600"
                : scorePercent >= 60
                ? "text-amber-600"
                : "text-muted-foreground"
            }`}
          >
            {scorePercent}%
          </div>
        </div>
      </div>
    </div>
  );
}
