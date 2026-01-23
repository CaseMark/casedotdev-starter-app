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

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing (Rent/Mortgage)' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'food', label: 'Food' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'medical', label: 'Medical/Healthcare' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'debt_payments', label: 'Debt Payments' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export function AddExpenseModal({ open, onOpenChange, caseId, onSuccess }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    monthlyAmount: '',
  });

  const getCategoryLabel = (value: string) => {
    const found = EXPENSE_CATEGORIES.find(cat => cat.value === value);
    return found ? found.label : 'Choose One...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.category || !formData.monthlyAmount) {
      setError('Category and monthly amount are required.');
      setLoading(false);
      return;
    }

    const connectionString = localStorage.getItem('bankruptcy_db_connection');

    if (!connectionString) {
      setError('Database connection not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/cases/${caseId}/expenses?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add expense');
      }

      // Reset form and close
      setFormData({
        category: '',
        description: '',
        monthlyAmount: '',
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Monthly Expense</DialogTitle>
          <DialogDescription>
            Enter monthly living expense for Schedule J.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value || prev.category }))}
            >
              <SelectTrigger>
                <SelectValue>
                  {formData.category ? getCategoryLabel(formData.category) : 'Choose One...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[240px]">
                <SelectItem value="" disabled>Choose One...</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Electric bill, Groceries"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyAmount">Monthly Amount ($) *</Label>
            <Input
              id="monthlyAmount"
              type="number"
              step="0.01"
              value={formData.monthlyAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, monthlyAmount: e.target.value }))}
              placeholder="0.00"
              required
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
                'Add Expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
