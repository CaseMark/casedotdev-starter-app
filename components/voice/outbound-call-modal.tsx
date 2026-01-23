"use client";

import { useState, useEffect } from "react";
import { Phone, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  validateUSPhoneNumber,
  formatToE164,
  formatForDisplay,
} from "@/lib/utils/phone-validation";

interface OutboundCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  caseId: string;
  existingPhone?: string;
  onCallScheduled: () => void;
}

export function OutboundCallModal({
  open,
  onOpenChange,
  clientName,
  caseId,
  existingPhone,
  onCallScheduled,
}: OutboundCallModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(existingPhone || "");
  const [isValid, setIsValid] = useState(false);
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Validate phone number whenever it changes
  useEffect(() => {
    if (phoneNumber) {
      const valid = validateUSPhoneNumber(phoneNumber);
      setIsValid(valid);
      if (!valid && phoneNumber.length >= 10) {
        setShowError(true);
      } else {
        setShowError(false);
      }
    } else {
      setIsValid(false);
      setShowError(false);
    }
  }, [phoneNumber]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setPhoneNumber(existingPhone || "");
      setShowError(false);
      setApiError(null);
    }
  }, [open, existingPhone]);

  const handleConfirm = async () => {
    if (!isValid) {
      setShowError(true);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      // Get database connection from localStorage
      const connectionString = localStorage.getItem('bankruptcy_db_connection');
      if (!connectionString) {
        throw new Error('Database connection not found. Please refresh the page.');
      }

      // Format phone to E.164 format
      const formattedPhone = formatToE164(phoneNumber);

      // Call API to initiate outbound call
      const response = await fetch(
        `/api/vapi/outbound?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId,
            phoneNumber: formattedPhone,
            clientName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to schedule call");
      }

      // Success - call the callback and close modal
      onCallScheduled();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error scheduling outbound call:", error);
      setApiError(error.message || "Unable to schedule call. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="w-5 h-5 text-primary" />
            Schedule Intake Call
          </DialogTitle>
          <DialogDescription>
            Schedule an intake call for <strong>{clientName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Please confirm phone number:</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              className={showError ? "border-red-500" : ""}
            />
            {showError && (
              <p className="text-sm text-red-500">
                Phone number is not valid
              </p>
            )}
          </div>

          {phoneNumber && isValid && (
            <div className="text-sm text-muted-foreground">
              Will call: {formatForDisplay(phoneNumber)}
            </div>
          )}

          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-blue-900">
              Our AI assistant will call this number to conduct the bankruptcy intake interview.
              The call will update this case with the collected information.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Confirm Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
