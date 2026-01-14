'use client';

import { Warning, ArrowSquareOut } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface LimitWarningProps {
  type: 'token' | 'document' | 'page' | 'price';
  className?: string;
  upgradeUrl?: string;
}

const warningMessages = {
  token: {
    title: 'Token Limit Reached',
    description: 'You\'ve used all available tokens for this session. Upgrade to continue processing documents.',
  },
  price: {
    title: 'Session Limit Reached',
    description: 'You\'ve reached the $5.00 session limit. Upgrade for unlimited processing.',
  },
  document: {
    title: 'Document Limit Reached',
    description: 'You\'ve reached the maximum number of documents for this session. Upgrade for unlimited documents.',
  },
  page: {
    title: 'Page Limit Reached',
    description: 'You\'ve processed the maximum number of pages today. Come back tomorrow or upgrade for more.',
  },
};

export function LimitWarning({ type, className, upgradeUrl = 'https://case.dev' }: LimitWarningProps) {
  const message = warningMessages[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50',
        className
      )}
    >
      <Warning className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" weight="fill" />
      <div className="flex-1">
        <h4 className="font-medium text-amber-800 dark:text-amber-200">{message.title}</h4>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{message.description}</p>
        {upgradeUrl && (
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Upgrade Now
            <ArrowSquareOut className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default LimitWarning;
