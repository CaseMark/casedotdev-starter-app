"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  MagnifyingGlass,
  Info,
  ArrowLeft,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useCurrentCase } from "@/lib/contexts/case-context";

interface CaseNavProps {
  caseId: string;
}

export function CaseNav({ caseId }: CaseNavProps) {
  const pathname = usePathname();
  const { currentCase } = useCurrentCase();

  const tabs = [
    { label: "Overview", href: `/cases/${caseId}`, icon: Info },
    { label: "Documents", href: `/cases/${caseId}/documents`, icon: FileText },
    { label: "Search", href: `/cases/${caseId}/search`, icon: MagnifyingGlass },
  ];

  return (
    <div className="border-b border-border bg-background">
      {/* Back link and case name */}
      <div className="px-6 py-4 flex items-center gap-4">
        <Link
          href="/cases"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">All Cases</span>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h2 className="font-semibold text-foreground truncate">
          {currentCase?.name || "Loading..."}
        </h2>
      </div>

      {/* Tab navigation */}
      <div className="px-6 flex gap-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 pb-3 border-b-2 transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
