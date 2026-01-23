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

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

const ASSET_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'retirement', label: 'Retirement Account' },
  { value: 'household_goods', label: 'Household Goods' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'business', label: 'Business Interest' },
  { value: 'other', label: 'Other' },
];

export function AddAssetModal({ open, onOpenChange, caseId, onSuccess }: AddAssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    assetType: 'household_goods',
    description: '',
    currentValue: '',
    address: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    institution: '',
    accountNumberLast4: '',
    ownershipPercentage: '100',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.assetType || !formData.description || !formData.currentValue) {
      setError('Asset type, description, and current value are required.');
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
        `/api/cases/${caseId}/assets?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add asset');
      }

      // Reset form and close
      setFormData({
        assetType: 'household_goods',
        description: '',
        currentValue: '',
        address: '',
        make: '',
        model: '',
        year: '',
        vin: '',
        institution: '',
        accountNumberLast4: '',
        ownershipPercentage: '100',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showVehicleFields = formData.assetType === 'vehicle';
  const showRealEstateFields = formData.assetType === 'real_estate';
  const showAccountFields = ['bank_account', 'retirement'].includes(formData.assetType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Asset</DialogTitle>
          <DialogDescription>
            Enter asset information for the bankruptcy schedules.
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
              <Label htmlFor="assetType">Asset Type *</Label>
              <Select
                value={formData.assetType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assetType: value || prev.assetType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value ($) *</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Living room furniture, Checking account"
              required
            />
          </div>

          {showRealEstateFields && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
          )}

          {showVehicleFields && (
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                    placeholder="Honda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Accord"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                  placeholder="Vehicle Identification Number"
                />
              </div>
            </div>
          )}

          {showAccountFields && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="institution">Financial Institution</Label>
                <Input
                  id="institution"
                  value={formData.institution}
                  onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                  placeholder="e.g., Bank of America"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumberLast4">Account # (Last 4)</Label>
                <Input
                  id="accountNumberLast4"
                  maxLength={4}
                  value={formData.accountNumberLast4}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumberLast4: e.target.value }))}
                  placeholder="1234"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ownershipPercentage">Ownership Percentage (%)</Label>
            <Input
              id="ownershipPercentage"
              type="number"
              min="0"
              max="100"
              value={formData.ownershipPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, ownershipPercentage: e.target.value }))}
              placeholder="100"
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
                'Add Asset'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
