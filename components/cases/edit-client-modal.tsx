'use client';

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

interface CaseData {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  ssnLast4?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  caseType: string;
  filingType: string;
  householdSize?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  filingDate?: string;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: CaseData;
  onSuccess: (updatedCase: CaseData) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function EditClientModal({ open, onOpenChange, caseData, onSuccess }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    ssnLast4: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    filingType: 'individual',
    householdSize: '1',
  });

  // Populate form when case data changes or modal opens
  useEffect(() => {
    if (caseData && open) {
      setFormData({
        clientName: caseData.clientName || '',
        clientEmail: caseData.clientEmail || '',
        clientPhone: caseData.clientPhone || '',
        ssnLast4: caseData.ssnLast4 || '',
        address: caseData.address || '',
        city: caseData.city || '',
        state: caseData.state || '',
        zip: caseData.zip || '',
        county: caseData.county || '',
        filingType: caseData.filingType || 'individual',
        householdSize: String(caseData.householdSize || 1),
      });
      setError(null);
    }
  }, [caseData, open]);

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
        `/api/cases/${caseData.id}?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            householdSize: parseInt(formData.householdSize, 10),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update client information');
      }

      const data = await response.json();
      onSuccess(data.case);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Client Information</DialogTitle>
          <DialogDescription>
            Update the client details for this bankruptcy case.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Client Details</h3>

            <div className="space-y-2">
              <Label htmlFor="clientName">Full Name</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => updateFormData('clientName', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => updateFormData('clientEmail', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => updateFormData('clientPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ssnLast4">SSN Last 4 Digits</Label>
                <Input
                  id="ssnLast4"
                  value={formData.ssnLast4}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    updateFormData('ssnLast4', value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="householdSize">Household Size</Label>
                <Input
                  id="householdSize"
                  type="number"
                  min="1"
                  value={formData.householdSize}
                  onChange={(e) => updateFormData('householdSize', e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Address</h3>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => updateFormData('zip', e.target.value)}
                  placeholder="10001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={formData.county}
                  onChange={(e) => updateFormData('county', e.target.value)}
                  placeholder="New York"
                />
              </div>
            </div>
          </div>

          {/* Filing Type */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Filing Type</h3>
            <RadioGroup
              value={formData.filingType}
              onValueChange={(value) => updateFormData('filingType', value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="cursor-pointer font-normal">
                  Individual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="joint" id="joint" />
                <Label htmlFor="joint" className="cursor-pointer font-normal">
                  Joint (Married)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
