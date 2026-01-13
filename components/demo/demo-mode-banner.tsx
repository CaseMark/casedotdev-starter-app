"use client";

import { useState, useEffect } from "react";
import { Info, X, ArrowSquareOut, Lightning, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DemoModeBannerProps {
  variant?: "default" | "compact" | "floating";
  showUpgradeLink?: boolean;
  className?: string;
}

interface DemoConfig {
  isDemoMode: boolean;
  appName: string;
  limits: {
    maxTokens: number;
    maxDocuments: number;
    maxOcrPages: number;
  };
  features: {
    showUsageStats: boolean;
    showUpgradeCta: boolean;
    allowDocumentUpload: boolean;
  };
}

interface LimitsSummary {
  tokensUsed: number;
  tokensRemaining: number;
  documentsUsed: number;
  documentsRemaining: number;
  ocrPagesUsed: number;
  ocrPagesRemaining: number;
}

/**
 * Demo Mode Banner Component
 * 
 * Displays a banner indicating the app is running in demo mode with limited features.
 * Supports multiple variants for different UI contexts.
 */
export function DemoModeBanner({ 
  variant = "default", 
  showUpgradeLink = true,
  className 
}: DemoModeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [limits, setLimits] = useState<LimitsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if banner was previously dismissed in this session
    const dismissed = sessionStorage.getItem("demo-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }

    // Fetch demo configuration
    async function fetchConfig() {
      try {
        const response = await fetch("/api/demo/config");
        if (response.ok) {
          const data = await response.json();
          setConfig(data.config);
          setLimits(data.limitsSummary);
        }
      } catch (error) {
        console.error("Failed to fetch demo config:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("demo-banner-dismissed", "true");
  };

  // Don't render if dismissed, loading, or not in demo mode
  if (isDismissed || isLoading || !config?.isDemoMode) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800",
        className
      )}>
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" weight="fill" />
        <span className="text-xs text-amber-700 dark:text-amber-300">
          Demo Mode
        </span>
        {limits && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            • {limits.tokensRemaining.toLocaleString()} tokens remaining
          </span>
        )}
        {showUpgradeLink && (
          <a 
            href="https://case.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          >
            Get Full Access
            <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  if (variant === "floating") {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        className
      )}>
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
              <Lightning className="h-5 w-5 text-amber-600 dark:text-amber-400" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                You&apos;re in Demo Mode
              </h4>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Explore {config.appName} with limited features. 
                {limits && ` ${limits.tokensRemaining.toLocaleString()} tokens remaining.`}
              </p>
              {showUpgradeLink && (
                <a 
                  href="https://case.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                >
                  Unlock Full Access
                  <ArrowSquareOut className="h-3 w-3" />
                </a>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "relative bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-b border-amber-200 dark:border-amber-800",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" weight="fill" />
            </div>
            <div>
              <span className="text-sm text-amber-800 dark:text-amber-200">
                You&apos;re using a demo version of {config.appName}. Please avoid uploading sensitive or confidential data.
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {showUpgradeLink && (
              <a 
                href="https://case.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-md transition-colors shadow-sm"
              >
                <Lightning className="h-4 w-4" weight="fill" />
                Get Full Access
              </a>
            )}
            <button
              onClick={handleDismiss}
              className="p-1.5 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo Mode Badge Component
 * 
 * A small inline badge to indicate demo mode status.
 */
export function DemoModeBadge({ className }: { className?: string }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function checkDemoMode() {
      try {
        const response = await fetch("/api/demo/config");
        if (response.ok) {
          const data = await response.json();
          setIsDemoMode(data.config?.isDemoMode ?? false);
        }
      } catch {
        // Silently fail - assume not in demo mode
      }
    }
    checkDemoMode();
  }, []);

  if (!isDemoMode) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full",
      className
    )}>
      <Lightning className="h-3 w-3" weight="fill" />
      Demo
    </span>
  );
}

/**
 * Feature Gate Component
 * 
 * Wraps features that should be disabled or limited in demo mode.
 */
interface FeatureGateProps {
  feature: "documentUpload" | "advancedSearch" | "export" | "collaboration";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const [isAllowed, setIsAllowed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkFeature() {
      try {
        const response = await fetch("/api/demo/config");
        if (response.ok) {
          const data = await response.json();
          const disabledFeatures = data.disabledFeatures || [];
          setIsAllowed(!disabledFeatures.includes(feature));
        }
      } catch {
        // If we can't check, allow the feature
        setIsAllowed(true);
      } finally {
        setIsLoading(false);
      }
    }
    checkFeature();
  }, [feature]);

  if (isLoading) {
    return <>{children}</>;
  }

  if (!isAllowed) {
    return fallback || (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/10 dark:bg-neutral-100/10 rounded-md">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-700">
            <Warning className="h-4 w-4 text-amber-500" weight="fill" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Premium Feature
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
