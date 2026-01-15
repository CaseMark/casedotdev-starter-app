"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { CaseNav } from "@/components/layout/case-nav";
import { useCases, useCurrentCase } from "@/lib/contexts/case-context";
import { SearchInput } from "@/components/search/search-input";
import { SearchResults } from "@/components/search/search-results";
import { useSearch } from "@/lib/hooks/use-search";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function SearchPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { selectCase } = useCases();
  const { currentCase } = useCurrentCase();
  const { query, setQuery, results, isSearching, error, search } = useSearch(caseId);
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  useEffect(() => {
    selectCase(caseId);
  }, [caseId, selectCase]);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      await search(searchQuery);
    }
  };

  const hasDocuments = currentCase && currentCase.completedCount > 0;

  return (
    <>
      <AppHeader />
      <CaseNav caseId={caseId} />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl text-foreground">Search</h1>
            <p className="text-muted-foreground">
              Search across all documents using natural language
            </p>
          </header>

          {!hasDocuments ? (
            <div className=" border bg-card py-12 text-center">
              <MagnifyingGlass
                size={40}
                className="mx-auto text-muted-foreground mb-4"
              />
              <p className="text-foreground font-medium mb-1">No documents indexed</p>
              <p className="text-sm text-muted-foreground">
                Upload and process documents first to enable search.
              </p>
            </div>
          ) : (
            <>
              <SearchInput
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                isSearching={isSearching}
                minScoreFilter={minScoreFilter}
                onMinScoreFilterChange={setMinScoreFilter}
              />

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <SearchResults
                results={results}
                isSearching={isSearching}
                query={query}
                minScoreFilter={minScoreFilter}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
