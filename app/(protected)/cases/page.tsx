"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { useCases } from "@/lib/contexts/case-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Plus,
  MagnifyingGlass,
  ArrowRight,
  Archive,
  Trash,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DotsThreeVertical } from "@phosphor-icons/react";

export default function CasesPage() {
  const { cases, isLoading, deleteCase, updateCase, refreshCases } = useCases();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  // Refresh case stats when navigating to cases page
  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && c.status === "active") ||
      (filter === "archived" && c.status === "archived");
    return matchesSearch && matchesFilter;
  });

  const handleArchive = async (caseId: string, currentStatus: string) => {
    await updateCase(caseId, {
      status: currentStatus === "archived" ? "active" : "archived",
    });
  };

  const handleDelete = async (caseId: string) => {
    if (confirm("Are you sure you want to delete this case? This action cannot be undone.")) {
      await deleteCase(caseId);
    }
  };

  return (
    <>
      <AppHeader title="Cases" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search cases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "active", "archived"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Link href="/cases/new">
              <Button>
                <Plus size={18} />
                New Case
              </Button>
            </Link>
          </div>

          {/* Case List */}
          {isLoading ? (
            <div className="text-muted-foreground">Loading cases...</div>
          ) : filteredCases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase
                  size={48}
                  className="mx-auto text-muted-foreground mb-4"
                />
                {cases.length === 0 ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      No cases yet. Create your first case to start managing discovery documents.
                    </p>
                    <Link href="/cases/new">
                      <Button>
                        <Plus size={18} />
                        Create Case
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No cases match your search.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredCases.map((c) => (
                <Card
                  key={c.id}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-4 flex-1"
                    >
                      <div className="w-10 h-10  bg-muted flex items-center justify-center">
                        <Briefcase
                          size={20}
                          className="text-muted-foreground"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">
                            {c.name}
                          </h4>
                          {c.status === "archived" && (
                            <span className="text-xs px-2 py-0.5  bg-muted text-muted-foreground">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {c.documentCount} documents
                          {c.processingCount > 0 &&
                            ` (${c.processingCount} processing)`}
                          {" · "}
                          {c.completedCount} ready for search
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link href={`/cases/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          Open
                          <ArrowRight size={16} />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center p-2  hover:bg-muted transition-colors">
                          <DotsThreeVertical size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleArchive(c.id, c.status)}
                          >
                            <Archive size={16} />
                            {c.status === "archived" ? "Unarchive" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(c.id)}
                            className="text-red-600"
                          >
                            <Trash size={16} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
