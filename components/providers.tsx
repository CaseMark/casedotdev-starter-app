"use client";

import { UsageProvider } from "@/lib/contexts/usage-context";
import { LimitExceededDialog } from "@/components/demo/limit-exceeded-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UsageProvider>
      {children}
      <LimitExceededDialog />
    </UsageProvider>
  );
}
