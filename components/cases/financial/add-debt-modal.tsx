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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface AddDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'medical', label: 'Medical Bill' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'tax', label: 'Tax Debt' },
  { value: 'child_support', label: 'Child Support' },
  { value: 'other', label: 'Other' },
];

export function AddDebtModal({ open, onOpenChange, caseId, onSuccess }: AddDebtModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    creditorName: '',
    creditorAddress: '',
    accountLast4: '',
    balance: '',
    monthlyPayment: '',
    interestRate: '',
    debtType: 'credit_card',
    secured: false,
    priority: false,
    collateral: '',
    collateralValue: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.creditorName || !formData.balance || !formData.debtType) {
      setError('Creditor name, balance, and debt type are required.');
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
        `/api/cases/${caseId}/debts?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add debt');
      }

      // Reset form and close
      setFormData({
        creditorName: '',
        creditorAddress: '',
        accountLast4: '',
        balance: '',
        monthlyPayment: '',
        interestRate: '',
        debtType: 'credit_card',
        secured: false,
        priority: false,
        collateral: '',
        collateralValue: '',
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Debt</DialogTitle>
          <DialogDescription>
            Enter creditor and debt information.
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
              <Label htmlFor="creditorName">Creditor Name *</Label>
              <Input
                id="creditorName"
                value={formData.creditorName}
                onChange={(e) => setFormData(prev => ({ ...prev, creditorName: e.target.value }))}
                placeholder="e.g., Chase Bank"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debtType">Debt Type *</Label>
              <Select
                value={formData.debtType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, debtType: value || prev.debtType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[180px]">
                  {DEBT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditorAddress">Creditor Address</Label>
            <Input
              id="creditorAddress"
              value={formData.creditorAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, creditorAddress: e.target.value }))}
              placeholder="123 Main St, City, State ZIP"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Balance ($) *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyPayment">Monthly Payment ($)</Label>
              <Input
                id="monthlyPayment"
                type="number"
                step="0.01"
                value={formData.monthlyPayment}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPayment: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountLast4">Account # (Last 4 digits)</Label>
            <Input
              id="accountLast4"
              maxLength={4}
              value={formData.accountLast4}
              onChange={(e) => setFormData(prev => ({ ...prev, accountLast4: e.target.value }))}
              placeholder="1234"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="secured"
                checked={formData.secured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, secured: !!checked }))}
              />
              <Label htmlFor="secured" className="font-normal cursor-pointer">Secured Debt</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="priority"
                checked={formData.priority}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, priority: !!checked }))}
              />
              <Label htmlFor="priority" className="font-normal cursor-pointer">Priority Debt</Label>
            </div>
          </div>

          {formData.secured && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="collateral">Collateral Description</Label>
                <Input
                  id="collateral"
                  value={formData.collateral}
                  onChange={(e) => setFormData(prev => ({ ...prev, collateral: e.target.value }))}
                  placeholder="e.g., 2020 Honda Accord"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collateralValue">Collateral Value ($)</Label>
                <Input
                  id="collateralValue"
                  type="number"
                  step="0.01"
                  value={formData.collateralValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, collateralValue: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

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
                'Add Debt'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
