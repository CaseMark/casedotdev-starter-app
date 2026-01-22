/**
 * case.dev Settings Page
 *
 * Allows users to connect/disconnect their case.dev API key
 * Shows what features will be enabled after connection
 */

import { CaseDevConnect } from '@/components/case-dev/connect-button';

export default function CaseDevSettingsPage() {
  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">case.dev Integration</h1>
          <p className="text-muted-foreground mt-2">
            Connect your case.dev account to enable AI-powered bankruptcy automation
          </p>
        </div>

        {/* Connection Component */}
        <CaseDevConnect />

        {/* Features List */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold">What you'll be able to do:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Automatic OCR and document extraction from uploaded files</li>
            <li>AI-powered financial data analysis and categorization</li>
            <li>Automated bankruptcy form generation (Forms 101, 106A-J, 107, 122A)</li>
            <li>Chapter 13 repayment plan calculation and tracking</li>
            <li>Secure encrypted document storage in case.dev Vaults</li>
            <li>Real-time means test calculations</li>
            <li>Intelligent creditor data extraction</li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
          <h3 className="font-semibold text-sm">Security & Privacy</h3>
          <p className="text-xs text-muted-foreground">
            Your API key is encrypted using AES-256-GCM before storage and is never
            exposed in logs or UI. Only you can access your case.dev account through
            this application. All data is transmitted over HTTPS and stored in
            compliance with SOC 2 Type II and HIPAA standards.
          </p>
        </div>

        {/* Help Link */}
        <div className="text-center text-sm text-muted-foreground">
          Need help?{' '}
          <a
            href="https://docs.case.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View case.dev documentation
          </a>
        </div>
      </div>
    </div>
  );
}
