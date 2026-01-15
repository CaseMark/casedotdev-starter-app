"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { CaseNav } from "@/components/layout/case-nav";
import { useCases, useCurrentCase } from "@/lib/contexts/case-context";
import { getSearchHistoryByCase } from "@/lib/storage/discovery-db";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MagnifyingGlass,
  Clock,
  CheckCircle,
  ArrowRight,
  ClockCounterClockwise,
  Upload,
} from "@phosphor-icons/react";
import type { SearchHistory } from "@/types/discovery";

export default function CaseOverviewPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { selectCase } = useCases();
  const { currentCase } = useCurrentCase();
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  useEffect(() => {
    selectCase(caseId);
  }, [caseId, selectCase]);

  // Load search history
  useEffect(() => {
    async function loadSearchHistory() {
      try {
        const history = await getSearchHistoryByCase(caseId, 5);
        setSearchHistory(history);
      } catch (error) {
        console.error("Failed to load search history:", error);
      }
    }
    loadSearchHistory();
  }, [caseId]);

  if (!currentCase) {
    return (
      <>
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-48 animate-pulse  bg-muted" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <CaseNav caseId={caseId} />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Case Header */}
          <header className="space-y-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl text-foreground">
                {currentCase.name}
              </h1>
              <span className={`text-xs px-2 py-1  ${
                currentCase.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}>
                {currentCase.status.charAt(0).toUpperCase() + currentCase.status.slice(1)}
              </span>
            </div>
            {currentCase.description && (
              <p className="text-muted-foreground">
                {currentCase.description}
              </p>
            )}
          </header>

          {/* Stats Row */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <span className="text-foreground font-medium">{currentCase.documentCount}</span>
              <span className="text-muted-foreground">documents</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="text-green-600" />
              <span className="text-foreground font-medium">{currentCase.completedCount}</span>
              <span className="text-muted-foreground">indexed</span>
            </div>
            {currentCase.processingCount > 0 && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span className="text-foreground font-medium">{currentCase.processingCount}</span>
                <span className="text-muted-foreground">processing</span>
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Card */}
              <Link
                href={`/cases/${caseId}/search`}
                className=" border bg-card p-5 hover:border-foreground/20 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10  bg-muted flex items-center justify-center shrink-0">
                    <MagnifyingGlass size={20} className="text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-foreground">
                      Search Documents
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Find relevant passages using natural language
                    </p>
                    {currentCase.completedCount > 0 ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        {currentCase.completedCount} document{currentCase.completedCount !== 1 ? "s" : ""} ready
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mt-2">
                        No documents indexed yet
                      </p>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
              </Link>

              {/* Upload Card */}
              <Link
                href={`/cases/${caseId}/documents`}
                className=" border bg-card p-5 hover:border-foreground/20 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10  bg-muted flex items-center justify-center shrink-0">
                    <Upload size={20} className="text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-foreground">
                      Upload Documents
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Add PDFs, images, and text files
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports OCR for scanned documents
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
              </Link>
            </div>
          </section>

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ClockCounterClockwise size={18} className="text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Recent Searches</h2>
              </div>
              <div className=" border bg-card overflow-hidden">
                {searchHistory.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/cases/${caseId}/search`}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group ${
                      index !== searchHistory.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MagnifyingGlass size={16} className="text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        {item.query}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {item.resultCount} result{item.resultCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.searchedAt)}
                      </span>
                      <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Case Info */}
          <section className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Created {new Date(currentCase.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
