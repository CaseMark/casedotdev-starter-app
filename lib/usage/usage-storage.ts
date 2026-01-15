import { DEMO_CONFIG, getSessionDurationMs } from './config'
import { calculateTotalCost, calculateUpdateCost } from './cost-calculator'
import type { DemoUsage, UsageUpdate } from './types'

function generateSessionId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function createNewSession(): DemoUsage {
  const now = Date.now()
  return {
    sessionId: generateSessionId(),
    sessionStartedAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalOcrPages: 0,
    totalCostUsd: 0,
    lastUpdatedAt: now,
  }
}

export function getUsage(): DemoUsage {
  if (typeof window === 'undefined') {
    return createNewSession()
  }

  try {
    const stored = localStorage.getItem(DEMO_CONFIG.storageKey)
    if (!stored) {
      const newSession = createNewSession()
      saveUsage(newSession)
      return newSession
    }

    const usage = JSON.parse(stored) as DemoUsage
    const sessionDuration = getSessionDurationMs()
    const sessionExpired = Date.now() - usage.sessionStartedAt > sessionDuration

    if (sessionExpired) {
      const newSession = createNewSession()
      saveUsage(newSession)
      return newSession
    }

    return usage
  } catch {
    const newSession = createNewSession()
    saveUsage(newSession)
    return newSession
  }
}

export function saveUsage(usage: DemoUsage): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(DEMO_CONFIG.storageKey, JSON.stringify(usage))
  } catch {
    // localStorage might be full or disabled
  }
}

export function updateUsage(update: UsageUpdate): DemoUsage {
  const usage = getUsage()
  const now = Date.now()

  if (update.inputTokens) {
    usage.totalInputTokens += update.inputTokens
  }
  if (update.outputTokens) {
    usage.totalOutputTokens += update.outputTokens
  }
  if (update.ocrPages) {
    usage.totalOcrPages += update.ocrPages
  }

  usage.totalCostUsd = calculateTotalCost(
    usage.totalInputTokens,
    usage.totalOutputTokens,
    usage.totalOcrPages
  )
  usage.lastUpdatedAt = now

  saveUsage(usage)
  return usage
}

export function resetUsage(): DemoUsage {
  const newSession = createNewSession()
  saveUsage(newSession)
  return newSession
}

export function getSessionExpiresAt(): number {
  const usage = getUsage()
  return usage.sessionStartedAt + getSessionDurationMs()
}

export function getRemainingTime(): number {
  const expiresAt = getSessionExpiresAt()
  return Math.max(0, expiresAt - Date.now())
}

export function formatRemainingTime(): string {
  const remaining = getRemainingTime()
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
