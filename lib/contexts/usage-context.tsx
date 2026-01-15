"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  DemoUsage,
  UsageCheckResult,
  UsageUpdate,
  getUsage,
  updateUsage as updateUsageStorage,
  checkUsageLimits,
  getUsagePercentage,
  isApproachingLimit,
  formatRemainingTime,
  DEMO_CONFIG,
} from '@/lib/usage'

interface UsageContextValue {
  usage: DemoUsage | null
  limits: UsageCheckResult | null
  usagePercentage: number
  isApproaching: boolean
  remainingTime: string
  recordUsage: (update: UsageUpdate) => void
  refreshUsage: () => void
  showLimitDialog: boolean
  setShowLimitDialog: (show: boolean) => void
}

const UsageContext = createContext<UsageContextValue | null>(null)

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<DemoUsage | null>(null)
  const [limits, setLimits] = useState<UsageCheckResult | null>(null)
  const [usagePercentage, setUsagePercentage] = useState(0)
  const [isApproaching, setIsApproaching] = useState(false)
  const [remainingTime, setRemainingTime] = useState('')
  const [showLimitDialog, setShowLimitDialog] = useState(false)

  const refreshUsage = useCallback(() => {
    const currentUsage = getUsage()
    const currentLimits = checkUsageLimits()

    setUsage(currentUsage)
    setLimits(currentLimits)
    setUsagePercentage(getUsagePercentage())
    setIsApproaching(isApproachingLimit(80))
    setRemainingTime(formatRemainingTime())

    // Show dialog if limits exceeded
    if (!currentLimits.allowed) {
      setShowLimitDialog(true)
    }
  }, [])

  const recordUsage = useCallback((update: UsageUpdate) => {
    const updatedUsage = updateUsageStorage(update)
    setUsage(updatedUsage)

    const currentLimits = checkUsageLimits()
    setLimits(currentLimits)
    setUsagePercentage(getUsagePercentage())
    setIsApproaching(isApproachingLimit(80))

    if (!currentLimits.allowed) {
      setShowLimitDialog(true)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  // Update remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(formatRemainingTime())
      // Also check if session expired
      const currentLimits = checkUsageLimits()
      if (!currentLimits.allowed && currentLimits.reason === 'session_expired') {
        setLimits(currentLimits)
        setShowLimitDialog(true)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <UsageContext.Provider
      value={{
        usage,
        limits,
        usagePercentage,
        isApproaching,
        remainingTime,
        recordUsage,
        refreshUsage,
        showLimitDialog,
        setShowLimitDialog,
      }}
    >
      {children}
    </UsageContext.Provider>
  )
}

export function useUsage() {
  const context = useContext(UsageContext)
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider')
  }
  return context
}
