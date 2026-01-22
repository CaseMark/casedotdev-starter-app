/**
 * React Hooks for case.dev Integration
 *
 * Client-side hooks for checking connection status and managing case.dev API keys
 */

'use client';

import { useState, useEffect } from 'react';

interface CaseDevStatus {
  connected: boolean;
  last4?: string;
  verified?: boolean;
  loading: boolean;
  error?: string;
}

/**
 * Hook to get current case.dev connection status
 *
 * Fetches status on mount and provides loading/error states
 * Usage:
 *
 * const { connected, last4, loading } = useCaseDevStatus();
 */
export function useCaseDevStatus(): CaseDevStatus {
  const [status, setStatus] = useState<CaseDevStatus>({
    connected: false,
    loading: true,
  });

  useEffect(() => {
    fetch('/api/case-dev/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus({
            connected: false,
            loading: false,
            error: data.error,
          });
        } else {
          setStatus({
            ...data,
            loading: false,
          });
        }
      })
      .catch((err) => {
        setStatus({
          connected: false,
          loading: false,
          error: err.message || 'Failed to check connection status',
        });
      });
  }, []);

  return status;
}
