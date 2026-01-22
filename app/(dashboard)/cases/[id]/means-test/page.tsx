"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  FileText,
  DollarSign,
  Users,
  MapPin,
  ArrowRight,
  RefreshCw,
  Download,
  HelpCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface BankruptcyCase {
  id: string;
  clientName: string;
  caseNumber: string | null;
  caseType: string;
  status: string;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  householdSize: number | null;
  state: string | null;
}

// Helper function to get median income by state and household size
function getMedianIncome(state: string, householdSize: number): number {
  // 2024 Census Bureau median income data (simplified)
  const medianIncomes: Record<string, number[]> = {
    CA: [62677, 82476, 92236, 102368, 107386],
    TX: [54727, 71998, 80478, 89420, 93891],
    NY: [60129, 79108, 88441, 98268, 103181],
    FL: [52594, 69191, 77351, 85946, 90243],
    // Default for other states
    DEFAULT: [55000, 72000, 80000, 89000, 93000],
  };

  const stateData = medianIncomes[state] || medianIncomes.DEFAULT;
  const index = Math.min(householdSize - 1, stateData.length - 1);
  return stateData[index];
}

export default function CaseMeansTestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<BankruptcyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = localStorage.getItem("casedev_api_key");
    const connectionString = localStorage.getItem("bankruptcy_db_connection");

    if (!apiKey || !connectionString) {
      router.push("/login");
      return;
    }

    async function fetchCase() {
      try {
        const response = await fetch(
          `/api/cases/${id}?connectionString=${encodeURIComponent(connectionString!)}`
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
    }

    fetchCase();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{error || "Case not found"}</h2>
          <Link href="/cases" className="text-primary hover:underline">
            Return to Cases
          </Link>
        </div>
      </div>
    );
  }

  // Means test data - uses actual case data from database
  // IRS National/Local Standards are legitimate reference data (not user-specific)
  const meansTestData = {
    // Step 1: Income comparison
    annualIncome: (caseData.monthlyIncome || 0) * 12,
    householdSize: caseData.householdSize || 1,
    state: caseData.state || "—",
    medianIncome: caseData.state ? getMedianIncome(caseData.state, caseData.householdSize || 1) : 0,
    
    // Step 2: Disposable income calculation (if above median)
    currentMonthlyIncome: caseData.monthlyIncome || 0,
    // IRS National Standards (2024) - these are official reference values, not user data
    allowedDeductions: {
      nationalStandards: {
        food: 733,
        housekeeping: 40,
        apparel: 186,
        personalCare: 44,
        miscellaneous: 149,
      },
      // IRS Local Standards vary by state - using defaults until state-specific data is loaded
      localStandards: {
        housing: 1800,
        utilities: 350,
        transportation: 650,
      },
      // Other expenses should come from user's financial data
      otherExpenses: {
        healthInsurance: 0, // Should be entered by user in financial section
        childcare: 0,
        courtOrderedPayments: 0,
        education: 0,
      },
    },
    // Secured debt payments should come from user's debt data (mortgage, car loans, etc.)
    // This will be 0 until user enters their secured debts in the financial section
    securedDebtPayments: 0,
    priorityDebtPayments: 0,
    
    // Results
    passesStep1: false,
    passesStep2: false,
    disposableIncome: 0,
    recommendation: "pending",
  };

  // Calculate if passes Step 1 (below median income)
  meansTestData.passesStep1 = meansTestData.annualIncome <= meansTestData.medianIncome;

  // Calculate Step 2 if needed
  if (!meansTestData.passesStep1) {
    const totalDeductions = 
      Object.values(meansTestData.allowedDeductions.nationalStandards).reduce((a, b) => a + b, 0) +
      Object.values(meansTestData.allowedDeductions.localStandards).reduce((a, b) => a + b, 0) +
      Object.values(meansTestData.allowedDeductions.otherExpenses).reduce((a, b) => a + b, 0) +
      meansTestData.securedDebtPayments +
      meansTestData.priorityDebtPayments;
    
    meansTestData.disposableIncome = meansTestData.currentMonthlyIncome - totalDeductions;
    meansTestData.passesStep2 = meansTestData.disposableIncome < 0 || 
      (meansTestData.disposableIncome * 60 < 8175); // Less than $8,175 over 60 months
  }

  const passesTest = meansTestData.passesStep1 || meansTestData.passesStep2;
  meansTestData.recommendation = passesTest ? "chapter7_eligible" : "chapter13_recommended";

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
          <span>Means Test</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Means Test Calculator</h1>
            <p className="text-muted-foreground mt-1">
              Chapter 7 bankruptcy eligibility determination
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4" />
              Recalculate
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`p-6 rounded-lg border mb-8 ${
        passesTest 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start gap-4">
          {passesTest ? (
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${passesTest ? 'text-green-800' : 'text-yellow-800'}`}>
              {passesTest 
                ? "Client Qualifies for Chapter 7 Bankruptcy" 
                : "Chapter 13 May Be More Appropriate"}
            </h2>
            <p className={`mt-1 ${passesTest ? 'text-green-700' : 'text-yellow-700'}`}>
              {passesTest 
                ? meansTestData.passesStep1
                  ? "Income is below the state median - automatic qualification."
                  : "Disposable income is below the threshold after allowed deductions."
                : "Client's disposable income exceeds Chapter 7 limits. Consider Chapter 13 repayment plan."}
            </p>
          </div>
          <Link
            href={`/cases/${id}/forms`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              passesTest 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            Proceed to Forms
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Input Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${meansTestData.annualIncome.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Annual Income</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{meansTestData.householdSize}</div>
              <div className="text-sm text-muted-foreground">Household Size</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{meansTestData.state}</div>
              <div className="text-sm text-muted-foreground">State</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${meansTestData.medianIncome.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">State Median</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Income Comparison */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${meansTestData.passesStep1 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {meansTestData.passesStep1 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Step 1: Income Comparison</h2>
              <p className="text-sm text-muted-foreground">Compare income to state median</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Client&apos;s Annual Income</span>
                <span className="font-semibold">${meansTestData.annualIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  {meansTestData.state} Median ({meansTestData.householdSize} person household)
                </span>
                <span className="font-semibold">${meansTestData.medianIncome.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Difference</span>
                  <span className={`font-bold ${
                    meansTestData.annualIncome <= meansTestData.medianIncome 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {meansTestData.annualIncome <= meansTestData.medianIncome ? '-' : '+'}
                    ${Math.abs(meansTestData.annualIncome - meansTestData.medianIncome).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              meansTestData.passesStep1 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className={`text-sm font-medium ${meansTestData.passesStep1 ? 'text-green-700' : 'text-yellow-700'}`}>
                {meansTestData.passesStep1 
                  ? "✓ Income is below state median. Client automatically qualifies for Chapter 7."
                  : "⚠ Income exceeds state median. Proceed to Step 2 for detailed analysis."}
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Disposable Income */}
        <div className={`bg-card p-6 rounded-lg border ${meansTestData.passesStep1 ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${
              meansTestData.passesStep1 
                ? 'bg-gray-100' 
                : meansTestData.passesStep2 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
            }`}>
              {meansTestData.passesStep1 ? (
                <Calculator className="w-5 h-5 text-gray-400" />
              ) : meansTestData.passesStep2 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Step 2: Disposable Income</h2>
              <p className="text-sm text-muted-foreground">Calculate after allowed deductions</p>
            </div>
          </div>

          {meansTestData.passesStep1 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Step 2 not required</p>
              <p className="text-sm">Client qualifies based on Step 1</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Income</span>
                  <span className="font-semibold">${meansTestData.currentMonthlyIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">National Standards</span>
                  <span className="text-red-600">
                    -${Object.values(meansTestData.allowedDeductions.nationalStandards).reduce((a, b) => a + b, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Local Standards</span>
                  <span className="text-red-600">
                    -${Object.values(meansTestData.allowedDeductions.localStandards).reduce((a, b) => a + b, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Other Expenses</span>
                  <span className="text-red-600">
                    -${Object.values(meansTestData.allowedDeductions.otherExpenses).reduce((a, b) => a + b, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Secured Debt Payments</span>
                  <span className="text-red-600">-${meansTestData.securedDebtPayments.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Disposable Income</span>
                    <span className={`font-bold ${meansTestData.disposableIncome < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${meansTestData.disposableIncome.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${
                meansTestData.passesStep2 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-medium ${meansTestData.passesStep2 ? 'text-green-700' : 'text-red-700'}`}>
                  {meansTestData.passesStep2 
                    ? "✓ Disposable income is below threshold. Client qualifies for Chapter 7."
                    : "✗ Disposable income exceeds threshold. Chapter 13 is recommended."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Deduction Details */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Allowed Deductions</h2>
            </div>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Learn More
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 text-sm text-muted-foreground">National Standards</h3>
              <div className="space-y-2">
                {Object.entries(meansTestData.allowedDeductions.nationalStandards).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>${value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-sm text-muted-foreground">Local Standards ({meansTestData.state})</h3>
              <div className="space-y-2">
                {Object.entries(meansTestData.allowedDeductions.localStandards).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span className="capitalize">{key}</span>
                    <span>${value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRight className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">Next Steps</h2>
          </div>

          <div className="space-y-4">
            {passesTest ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Review Financial Data</p>
                    <p className="text-sm text-muted-foreground">Verify all income and expense information is accurate</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Complete Required Documents</p>
                    <p className="text-sm text-muted-foreground">Ensure all supporting documents are uploaded</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Generate Chapter 7 Forms</p>
                    <p className="text-sm text-muted-foreground">Auto-populate bankruptcy petition forms</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Discuss Chapter 13 Options</p>
                    <p className="text-sm text-muted-foreground">Review repayment plan possibilities with client</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Calculate Payment Plan</p>
                    <p className="text-sm text-muted-foreground">Determine 3-5 year repayment schedule</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Review Special Circumstances</p>
                    <p className="text-sm text-muted-foreground">Check for exceptions that may allow Chapter 7</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
