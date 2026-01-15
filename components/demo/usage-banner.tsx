"use client"

import { useUsage } from '@/lib/contexts/usage-context'
import { formatCost } from '@/lib/usage'
import { Clock, CurrencyDollar } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function UsageBanner() {
  const { usage, usagePercentage, remainingTime, limits, isApproaching } = useUsage()

  if (!usage || !limits) return null

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-2 text-sm border-b',
        isApproaching
          ? 'bg-orange-50 border-orange-200 text-orange-800'
          : 'bg-muted/50 border-border text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-1.5">
        <CurrencyDollar size={16} weight="bold" />
        <span>
          {formatCost(usage.totalCostUsd)} / {formatCost(limits.costLimit)}
        </span>
      </div>

      <div className="flex-1 max-w-32">
        <div className="h-1.5 bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              isApproaching ? 'bg-orange-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, usagePercentage)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Clock size={16} weight="bold" />
        <span>{remainingTime} remaining</span>
      </div>

      <a
        href="https://console.case.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-xs font-medium hover:underline"
      >
        Upgrade for full access →
      </a>
    </div>
  )
}
