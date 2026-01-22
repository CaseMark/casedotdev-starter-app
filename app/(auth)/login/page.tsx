'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Scale, AlertCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { provisionDatabase } from '@/lib/database/provision';

export default function SimpleLoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Verifying...');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your case.dev API key');
      return;
    }

    if (!apiKey.startsWith('sk_case_')) {
      setError('Invalid API key format. Key should start with sk_case_');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying API key...');
    setError(null);

    try {
      // Verify the API key works by making a test call
      const response = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error message from API
        setError(data.error || 'Invalid API key');
        setLoading(false);
        return;
      }

      // Store API key in localStorage
      localStorage.setItem('casedev_api_key', apiKey);

      // Provision/retrieve database - this ensures we always have the correct
      // database connection, even if localStorage was cleared
      setLoadingMessage('Connecting to your database...');
      try {
        await provisionDatabase(apiKey);
        console.log('Database provisioned/retrieved successfully during login');
      } catch (dbError: any) {
        console.error('Database provisioning failed during login:', dbError);
        // Don't block login if database provisioning fails - cases page will retry
        // But log it for debugging
      }

      // Redirect to cases
      router.push('/cases');
    } catch (err: any) {
      setError(err.message || 'Invalid API key - please check your key');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#f7f5f3' }}>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">Bankruptcy Tool</h1>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Automate Chapter 7 and Chapter 13 bankruptcy workflows
          </p>
          {/* Built with case.dev button */}
          <a
            href="https://case.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
          >
            <span>built with</span>
            <Image
              src="/case.dev-mark.svg"
              alt="case.dev"
              width={14}
              height={14}
              className="dark:invert"
            />
            <span className="font-semibold">case.dev</span>
          </a>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Connect Your case.dev Account</CardTitle>
            <CardDescription>
              Enter your case.dev API key to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey) {
                    handleLogin();
                  }
                }}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://console.case.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.case.dev
                </a>
              </p>
            </div>

            <Button
              onClick={handleLogin}
              disabled={!apiKey || loading}
              className="w-full"
            >
              {loading ? loadingMessage : 'Continue'}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">What you can do:</h3>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Automatic OCR and document extraction</li>
            <li>AI-powered financial data analysis</li>
            <li>Automated bankruptcy form generation</li>
            <li>Secure document storage with encryption</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
