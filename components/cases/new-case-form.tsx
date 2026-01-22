"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2 } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function NewCaseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    ssnLast4: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    county: "",
    caseType: "chapter7" as "chapter7" | "chapter13",
    filingType: "individual" as "individual" | "joint",
    householdSize: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const caseId = `case_${Date.now()}`;
      const caseData = {
        id: caseId,
        ...formData,
        status: 'intake',
        createdAt: new Date().toISOString(),
      };

      // Get database connection string from localStorage
      const connectionString = localStorage.getItem('bankruptcy_db_connection');
      if (!connectionString) {
        throw new Error('Database not initialized. Please refresh the page.');
      }

      // Store case in database via API
      const response = await fetch('/api/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseData, connectionString }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create case');
      }

      // Redirect to cases list
      router.push(`/cases`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Case Type Selection */}
      <div className="space-y-4 bg-card p-6 rounded-lg border">
        <h2 className="text-lg font-semibold">Case Type</h2>

        <div className="space-y-4">
          <div>
            <Label className="text-base mb-3 block">Chapter Selection</Label>
            <RadioGroup
              value={formData.caseType}
              onValueChange={(value) => updateFormData("caseType", value)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent">
                <RadioGroupItem value="chapter7" id="chapter7" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="chapter7" className="cursor-pointer">
                    <div className="font-medium">Chapter 7</div>
                    <p className="text-sm text-muted-foreground">
                      Liquidation bankruptcy - typically 4-6 months
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent opacity-50 cursor-not-allowed">
                <RadioGroupItem
                  value="chapter13"
                  id="chapter13"
                  disabled
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="chapter13" className="cursor-not-allowed">
                    <div className="font-medium flex items-center gap-2">
                      Chapter 13
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Repayment plan - typically 3-5 years
                    </p>
                  </label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base mb-3 block">Filing Type</Label>
            <RadioGroup
              value={formData.filingType}
              onValueChange={(value) => updateFormData("filingType", value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="cursor-pointer">
                  Individual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="joint" id="joint" />
                <Label htmlFor="joint" className="cursor-pointer">
                  Joint (Married)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4 bg-card p-6 rounded-lg border">
        <h2 className="text-lg font-semibold">Client Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="clientName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => updateFormData("clientName", e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="clientEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={formData.clientEmail}
              onChange={(e) => updateFormData("clientEmail", e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="clientPhone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientPhone"
              type="tel"
              value={formData.clientPhone}
              onChange={(e) => updateFormData("clientPhone", e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div>
            <Label htmlFor="ssnLast4">
              SSN Last 4 Digits <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ssnLast4"
              value={formData.ssnLast4}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                updateFormData("ssnLast4", value);
              }}
              placeholder="1234"
              maxLength={4}
              required
              minLength={4}
            />
          </div>

          <div>
            <Label htmlFor="householdSize">
              Household Size <span className="text-destructive">*</span>
            </Label>
            <Input
              id="householdSize"
              type="number"
              min="1"
              value={formData.householdSize}
              onChange={(e) => updateFormData("householdSize", e.target.value)}
              placeholder="1"
              required
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4 bg-card p-6 rounded-lg border">
        <h2 className="text-lg font-semibold">Address</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateFormData("address", e.target.value)}
              placeholder="123 Main St"
              required
            />
          </div>

          <div>
            <Label htmlFor="city">
              City <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateFormData("city", e.target.value)}
              placeholder="New York"
              required
            />
          </div>

          <div>
            <Label htmlFor="state">
              State <span className="text-destructive">*</span>
            </Label>
            <select
              id="state"
              value={formData.state}
              onChange={(e) => updateFormData("state", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Select State</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="zip">
              ZIP Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={(e) => updateFormData("zip", e.target.value)}
              placeholder="10001"
              required
            />
          </div>

          <div>
            <Label htmlFor="county">
              County <span className="text-destructive">*</span>
            </Label>
            <Input
              id="county"
              value={formData.county}
              onChange={(e) => updateFormData("county", e.target.value)}
              placeholder="New York"
              required
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={loading} className="min-w-[120px]">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Case"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/cases")}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
