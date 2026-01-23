'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

const PAY_PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const INCOME_SOURCES = [
  { value: 'employment', label: 'Employment' },
  { value: 'business', label: 'Self-Employment/Business' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'government', label: 'Government Benefits' },
  { value: 'other', label: 'Other' },
];

export function AddIncomeModal({ open, onOpenChange, caseId, onSuccess }: AddIncomeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employer: '',
    occupation: '',
    grossPay: '',
    netPay: '',
    payPeriod: 'monthly',
    incomeSource: 'employment',
    ytdGross: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const connectionString = localStorage.getItem('bankruptcy_db_connection');

    if (!connectionString) {
      setError('Database connection not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/cases/${caseId}/income?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add income');
      }

      // Reset form and close
      setFormData({
        employer: '',
        occupation: '',
        grossPay: '',
        netPay: '',
        payPeriod: 'monthly',
        incomeSource: 'employment',
        ytdGross: '',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Income Source</DialogTitle>
          <DialogDescription>
            Enter income details for the bankruptcy case.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incomeSource">Income Source</Label>
              <Select
                value={formData.incomeSource}
                onValueChange={(value) => setFormData(prev => ({ ...prev, incomeSource: value || prev.incomeSource }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[240px]">
                  {INCOME_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payPeriod">Pay Period</Label>
              <Select
                value={formData.payPeriod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payPeriod: value || prev.payPeriod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[160px]">
                  {PAY_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employer">Employer / Source Name</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
              placeholder="e.g., ABC Company"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation / Description</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grossPay">Gross Pay ($)</Label>
              <Input
                id="grossPay"
                type="number"
                step="0.01"
                value={formData.grossPay}
                onChange={(e) => setFormData(prev => ({ ...prev, grossPay: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="netPay">Net Pay ($)</Label>
              <Input
                id="netPay"
                type="number"
                step="0.01"
                value={formData.netPay}
                onChange={(e) => setFormData(prev => ({ ...prev, netPay: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ytdGross">Year-to-Date Gross ($)</Label>
            <Input
              id="ytdGross"
              type="number"
              step="0.01"
              value={formData.ytdGross}
              onChange={(e) => setFormData(prev => ({ ...prev, ytdGross: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Income'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
