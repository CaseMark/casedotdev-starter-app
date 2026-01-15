export interface DemoUsage {
  sessionId: string
  sessionStartedAt: number // Unix timestamp
  totalInputTokens: number
  totalOutputTokens: number
  totalOcrPages: number
  totalCostUsd: number
  lastUpdatedAt: number
}

export interface UsageCheckResult {
  allowed: boolean
  reason?: 'session_expired' | 'cost_limit_exceeded'
  currentCost: number
  costLimit: number
  sessionExpiresAt: number
  remainingBudget: number
}

export interface UsageUpdate {
  inputTokens?: number
  outputTokens?: number
  ocrPages?: number
}
