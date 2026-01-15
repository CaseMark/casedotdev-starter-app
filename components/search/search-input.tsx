"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, Spinner, X, FunnelSimple } from "@phosphor-icons/react";

// 0 means "All", otherwise it's the minimum percentage
export type MinScoreFilter = number;

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  isSearching: boolean;
  minScoreFilter: MinScoreFilter;
  onMinScoreFilterChange: (filter: MinScoreFilter) => void;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  isSearching,
  minScoreFilter,
  onMinScoreFilterChange,
}: SearchInputProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        onSearch(value.trim());
      }
    },
    [value, onSearch]
  );

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && value.trim()) {
        onSearch(value.trim());
      }
    },
    [value, onSearch]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMinScoreFilterChange(parseInt(e.target.value, 10));
    },
    [onMinScoreFilterChange]
  );

  // Close filter when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filterLabel = minScoreFilter === 0 ? "All" : `${minScoreFilter}%+`;
  const hasActiveFilter = minScoreFilter > 0;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search documents using natural language..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-11"
          disabled={isSearching}
        />
        {value && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Button with Popover */}
      <div className="relative" ref={filterRef}>
        <Button
          type="button"
          variant={hasActiveFilter ? "secondary" : "outline"}
          className="h-11 px-3 gap-1.5"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <FunnelSimple size={16} weight={hasActiveFilter ? "fill" : "regular"} />
          <span className="text-sm">{filterLabel}</span>
        </Button>

        {/* Filter Popover */}
        {isFilterOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 border bg-card p-4 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Minimum Match
                </span>
                <span className="text-sm font-medium text-foreground">
                  {filterLabel}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={minScoreFilter}
                onChange={handleSliderChange}
                className="w-full h-2 bg-muted appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-foreground
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:duration-150
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:bg-foreground
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>All</span>
                <span>90%</span>
              </div>

              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    onMinScoreFilterChange(0);
                    setIsFilterOpen(false);
                  }}
                >
                  Reset filter
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="h-11" disabled={!value.trim() || isSearching}>
        {isSearching ? (
          <>
            <Spinner size={16} className="animate-spin" />
            <span className="hidden sm:inline">Searching...</span>
          </>
        ) : (
          <>
            <MagnifyingGlass size={16} />
            <span className="hidden sm:inline">Search</span>
          </>
        )}
      </Button>
    </form>
  );
}
