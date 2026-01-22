'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FileText,
  Upload,
  DollarSign,
  Calculator,
  ChevronRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { DocumentUpload } from "@/components/cases/document-upload";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";

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

interface Document {
  id: string;
  fileName: string;
  validationStatus: string;
  uploadedAt: string;
}

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = localStorage.getItem('casedev_api_key');
    if (!apiKey) {
      router.push('/login');
      return;
    }

    const connectionString = localStorage.getItem('bankruptcy_db_connection');
    if (!connectionString) {
      setError('Database not initialized. Please log in again.');
      setLoading(false);
      return;
    }

    fetchCaseData(connectionString);
    fetchDocuments(connectionString);
  }, [id, router]);

  const fetchCaseData = async (connectionString: string) => {
    try {
      const response = await fetch(
        `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Case not found');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch case');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCaseData(data.case);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching case:', err);
      setError('Failed to fetch case data');
      setLoading(false);
    }
  };

  const fetchDocuments = async (connectionString: string) => {
    try {
      const response = await fetch(
        `/api/cases/${id}/documents?connectionString=${encodeURIComponent(connectionString)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      // Don't set error - documents are optional
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
        <Link href="/cases" className="text-primary hover:underline mt-4 inline-block">
          ← Back to Cases
        </Link>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-muted-foreground">Case not found</div>
        <Link href="/cases" className="text-primary hover:underline mt-4 inline-block">
          ← Back to Cases
        </Link>
      </div>
    );
  }

  const documentStats = {
    total: documents.length,
    valid: documents.filter((d) => d.validationStatus === "valid").length,
    pending: documents.filter((d) => d.validationStatus === "pending").length,
    invalid: documents.filter((d) => d.validationStatus === "invalid").length,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/cases" className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>{caseData.clientName}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {caseData.clientName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {caseData.caseType === "chapter7" ? "Chapter 7" : "Chapter 13"}{" "}
              Bankruptcy Case
            </p>
          </div>
          <CaseStatusBadge status={caseData.status} />
        </div>
      </div>

      {/* Case Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Client Information</h3>
          <dl className="space-y-2 text-sm">
            {caseData.clientEmail && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{caseData.clientEmail}</dd>
              </div>
            )}
            {caseData.clientPhone && (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{caseData.clientPhone}</dd>
              </div>
            )}
            {caseData.ssnLast4 && (
              <div>
                <dt className="text-muted-foreground">SSN</dt>
                <dd className="font-medium">***-**-{caseData.ssnLast4}</dd>
              </div>
            )}
            {caseData.householdSize && (
              <div>
                <dt className="text-muted-foreground">Household Size</dt>
                <dd className="font-medium">{caseData.householdSize}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Address</h3>
          <div className="text-sm">
            {caseData.address && <p>{caseData.address}</p>}
            {caseData.city && caseData.state && (
              <p>
                {caseData.city}, {caseData.state} {caseData.zip}
              </p>
            )}
            {caseData.county && (
              <p className="text-muted-foreground mt-1">
                {caseData.county} County
              </p>
            )}
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Case Details</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Filing Type</dt>
              <dd className="font-medium capitalize">{caseData.filingType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {new Date(caseData.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {caseData.filingDate && (
              <div>
                <dt className="text-muted-foreground">Filed</dt>
                <dd className="font-medium">
                  {new Date(caseData.filingDate).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href={`/cases/${id}/documents`}
          className="bg-card p-4 rounded-lg border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Documents</div>
              <div className="text-sm text-muted-foreground">
                {documentStats.valid}/{documentStats.total} validated
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/financial`}
          className="bg-card p-4 rounded-lg border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Financial Data</div>
              <div className="text-sm text-muted-foreground">
                Income, debts, assets
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/means-test`}
          className="bg-card p-4 rounded-lg border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Means Test</div>
              <div className="text-sm text-muted-foreground">
                Chapter 7 eligibility
              </div>
            </div>
          </div>
        </Link>

        <Link
          href={`/cases/${id}/forms`}
          className="bg-card p-4 rounded-lg border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Forms</div>
              <div className="text-sm text-muted-foreground">
                Generate & review
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Document Upload Section */}
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <p className="text-sm text-muted-foreground">
              Upload client documents for automatic processing
            </p>
          </div>
        </div>

        <DocumentUpload caseId={id} />

        {/* Recent Documents */}
        {documents.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Recent Documents</h3>
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      doc.validationStatus === "valid"
                        ? "bg-green-100 text-green-700"
                        : doc.validationStatus === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {doc.validationStatus}
                  </span>
                </div>
              ))}
              {documents.length > 5 && (
                <Link
                  href={`/cases/${id}/documents`}
                  className="block text-center text-sm text-primary hover:underline py-2"
                >
                  View all {documents.length} documents →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
