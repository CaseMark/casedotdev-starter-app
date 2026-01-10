"use client";

import { useState, useEffect } from "react";
import {
  Info,
  X,
  ArrowSquareOut,
  Lightning,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DemoBannerProps {
  position?: "top" | "bottom";
  dismissible?: boolean;
  showLimitations?: boolean;
  className?: string;
  variant?: "default" | "compact" | "floating";
}

interface DemoConfig {
  isDemoMode: boolean;
  appName: string;
  upgradeUrl: string;
  contactEmail: string;
  demoExpiryDays: number;
}

interface LimitsSummary {
  tokens: string[];
  ocr: string[];
  features: string[];
}

export function DemoBanner({
  position = "top",
  dismissible = true,
  showLimitations = false,
  className,
  variant = "default",
}: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(showLimitations);
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [limits, setLimits] = useState<LimitsSummary | null>(null);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/demo/config");
        if (response.ok) {
          const data = await response.json();
          setConfig(data.config);
          setLimits(data.limitsSummary);
          setDisabledFeatures(data.disabledFeatures || []);
        }
      } catch {
        setConfig({
          isDemoMode: true,
          appName: "Multi-Language Processor",
          upgradeUrl: "https://case.dev",
          contactEmail: "sales@case.dev",
          demoExpiryDays: 0,
        });
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("demo-banner-dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("demo-banner-dismissed", "true");
  };

  if (dismissed || !config?.isDemoMode) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
          className
        )}
      >
        <Lightning className="h-3 w-3" weight="fill" />
        Demo Mode
        {config.upgradeUrl && config.upgradeUrl !== "#" && (
          <a
            href={config.upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline hover:no-underline"
          >
            Upgrade
          </a>
        )}
      </div>
    );
  }

  if (variant === "floating") {
    return (
      <div
        className={cn(
          "fixed z-50 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg dark:border-amber-800 dark:bg-amber-950",
          position === "top" ? "right-4 top-4" : "bottom-4 right-4",
          className
        )}
      >
        <Lightning className="h-4 w-4 text-amber-600 dark:text-amber-400" weight="fill" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Demo Mode
        </span>
        {config.upgradeUrl && config.upgradeUrl !== "#" && (
          <a
            href={config.upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          >
            Upgrade
            <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-1 rounded p-0.5 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/50 dark:to-orange-950/50",
        position === "bottom" && "border-b-0 border-t",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
              <Lightning className="h-3 w-3" weight="fill" />
              DEMO MODE
            </span>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              You&apos;re using a demo version of {config.appName}. Please avoid uploading sensitive or confidential data.
            </span>
            {config.demoExpiryDays > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Warning className="h-3 w-3" />
                Expires in {config.demoExpiryDays} days
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-amber-700 underline hover:no-underline dark:text-amber-300"
            >
              {expanded ? "Hide limitations" : "View limitations"}
            </button>
            {config.upgradeUrl && config.upgradeUrl !== "#" && (
              <a
                href={config.upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                Upgrade Now
                <ArrowSquareOut className="h-3.5 w-3.5" />
              </a>
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="rounded p-1 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {expanded && limits && (
          <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-700">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                  <Info className="h-3 w-3" />
                  Token Limits
                </h4>
                <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {limits.tokens.map((limit, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-amber-500" />
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                  <Info className="h-3 w-3" />
                  Document Limits
                </h4>
                <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {limits.ocr.map((limit, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-amber-500" />
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>

              {disabledFeatures.length > 0 && (
                <div>
                  <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                    <Info className="h-3 w-3" />
                    Feature Limits
                  </h4>
                  <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                    {disabledFeatures.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                        {feature}
                      </li>
                    ))}
                    {disabledFeatures.length > 5 && (
                      <li className="text-amber-600 dark:text-amber-400">
                        +{disabledFeatures.length - 5} more features
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {config.contactEmail && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Questions about upgrading?{" "}
                <a
                  href={`mailto:${config.contactEmail}`}
                  className="underline hover:no-underline"
                >
                  Contact us at {config.contactEmail}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DemoModeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
        className
      )}
    >
      <Lightning className="h-3 w-3" weight="fill" />
      Demo
    </span>
  );
}

export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState("#");

  useEffect(() => {
    async function checkFeature() {
      try {
        const response = await fetch("/api/demo/config");
        if (response.ok) {
          const data = await response.json();
          const featureKey = `enable${feature}` as keyof typeof data.config.features;
          setEnabled(data.config.features?.[featureKey] ?? true);
          setUpgradeUrl(data.config.upgradeUrl || "#");
        }
      } catch {
        setEnabled(true);
      }
    }
    checkFeature();
  }, [feature]);

  if (enabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-6 text-center">
      <Lightning className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="mb-1 font-medium text-foreground">{feature} is a premium feature</p>
      <p className="mb-3 text-sm text-muted-foreground">
        Upgrade your plan to unlock this feature
      </p>
      {upgradeUrl !== "#" && (
        <a
          href={upgradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Upgrade Now
          <ArrowSquareOut className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
