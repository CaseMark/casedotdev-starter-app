"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Printer,
  Send,
  FileCheck,
  FilePlus,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";

interface BankruptcyCase {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
  filingDate: string | null;
  courtDistrict: string | null;
  caseNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Form {
  id: string;
  name: string;
  title: string;
  description: string;
  status: "ready" | "pending" | "not_started";
  required: boolean;
  pages: number;
  lastGenerated: Date | null;
  completeness: number;
}

export default function CaseFormsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<BankruptcyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Fetch case data
  useEffect(() => {
    if (!id) return;

    const apiKey = localStorage.getItem("casedev_api_key");
    const connectionString = localStorage.getItem("bankruptcy_db_connection");

    if (!apiKey || !connectionString) {
      router.push("/login");
      return;
    }

    const fetchCase = async () => {
      try {
        const response = await fetch(
          `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Case not found");
          } else {
            throw new Error("Failed to fetch case");
          }
          return;
        }

        const data = await response.json();
        setCaseData(data.case);
      } catch (err) {
        console.error("Error fetching case:", err);
        setError("Failed to load case data");
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, router]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">{error || "Case not found"}</h2>
          <Link
            href="/cases"
            className="text-primary hover:underline"
          >
            Return to Cases
          </Link>
        </div>
      </div>
    );
  }

  // Mock forms data - in production this would come from the database
  const isChapter7 = caseData.caseType === "chapter7";
  
  const forms: Form[] = [
    // Voluntary Petition
    {
      id: "b101",
      name: "Official Form 101",
      title: "Voluntary Petition for Individuals Filing for Bankruptcy",
      description: "The main bankruptcy petition form with debtor information",
      status: "ready",
      required: true,
      pages: 8,
      lastGenerated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completeness: 95,
    },
    // Schedules A/B - Property
    {
      id: "b106ab",
      name: "Official Form 106A/B",
      title: "Schedule A/B: Property",
      description: "List of all real and personal property",
      status: "ready",
      required: true,
      pages: 12,
      lastGenerated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completeness: 100,
    },
    // Schedule C - Exemptions
    {
      id: "b106c",
      name: "Official Form 106C",
      title: "Schedule C: The Property You Claim as Exempt",
      description: "Property claimed as exempt from the bankruptcy estate",
      status: "ready",
      required: true,
      pages: 4,
      lastGenerated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completeness: 88,
    },
    // Schedule D - Secured Claims
    {
      id: "b106d",
      name: "Official Form 106D",
      title: "Schedule D: Creditors Who Hold Claims Secured by Property",
      description: "List of secured creditors (mortgages, car loans, etc.)",
      status: "ready",
      required: true,
      pages: 4,
      lastGenerated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completeness: 100,
    },
    // Schedule E/F - Unsecured Claims
    {
      id: "b106ef",
      name: "Official Form 106E/F",
      title: "Schedule E/F: Creditors Who Have Unsecured Claims",
      description: "List of priority and nonpriority unsecured creditors",
      status: "pending",
      required: true,
      pages: 8,
      lastGenerated: null,
      completeness: 72,
    },
    // Schedule G - Executory Contracts
    {
      id: "b106g",
      name: "Official Form 106G",
      title: "Schedule G: Executory Contracts and Unexpired Leases",
      description: "List of ongoing contracts and leases",
      status: "not_started",
      required: true,
      pages: 2,
      lastGenerated: null,
      completeness: 0,
    },
    // Schedule H - Codebtors
    {
      id: "b106h",
      name: "Official Form 106H",
      title: "Schedule H: Your Codebtors",
      description: "List of anyone else liable on your debts",
      status: "not_started",
      required: true,
      pages: 2,
      lastGenerated: null,
      completeness: 0,
    },
    // Schedule I - Income
    {
      id: "b106i",
      name: "Official Form 106I",
      title: "Schedule I: Your Income",
      description: "Current income from all sources",
      status: "ready",
      required: true,
      pages: 4,
      lastGenerated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completeness: 100,
    },
    // Schedule J - Expenses
    {
      id: "b106j",
      name: "Official Form 106J",
      title: "Schedule J: Your Expenses",
      description: "Current monthly expenses",
      status: "ready",
      required: true,
      pages: 4,
      lastGenerated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completeness: 100,
    },
    // Statement of Financial Affairs
    {
      id: "b107",
      name: "Official Form 107",
      title: "Statement of Financial Affairs for Individuals Filing for Bankruptcy",
      description: "Detailed financial history and transactions",
      status: "pending",
      required: true,
      pages: 12,
      lastGenerated: null,
      completeness: 45,
    },
    // Chapter 7 Means Test
    ...(isChapter7 ? [{
      id: "b122a1",
      name: "Official Form 122A-1",
      title: "Chapter 7 Statement of Your Current Monthly Income",
      description: "Means test calculation for Chapter 7 eligibility",
      status: "ready" as const,
      required: true,
      pages: 4,
      lastGenerated: new Date(Date.now() - 3 * 60 * 60 * 1000),
      completeness: 100,
    }] : []),
    // Chapter 7 Means Test Calculation (if above median)
    ...(isChapter7 ? [{
      id: "b122a2",
      name: "Official Form 122A-2",
      title: "Chapter 7 Means Test Calculation",
      description: "Detailed means test if income exceeds state median",
      status: "ready" as const,
      required: false,
      pages: 8,
      lastGenerated: new Date(Date.now() - 3 * 60 * 60 * 1000),
      completeness: 100,
    }] : []),
    // Declaration
    {
      id: "b119",
      name: "Official Form 119",
      title: "Bankruptcy Petition Preparer's Notice, Declaration, and Signature",
      description: "Required if a non-attorney preparer assisted",
      status: "not_started",
      required: false,
      pages: 2,
      lastGenerated: null,
      completeness: 0,
    },
    // Cover Sheet
    {
      id: "b121",
      name: "Official Form 121",
      title: "Statement About Your Social Security Numbers",
      description: "SSN verification for court records",
      status: "ready",
      required: true,
      pages: 1,
      lastGenerated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completeness: 100,
    },
  ];

  const stats = {
    total: forms.length,
    ready: forms.filter(f => f.status === "ready").length,
    pending: forms.filter(f => f.status === "pending").length,
    notStarted: forms.filter(f => f.status === "not_started").length,
    required: forms.filter(f => f.required).length,
    requiredComplete: forms.filter(f => f.required && f.status === "ready").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "not_started":
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Ready</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>;
      case "not_started":
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Not Started</span>;
      default:
        return null;
    }
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
          <Link href={`/cases/${id}`} className="hover:text-foreground">
            {caseData.clientName}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>Forms</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bankruptcy Forms</h1>
            <p className="text-muted-foreground mt-1">
              {isChapter7 ? "Chapter 7" : "Chapter 13"} Official Bankruptcy Forms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4" />
              Regenerate All
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Download Package
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Forms</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.ready}</div>
              <div className="text-sm text-muted-foreground">Ready to File</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.requiredComplete}/{stats.required}</div>
              <div className="text-sm text-muted-foreground">Required Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="bg-card p-6 rounded-lg border mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-primary" />
            <div>
              <h2 className="font-semibold">Filing Progress</h2>
              <p className="text-sm text-muted-foreground">
                {stats.requiredComplete} of {stats.required} required forms ready
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round((stats.requiredComplete / stats.required) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${(stats.requiredComplete / stats.required) * 100}%` }}
          />
        </div>
        {stats.requiredComplete < stats.required && (
          <p className="text-sm text-muted-foreground mt-3">
            <Info className="w-4 h-4 inline mr-1" />
            Complete all required forms before filing with the court
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button className="flex items-center gap-3 p-4 bg-card rounded-lg border hover:shadow-md transition-shadow text-left">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FilePlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold">Generate Missing Forms</div>
            <div className="text-sm text-muted-foreground">
              Auto-populate {stats.notStarted + stats.pending} incomplete forms
            </div>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-card rounded-lg border hover:shadow-md transition-shadow text-left">
          <div className="p-2 bg-green-100 rounded-lg">
            <Printer className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-semibold">Print All Ready Forms</div>
            <div className="text-sm text-muted-foreground">
              Print {stats.ready} forms for client review
            </div>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-card rounded-lg border hover:shadow-md transition-shadow text-left">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Send className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold">E-File with Court</div>
            <div className="text-sm text-muted-foreground">
              Submit to bankruptcy court electronically
            </div>
          </div>
        </button>
      </div>

      {/* Forms List */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Forms</h2>
        </div>
        <div className="divide-y">
          {forms.map((form) => (
            <div key={form.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(form.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{form.name}</h3>
                    {getStatusBadge(form.status)}
                    {form.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{form.title}</p>
                  <p className="text-sm text-muted-foreground">{form.description}</p>
                  
                  {/* Progress bar for incomplete forms */}
                  {form.status !== "ready" && form.completeness > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Data completeness</span>
                        <span className="font-medium">{form.completeness}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            form.completeness >= 80 ? 'bg-green-500' : 
                            form.completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${form.completeness}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Last generated info */}
                  {form.lastGenerated && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last generated: {form.lastGenerated.toLocaleDateString()} at {form.lastGenerated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {form.status === "ready" ? (
                    <>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Preview">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Download">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Regenerate">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </>
                  ) : form.status === "pending" ? (
                    <>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Continue
                      </button>
                    </>
                  ) : (
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                      <FilePlus className="w-4 h-4" />
                      Generate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filing Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Filing Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• All required forms must be completed before filing with the bankruptcy court</li>
              <li>• Forms are auto-populated from case data - review carefully before filing</li>
              <li>• The filing fee for {isChapter7 ? "Chapter 7" : "Chapter 13"} is ${isChapter7 ? "338" : "313"} (fee waivers may be available)</li>
              <li>• Credit counseling certificate must be filed within 180 days before filing</li>
              <li>• Keep copies of all filed documents for your records</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
