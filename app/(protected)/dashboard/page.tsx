"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useCases } from "@/lib/contexts/case-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  FileText,
  MagnifyingGlass,
  Plus,
  ArrowRight,
} from "@phosphor-icons/react";

export default function DashboardPage() {
  const { cases, isLoading, refreshCases } = useCases();

  // Refresh case stats when navigating to dashboard
  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  // Calculate stats
  const totalCases = cases.length;
  const totalDocuments = cases.reduce((sum, c) => sum + c.documentCount, 0);
  const processingDocuments = cases.reduce((sum, c) => sum + c.processingCount, 0);

  const recentCases = cases.slice(0, 5);

  return (
    <>
      <AppHeader title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl text-foreground">
                Welcome back
              </h2>
              <p className="text-muted-foreground mt-1">
                Here&apos;s an overview of your discovery workspace
              </p>
            </div>
            <Link href="/cases/new">
              <Button>
                <Plus size={18} />
                New Case
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cases
                </CardTitle>
                <Briefcase size={20} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {isLoading ? "..." : totalCases}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Documents
                </CardTitle>
                <FileText size={20} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {isLoading ? "..." : totalDocuments}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Processing
                </CardTitle>
                <MagnifyingGlass size={20} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {isLoading ? "..." : processingDocuments}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Cases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Cases
              </h3>
              <Link
                href="/cases"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight size={14} />
              </Link>
            </div>

            {isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : recentCases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase
                    size={48}
                    className="mx-auto text-muted-foreground mb-4"
                  />
                  <p className="text-muted-foreground mb-4">
                    No cases yet. Create your first case to get started.
                  </p>
                  <Link href="/cases/new">
                    <Button>
                      <Plus size={18} />
                      Create Case
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentCases.map((c) => (
                  <Link key={c.id} href={`/cases/${c.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10  bg-muted flex items-center justify-center">
                            <Briefcase
                              size={20}
                              className="text-muted-foreground"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {c.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {c.documentCount} documents
                              {c.processingCount > 0 &&
                                ` (${c.processingCount} processing)`}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          size={18}
                          className="text-muted-foreground"
                        />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
