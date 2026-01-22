/**
 * case.dev Connection Component
 *
 * UI for connecting and disconnecting case.dev API keys
 * Shows connection status and provides input for new keys
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface ConnectionStatus {
  connected: boolean;
  last4?: string;
  verified?: boolean;
  database?: {
    status: 'existing' | 'created' | 'error' | 'provisioning';
    projectId?: string;
  };
}

interface DatabaseStatus {
  provisioned: boolean;
  userId?: string;
}

export function CaseDevConnect() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ provisioned: false });
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current status on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/case-dev/status').then(res => res.json()),
      fetch('/api/provision-database').then(res => res.json())
    ])
      .then(([caseDevData, dbData]) => {
        if (!caseDevData.error) {
          setStatus(caseDevData);
        }
        if (!dbData.error) {
          setDbStatus(dbData);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch status:', err);
      })
      .finally(() => {
        setFetchingStatus(false);
      });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/case-dev/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setSuccess(true);
      setApiKey('');
      setStatus({ connected: true, last4: data.last4, verified: true, database: data.database });

      // Refresh database status
      if (data.database?.status === 'created') {
        setDbStatus({ provisioned: true });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/case-dev/disconnect', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      setStatus({ connected: false });
      setSuccess(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>case.dev Integration</CardTitle>
          <CardDescription>Loading connection status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>case.dev Connected</CardTitle>
          <CardDescription>
            Your case.dev account is connected and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>API Key ending in: ****{status.last4}</span>
          </div>

          {/* Database Status */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium text-sm">Database Status</h4>
            <div className="flex items-center gap-2 text-sm">
              {dbStatus.provisioned ? (
                <>
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-green-700">Database provisioned and ready</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 text-yellow-600 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-yellow-700">Database provisioning in progress...</span>
                </>
              )}
            </div>
            {status.database?.status === 'created' && (
              <p className="text-xs text-muted-foreground">
                New database created: {status.database.projectId}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
            {loading ? 'Disconnecting...' : 'Disconnect case.dev'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect case.dev Account</CardTitle>
        <CardDescription>
          Enter your case.dev API key to enable bankruptcy automation features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <AlertDescription>
              case.dev account connected successfully!
              {status.database?.status === 'created' && (
                <span className="block mt-1 text-xs">
                  A dedicated database has been provisioned for your account.
                </span>
              )}
              {status.database?.status === 'existing' && (
                <span className="block mt-1 text-xs">
                  Using your existing database.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="api-key">case.dev API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk_case_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && apiKey) {
                handleConnect();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://console.case.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              console.case.dev
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </p>
        </div>

        <Button onClick={handleConnect} disabled={!apiKey || loading} className="w-full">
          {loading ? 'Connecting...' : 'Connect case.dev'}
        </Button>
      </CardContent>
    </Card>
  );
}
