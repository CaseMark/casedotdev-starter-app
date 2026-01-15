"use client";

import { CaseProvider } from "@/lib/contexts/case-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UsageBanner } from "@/components/demo/usage-banner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CaseProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <UsageBanner />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </CaseProvider>
  );
}
