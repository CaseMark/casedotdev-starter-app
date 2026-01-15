export const DEMO_CONFIG = {
  // Session duration in hours (default 24 hours)
  sessionHours: parseInt(process.env.NEXT_PUBLIC_DEMO_SESSION_HOURS || '24', 10),

  // Maximum cost limit in USD (default $5)
  sessionPriceLimit: parseFloat(process.env.NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT || '5'),

  // Cost per 1M input tokens (Claude pricing)
  inputTokenCostPer1M: 3, // $3 per 1M input tokens

  // Cost per 1M output tokens (Claude pricing)
  outputTokenCostPer1M: 15, // $15 per 1M output tokens

  // Cost per OCR page
  ocrPageCost: 0.02, // $0.02 per page

  // LocalStorage key for usage data
  storageKey: 'demo-usage',

  // Redirect URL when limits exceeded
  upgradeUrl: 'https://console.case.dev',
} as const

export function getSessionDurationMs(): number {
  return DEMO_CONFIG.sessionHours * 60 * 60 * 1000
}
