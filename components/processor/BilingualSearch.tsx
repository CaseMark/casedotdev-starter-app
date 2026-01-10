'use client';

import React, { useState, useCallback } from 'react';
import { MagnifyingGlass, X, Globe, FileText, CaretDown, CaretUp } from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/types';

interface SearchResult {
  documentId: string;
  filename: string;
  originalLanguage: LanguageCode;
  originalMatches: Array<{ text: string; score: number }>;
  translatedMatches: Array<{ text: string; score: number }>;
}

interface BilingualSearchProps {
  documents: Array<{
    id: string;
    filename: string;
    originalLanguage: LanguageCode;
    originalText: string;
    translatedText: string;
  }>;
  onSearchResults: (results: SearchResult[], query: string) => void;
  onSelectDocument: (documentId: string, highlightedChunks: { original: string[]; translated: string[] }) => void;
}

export default function BilingualSearch({
  documents,
  onSearchResults,
  onSelectDocument,
}: BilingualSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [searchLanguage, setSearchLanguage] = useState<'all' | 'original' | 'translated'>('all');

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      onSearchResults([], '');
      return;
    }

    setIsSearching(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    const searchResults: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();

    for (const doc of documents) {
      const originalMatches: Array<{ text: string; score: number }> = [];
      const translatedMatches: Array<{ text: string; score: number }> = [];

      if (searchLanguage === 'all' || searchLanguage === 'original') {
        const originalChunks = findMatchingChunks(doc.originalText, queryLower);
        originalMatches.push(...originalChunks);
      }

      if (searchLanguage === 'all' || searchLanguage === 'translated') {
        const translatedChunks = findMatchingChunks(doc.translatedText, queryLower);
        translatedMatches.push(...translatedChunks);
      }

      if (originalMatches.length > 0 || translatedMatches.length > 0) {
        searchResults.push({
          documentId: doc.id,
          filename: doc.filename,
          originalLanguage: doc.originalLanguage,
          originalMatches,
          translatedMatches,
        });
      }
    }

    searchResults.sort((a, b) => {
      const aTotal = a.originalMatches.length + a.translatedMatches.length;
      const bTotal = b.originalMatches.length + b.translatedMatches.length;
      return bTotal - aTotal;
    });

    setResults(searchResults);
    onSearchResults(searchResults, searchQuery);
    setIsSearching(false);
  }, [documents, searchLanguage, onSearchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    onSearchResults([], '');
  };

  const toggleExpanded = (documentId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId);
    } else {
      newExpanded.add(documentId);
    }
    setExpandedResults(newExpanded);
  };

  const handleResultClick = (result: SearchResult) => {
    const highlightedChunks = {
      original: result.originalMatches.map(m => m.text),
      translated: result.translatedMatches.map(m => m.text),
    };
    onSelectDocument(result.documentId, highlightedChunks);
  };

  return (
    <div className="w-full">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in any language..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={searchLanguage}
            onChange={(e) => setSearchLanguage(e.target.value as 'all' | 'original' | 'translated')}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
          >
            <option value="all">All Languages</option>
            <option value="original">Original Only</option>
            <option value="translated">English Only</option>
          </select>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Search Tips */}
      {!query && results.length === 0 && (
        <div className="mt-4 p-4 bg-orange-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-orange-600 mt-0.5" weight="bold" />
            <div>
              <p className="text-sm font-medium text-orange-800">Bilingual Search</p>
              <p className="text-sm text-orange-600 mt-1">
                Search in English or the original language. Results will highlight matches in both versions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-500">
            Found {results.reduce((acc, r) => acc + r.originalMatches.length + r.translatedMatches.length, 0)} matches in {results.length} document{results.length !== 1 ? 's' : ''}
          </p>

          {results.map((result) => {
            const isExpanded = expandedResults.has(result.documentId);
            const languageInfo = SUPPORTED_LANGUAGES[result.originalLanguage];
            const totalMatches = result.originalMatches.length + result.translatedMatches.length;

            return (
              <div
                key={result.documentId}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Result Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpanded(result.documentId)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{result.filename}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">
                          {languageInfo?.flag} {languageInfo?.name}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">
                          {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResultClick(result);
                      }}
                      className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                    >
                      View Document
                    </button>
                    {isExpanded ? (
                      <CaretUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <CaretDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Original Language Matches */}
                    {result.originalMatches.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                          <span>{languageInfo?.flag}</span>
                          Original ({result.originalMatches.length} match{result.originalMatches.length !== 1 ? 'es' : ''})
                        </p>
                        <div className="space-y-2">
                          {result.originalMatches.slice(0, 3).map((match, i) => (
                            <div
                              key={i}
                              className="p-3 bg-orange-50 rounded text-sm text-gray-700 border-l-4 border-orange-400"
                            >
                              <HighlightedText text={match.text} query={query} />
                            </div>
                          ))}
                          {result.originalMatches.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{result.originalMatches.length - 3} more matches
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Translated Matches */}
                    {result.translatedMatches.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                          <span>🇺🇸</span>
                          English Translation ({result.translatedMatches.length} match{result.translatedMatches.length !== 1 ? 'es' : ''})
                        </p>
                        <div className="space-y-2">
                          {result.translatedMatches.slice(0, 3).map((match, i) => (
                            <div
                              key={i}
                              className="p-3 bg-green-50 rounded text-sm text-gray-700 border-l-4 border-green-400"
                            >
                              <HighlightedText text={match.text} query={query} />
                            </div>
                          ))}
                          {result.translatedMatches.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{result.translatedMatches.length - 3} more matches
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {query && results.length === 0 && !isSearching && (
        <div className="mt-4 p-6 text-center bg-gray-50 rounded-lg">
          <MagnifyingGlass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No results found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try different keywords or search in a different language
          </p>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));

  return (
    <>
      {parts.map((part, i) => (
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </>
  );
}

function findMatchingChunks(text: string, query: string): Array<{ text: string; score: number }> {
  const chunks: Array<{ text: string; score: number }> = [];
  const lines = text.split('\n');
  const queryLower = query.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      const context = lines.slice(start, end).join('\n');

      const occurrences = (line.toLowerCase().match(new RegExp(escapeRegex(queryLower), 'g')) || []).length;
      const score = occurrences / line.length;

      chunks.push({ text: context, score });
    }
  }

  const uniqueChunks = chunks.filter((chunk, index, self) =>
    index === self.findIndex(c => c.text === chunk.text)
  );

  return uniqueChunks.sort((a, b) => b.score - a.score);
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
