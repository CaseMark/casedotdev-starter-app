import { DEMO_CONFIG } from './config'
import type { UsageUpdate } from './types'

export function calculateInputTokenCost(tokens: number): number {
  return (tokens / 1_000_000) * DEMO_CONFIG.inputTokenCostPer1M
}

export function calculateOutputTokenCost(tokens: number): number {
  return (tokens / 1_000_000) * DEMO_CONFIG.outputTokenCostPer1M
}

export function calculateOcrCost(pages: number): number {
  return pages * DEMO_CONFIG.ocrPageCost
}

export function calculateTotalCost(
  inputTokens: number,
  outputTokens: number,
  ocrPages: number
): number {
  return (
    calculateInputTokenCost(inputTokens) +
    calculateOutputTokenCost(outputTokens) +
    calculateOcrCost(ocrPages)
  )
}

export function calculateUpdateCost(update: UsageUpdate): number {
  let cost = 0
  if (update.inputTokens) {
    cost += calculateInputTokenCost(update.inputTokens)
  }
  if (update.outputTokens) {
    cost += calculateOutputTokenCost(update.outputTokens)
  }
  if (update.ocrPages) {
    cost += calculateOcrCost(update.ocrPages)
  }
  return cost
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}

export function formatCostDetailed(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}
