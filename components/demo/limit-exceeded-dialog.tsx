"use client"

import { useUsage } from '@/lib/contexts/usage-context'
import { DEMO_CONFIG, formatCost } from '@/lib/usage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Warning } from '@phosphor-icons/react'

export function LimitExceededDialog() {
  const { showLimitDialog, setShowLimitDialog, limits } = useUsage()

  if (!limits || limits.allowed) return null

  const isSessionExpired = limits.reason === 'session_expired'
  const title = isSessionExpired ? 'Demo Session Expired' : 'Demo Limit Reached'
  const description = isSessionExpired
    ? `Your ${DEMO_CONFIG.sessionHours}-hour demo session has expired.`
    : `You've reached the ${formatCost(DEMO_CONFIG.sessionPriceLimit)} usage limit for this demo session.`

  const handleUpgrade = () => {
    window.open(DEMO_CONFIG.upgradeUrl, '_blank')
  }

  return (
    <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-orange-100 text-orange-600">
            <Warning size={24} weight="bold" />
          </div>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {description}
            <br />
            <br />
            Create a free account at Case.dev to continue using Discovery Desktop
            with higher limits and additional features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction onClick={handleUpgrade} className="w-full">
            Create Free Account
          </AlertDialogAction>
          <AlertDialogAction
            variant="outline"
            onClick={() => setShowLimitDialog(false)}
            className="w-full"
          >
            Continue Browsing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
