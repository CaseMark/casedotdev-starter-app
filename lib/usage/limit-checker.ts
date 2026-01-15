import { DEMO_CONFIG, getSessionDurationMs } from './config'
import { getUsage, getSessionExpiresAt } from './usage-storage'
import type { UsageCheckResult } from './types'

export function checkUsageLimits(): UsageCheckResult {
  const usage = getUsage()
  const now = Date.now()
  const sessionExpiresAt = usage.sessionStartedAt + getSessionDurationMs()

  // Check if session has expired
  if (now > sessionExpiresAt) {
    return {
      allowed: false,
      reason: 'session_expired',
      currentCost: usage.totalCostUsd,
      costLimit: DEMO_CONFIG.sessionPriceLimit,
      sessionExpiresAt,
      remainingBudget: 0,
    }
  }

  // Check if cost limit exceeded
  if (usage.totalCostUsd >= DEMO_CONFIG.sessionPriceLimit) {
    return {
      allowed: false,
      reason: 'cost_limit_exceeded',
      currentCost: usage.totalCostUsd,
      costLimit: DEMO_CONFIG.sessionPriceLimit,
      sessionExpiresAt,
      remainingBudget: 0,
    }
  }

  return {
    allowed: true,
    currentCost: usage.totalCostUsd,
    costLimit: DEMO_CONFIG.sessionPriceLimit,
    sessionExpiresAt,
    remainingBudget: DEMO_CONFIG.sessionPriceLimit - usage.totalCostUsd,
  }
}

export function isWithinLimits(): boolean {
  return checkUsageLimits().allowed
}

export function getUsagePercentage(): number {
  const usage = getUsage()
  return Math.min(100, (usage.totalCostUsd / DEMO_CONFIG.sessionPriceLimit) * 100)
}

export function isApproachingLimit(threshold: number = 80): boolean {
  return getUsagePercentage() >= threshold
}
