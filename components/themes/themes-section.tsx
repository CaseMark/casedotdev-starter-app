"use client";

import Link from "next/link";
import {
  Lightbulb,
  Tag,
  Question,
  ArrowRight,
  ArrowsClockwise,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { CaseTheme, SuggestedQuestion } from "@/types/discovery";

// ============================================================================
// Theme Card Component
// ============================================================================

interface ThemeCardProps {
  theme: CaseTheme;
}

function ThemeCard({ theme }: ThemeCardProps) {
  const scorePercent = Math.round(theme.relevanceScore * 100);

  return (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 flex items-center justify-center shrink-0">
          <Lightbulb size={16} className="text-amber-600" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-foreground text-sm truncate">
              {theme.title}
            </h4>
            <span
              className={`text-xs font-medium shrink-0 ${
                scorePercent >= 80
                  ? "text-green-600"
                  : scorePercent >= 60
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }`}
            >
              {scorePercent}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {theme.description}
          </p>
          {theme.keyTerms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {theme.keyTerms.slice(0, 4).map((term, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-xs text-muted-foreground"
                >
                  <Tag size={10} />
                  {term}
                </span>
              ))}
              {theme.keyTerms.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{theme.keyTerms.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Suggested Questions Component
// ============================================================================

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  caseId: string;
}

function SuggestedQuestions({ questions, caseId }: SuggestedQuestionsProps) {
  // Sort by priority descending
  const sortedQuestions = [...questions].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-2">
      {sortedQuestions.slice(0, 5).map((q) => (
        <Link
          key={q.id}
          href={`/cases/${caseId}/search?q=${encodeURIComponent(q.question)}`}
          className="flex items-start gap-3 p-3 border bg-card hover:border-foreground/20 transition-colors group"
        >
          <Question size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground group-hover:text-foreground leading-snug">
              {q.question}
            </p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {q.rationale}
            </p>
          </div>
          <ArrowRight
            size={14}
            className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0"
          />
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// Main Themes Section Component
// ============================================================================

interface ThemesSectionProps {
  themes: CaseTheme[];
  suggestedQuestions: SuggestedQuestion[];
  caseId: string;
  isAnalyzing: boolean;
  shouldRefresh: boolean;
  onRefresh: () => void;
  hasDocuments: boolean;
  error?: string | null;
}

export function ThemesSection({
  themes,
  suggestedQuestions,
  caseId,
  isAnalyzing,
  shouldRefresh,
  onRefresh,
  hasDocuments,
  error,
}: ThemesSectionProps) {
  // Empty state when no documents
  if (!hasDocuments) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-600" />
          Discovery Insights
        </h2>
        <div className="border bg-card p-8 text-center">
          <Lightbulb size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Upload documents to discover key themes and suggested questions.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-600" />
          Discovery Insights
        </h2>
        {(shouldRefresh || themes.length === 0) && !isAnalyzing && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <ArrowsClockwise size={14} className="mr-2" />
            {themes.length === 0 ? "Analyze" : "Refresh"}
          </Button>
        )}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SpinnerGap size={14} className="animate-spin" />
            Analyzing...
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Content */}
      {themes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Themes Column */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Key Themes ({themes.length})
            </h3>
            <div className="border bg-card overflow-hidden">
              {themes.slice(0, 5).map((theme) => (
                <ThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
          </div>

          {/* Suggested Questions Column */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Suggested Questions ({suggestedQuestions.length})
            </h3>
            <SuggestedQuestions questions={suggestedQuestions} caseId={caseId} />
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="border bg-card p-8 text-center">
          <SpinnerGap
            size={32}
            className="mx-auto text-amber-600 animate-spin mb-3"
          />
          <p className="text-sm text-foreground font-medium">
            Analyzing documents...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Extracting themes and generating questions
          </p>
        </div>
      ) : (
        <div className="border bg-card p-8 text-center">
          <Lightbulb size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Analyze your documents to discover key themes and get suggested
            questions.
          </p>
          <Button variant="default" size="sm" onClick={onRefresh}>
            <Lightbulb size={14} className="mr-2" />
            Analyze Documents
          </Button>
        </div>
      )}

      {/* Refresh Notice */}
      {shouldRefresh && themes.length > 0 && !isAnalyzing && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <ArrowsClockwise size={12} />
          New documents have been added. Consider refreshing the analysis.
        </p>
      )}
    </section>
  );
}
