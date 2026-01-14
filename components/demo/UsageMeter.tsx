'use client';

import { cn } from '@/lib/utils';

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  className?: string;
  showPercentage?: boolean;
}

export function UsageMeter({
  label,
  used,
  limit,
  unit = '',
  className,
  showPercentage = true,
}: UsageMeterProps) {
  const percentage = Math.min(100, (used / limit) * 100);
  const remaining = Math.max(0, limit - used);

  const getColorClass = () => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 90) return 'bg-destructive/80';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-primary';
  };

  const getTextColorClass = () => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 90) return 'text-destructive/80';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const formatNumber = (num: number) => {
    // If it looks like a price (small decimal number), format as currency
    if (label.toLowerCase().includes('session') || label.toLowerCase().includes('price') || (num < 100 && num % 1 !== 0)) {
      return `$${num.toFixed(2)}`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('font-mono', getTextColorClass())}>
          {formatNumber(used)}/{formatNumber(limit)}{unit && unit !== '' && ` ${unit}`}
          {showPercentage && (
            <span className="ml-1">({percentage.toFixed(0)}%)</span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all duration-300', getColorClass())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage >= 75 && (
        <p className={cn('text-xs', getTextColorClass())}>
          {percentage >= 100
            ? 'Limit reached'
            : `${formatNumber(remaining)}${unit ? ` ${unit}` : ''} remaining`}
        </p>
      )}
    </div>
  );
}

interface UsageStatsCardProps {
  className?: string;
  documentsUsed?: number;
  documentsLimit?: number;
  tokensUsed?: number;
  tokensLimit?: number;
  pagesUsed?: number;
  pagesLimit?: number;
  // Price-based tracking
  priceUsed?: number;
  priceLimit?: number;
  timeRemaining?: string;
}

export function UsageStatsCard({
  className,
  documentsUsed = 0,
  documentsLimit = 20,
  tokensUsed = 0,
  tokensLimit = 50000,
  pagesUsed = 0,
  pagesLimit = 50,
  priceUsed = 0,
  priceLimit = 5,
  timeRemaining,
}: UsageStatsCardProps) {
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <div
      className={cn(
        'space-y-4 rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      <h3 className="text-sm font-medium text-foreground">Usage This Session</h3>
      <div className="space-y-3">
        {/* Single Session Limit meter - shows price used and time remaining */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Session Limit</span>
            <span className={cn('font-mono',
              priceUsed / priceLimit >= 1 ? 'text-destructive' :
              priceUsed / priceLimit >= 0.9 ? 'text-destructive/80' :
              priceUsed / priceLimit >= 0.75 ? 'text-amber-600 dark:text-amber-400' :
              'text-muted-foreground'
            )}>
              {formatPrice(priceUsed)}/{formatPrice(priceLimit)}
              <span className="ml-1">({((priceUsed / priceLimit) * 100).toFixed(0)}%)</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-300',
                priceUsed / priceLimit >= 1 ? 'bg-destructive' :
                priceUsed / priceLimit >= 0.9 ? 'bg-destructive/80' :
                priceUsed / priceLimit >= 0.75 ? 'bg-amber-500' :
                'bg-primary'
              )}
              style={{ width: `${Math.min(100, (priceUsed / priceLimit) * 100)}%` }}
            />
          </div>
          {timeRemaining && (
            <p className="text-xs text-muted-foreground">
              Resets in {timeRemaining}
            </p>
          )}
          {priceUsed / priceLimit >= 0.75 && (
            <p className={cn('text-xs',
              priceUsed / priceLimit >= 1 ? 'text-destructive' :
              priceUsed / priceLimit >= 0.9 ? 'text-destructive/80' :
              'text-amber-600 dark:text-amber-400'
            )}>
              {priceUsed / priceLimit >= 1
                ? 'Limit reached'
                : `${formatPrice(priceLimit - priceUsed)} remaining`}
            </p>
          )}
        </div>
        <UsageMeter
          label="Documents"
          used={documentsUsed}
          limit={documentsLimit}
          unit="docs"
        />
      </div>
    </div>
  );
}
