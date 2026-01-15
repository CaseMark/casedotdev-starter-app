"use client"

import { useUsage } from '@/lib/contexts/usage-context'
import { checkUsageLimits } from '@/lib/usage'

interface TrackedFetchOptions extends RequestInit {
  skipLimitCheck?: boolean
}

interface UsageInfo {
  inputTokens?: number
  outputTokens?: number
  ocrPages?: number
}

export function useUsageTrackedApi() {
  const { recordUsage, setShowLimitDialog, limits } = useUsage()

  async function trackedFetch<T>(
    url: string,
    options?: TrackedFetchOptions,
    usageExtractor?: (response: T) => UsageInfo
  ): Promise<T> {
    // Check limits before making request
    if (!options?.skipLimitCheck) {
      const currentLimits = checkUsageLimits()
      if (!currentLimits.allowed) {
        setShowLimitDialog(true)
        throw new DemoLimitExceededError(currentLimits.reason || 'limit_exceeded')
      }
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json() as T

    // Extract and record usage if extractor provided
    if (usageExtractor) {
      const usage = usageExtractor(data)
      if (usage.inputTokens || usage.outputTokens || usage.ocrPages) {
        recordUsage(usage)
      }
    }

    return data
  }

  async function generateEmbeddings(texts: string[], model?: string) {
    return trackedFetch<{
      embeddings: number[][]
      model: string
      tokensUsed: number
    }>(
      '/api/embeddings/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, model }),
      },
      (response) => ({
        inputTokens: response.tokensUsed,
      })
    )
  }

  async function submitOcr(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', file.name)

    return trackedFetch<{
      jobId: string
      status: string
    }>(
      '/api/ocr/process',
      {
        method: 'POST',
        body: formData,
      }
    )
  }

  async function checkOcrStatus(jobId: string) {
    return trackedFetch<{
      jobId: string
      status: string
      text?: string
      pageCount?: number
      error?: string
    }>(
      `/api/ocr/status/${jobId}`,
      { skipLimitCheck: true }, // Status checks don't consume resources
      (response) => ({
        ocrPages: response.status === 'completed' ? response.pageCount : undefined,
      })
    )
  }

  return {
    trackedFetch,
    generateEmbeddings,
    submitOcr,
    checkOcrStatus,
    limits,
  }
}

export class DemoLimitExceededError extends Error {
  reason: string

  constructor(reason: string) {
    super(`Demo limit exceeded: ${reason}`)
    this.name = 'DemoLimitExceededError'
    this.reason = reason
  }
}
