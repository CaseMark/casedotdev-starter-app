"use client";

import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash, Database } from "@phosphor-icons/react";
import { clearAllData, getDatabaseStats } from "@/lib/storage/discovery-db";
import { resetUsage, formatCost, DEMO_CONFIG } from "@/lib/usage";
import { useUsage } from "@/lib/contexts/usage-context";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { usage, refreshUsage } = useUsage();
  const [stats, setStats] = useState<{
    cases: number;
    documents: number;
    chunks: number;
    embeddings: number;
    jobs: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    getDatabaseStats().then(setStats);
  }, []);

  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear ALL data? This action cannot be undone.")) {
      setIsClearing(true);
      try {
        await clearAllData();
        setStats({ cases: 0, documents: 0, chunks: 0, embeddings: 0, jobs: 0 });
        alert("All data has been cleared.");
      } catch (error) {
        console.error("Failed to clear data:", error);
        alert("Failed to clear data. Please try again.");
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <>
      <AppHeader title="Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Usage Info */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Current Usage</span>
                <span className="text-foreground">{usage ? formatCost(usage.totalCostUsd) : "$0.00"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Usage Limit</span>
                <span className="text-foreground">{formatCost(DEMO_CONFIG.sessionPriceLimit)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Session Duration</span>
                <span className="text-foreground">{DEMO_CONFIG.sessionHours} hours</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a free account at{" "}
                <a href="https://console.case.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  console.case.dev
                </a>{" "}
                for unlimited access.
              </p>
            </CardContent>
          </Card>

          {/* Database Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                Local Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Cases</span>
                      <span className="text-foreground">{stats.cases}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Documents</span>
                      <span className="text-foreground">{stats.documents}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Text Chunks</span>
                      <span className="text-foreground">{stats.chunks}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Embeddings</span>
                      <span className="text-foreground">{stats.embeddings}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All data is stored locally in your browser using IndexedDB.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Clear All Data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all cases, documents, and search data.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isClearing}
                >
                  <Trash size={16} />
                  {isClearing ? "Clearing..." : "Clear Data"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
