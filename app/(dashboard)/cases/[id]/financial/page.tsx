"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Home,
  Car,
  CreditCard,
  Briefcase,
  PiggyBank,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddIncomeModal } from "@/components/cases/financial/add-income-modal";
import { AddDebtModal } from "@/components/cases/financial/add-debt-modal";
import { AddAssetModal } from "@/components/cases/financial/add-asset-modal";
import { AddExpenseModal } from "@/components/cases/financial/add-expense-modal";
import { DeleteConfirmationModal } from "@/components/cases/financial/delete-confirmation-modal";

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

interface IncomeRecord {
  id: string;
  caseId: string;
  documentId: string | null;
  incomeMonth: string; // YYYY-MM format
  employer: string | null;
  grossAmount: number;
  netAmount: number | null;
  incomeSource: string;
  description: string | null;
  confidence: number | null;
  extractedAt: string | null;
  createdAt: string;
}

interface ExpenseRecord {
  id: string;
  category: string;
  description: string | null;
  monthlyAmount: number;
  isIrsStandard: boolean;
  irsStandardType: string | null;
}

interface AssetRecord {
  id: string;
  assetType: string;
  description: string;
  currentValue: number;
  address: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  institution: string | null;
  accountNumberLast4: string | null;
  ownershipPercentage: number;
}

interface DebtRecord {
  id: string;
  creditorName: string;
  creditorAddress: string | null;
  accountLast4: string | null;
  balance: number;
  monthlyPayment: number | null;
  interestRate: number | null;
  debtType: string;
  secured: boolean;
  priority: boolean;
  collateral: string | null;
  collateralValue: number | null;
}

interface ReconciledIncomeSource {
  id: string;
  employerName: string;
  employerEIN: string | null;
  incomeType: string;
  incomeYear: number;
  verifiedAnnualGross: number;
  verifiedMonthlyGross: number;
  verifiedAnnualNet: number | null;
  verifiedMonthlyNet: number | null;
  determinationMethod: string;
  evidence: any[];
  confidence: number;
  status: 'verified' | 'needs_review' | 'conflict' | 'manual';
  discrepancy: {
    maxVariance: number;
    conflictingDocuments: string[];
    suggestedResolution: string;
  } | null;
}

interface ReconciliationSummary {
  caseId: string;
  sources: ReconciledIncomeSource[];
  totalMonthlyGross: number;
  totalAnnualGross: number;
  totalMonthlyNet: number | null;
  currentMonthlyIncome: number;
  allSourcesReconciled: boolean;
  sourcesNeedingReview: string[];
  lastCalculatedAt: string;
}

// Delete item type for confirmation modal
type DeleteItemType = 'income' | 'expense' | 'asset' | 'debt';

// Category icons mapping
const CATEGORY_ICONS: Record<string, typeof Home> = {
  housing: Home,
  transportation: Car,
  utilities: DollarSign,
  food: DollarSign,
  medical: DollarSign,
  insurance: DollarSign,
  clothing: DollarSign,
  childcare: DollarSign,
  taxes: DollarSign,
  debt_payments: CreditCard,
  entertainment: DollarSign,
  education: DollarSign,
  other: DollarSign,
};

// Category label mapping
const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  food: 'Food',
  clothing: 'Clothing',
  transportation: 'Transportation',
  medical: 'Medical/Healthcare',
  childcare: 'Childcare',
  insurance: 'Insurance',
  taxes: 'Taxes',
  debt_payments: 'Debt Payments',
  entertainment: 'Entertainment',
  education: 'Education',
  other: 'Other',
};

// Format income month (YYYY-MM) to readable format
function formatIncomeMonth(incomeMonth: string): string {
  if (!incomeMonth) return 'Unknown';
  const [year, month] = incomeMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Format income source to readable label
function formatIncomeSource(source: string): string {
  const labels: Record<string, string> = {
    employment: 'Employment',
    self_employment: 'Self-Employment',
    rental: 'Rental Income',
    interest: 'Interest/Dividends',
    pension: 'Pension/Retirement',
    government: 'Government Benefits',
    spouse: 'Spouse Income',
    alimony: 'Alimony',
    contributions: 'Contributions',
    other: 'Other Income',
  };
  return labels[source] || source;
}

export default function CaseFinancialPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<BankruptcyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Financial data from database
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>([]);
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([]);

  // Reconciled income
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciling, setReconciling] = useState(false);

  // Modal states
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addDebtOpen, setAddDebtOpen] = useState(false);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<DeleteItemType>('income');
  const [deleteItemId, setDeleteItemId] = useState<string>('');
  const [deleteItemName, setDeleteItemName] = useState<string>('');

  const connectionString = typeof window !== 'undefined' ? localStorage.getItem("bankruptcy_db_connection") : null;

  const fetchFinancialData = useCallback(async () => {
    if (!connectionString) return;

    try {
      const [incomeRes, expenseRes, assetRes, debtRes, reconcileRes] = await Promise.all([
        fetch(`/api/cases/${id}/income?connectionString=${encodeURIComponent(connectionString)}`),
        fetch(`/api/cases/${id}/expenses?connectionString=${encodeURIComponent(connectionString)}`),
        fetch(`/api/cases/${id}/assets?connectionString=${encodeURIComponent(connectionString)}`),
        fetch(`/api/cases/${id}/debts?connectionString=${encodeURIComponent(connectionString)}`),
        fetch(`/api/cases/${id}/income/reconcile?connectionString=${encodeURIComponent(connectionString)}`),
      ]);

      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setIncomeRecords(data.incomeRecords || data.income || []);
      }
      if (expenseRes.ok) {
        const data = await expenseRes.json();
        setExpenseRecords(data.expenses || []);
      }
      if (assetRes.ok) {
        const data = await assetRes.json();
        setAssetRecords(data.assets || []);
      }
      if (debtRes.ok) {
        const data = await debtRes.json();
        setDebtRecords(data.debts || []);
      }
      if (reconcileRes.ok) {
        const data = await reconcileRes.json();
        setReconciliationSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Error fetching financial data:", err);
    }
  }, [id, connectionString]);

  const triggerReconciliation = useCallback(async () => {
    if (!connectionString) return;

    setReconciling(true);
    try {
      const apiKey = localStorage.getItem("casedev_api_key");
      const res = await fetch(
        `/api/cases/${id}/income/reconcile?connectionString=${encodeURIComponent(connectionString)}${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`,
        { method: 'POST' }
      );

      if (res.ok) {
        const data = await res.json();
        setReconciliationSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Error reconciling income:", err);
    } finally {
      setReconciling(false);
    }
  }, [id, connectionString]);

  useEffect(() => {
    const apiKey = localStorage.getItem("casedev_api_key");
    const connStr = localStorage.getItem("bankruptcy_db_connection");

    if (!apiKey || !connStr) {
      router.push("/login");
      return;
    }

    async function fetchCase() {
      try {
        const response = await fetch(
          `/api/cases/${id}?connectionString=${encodeURIComponent(connStr!)}`
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
    fetchFinancialData();
  }, [id, router, fetchFinancialData]);

  // Handle delete confirmation
  const handleDeleteClick = (type: DeleteItemType, itemId: string, itemName: string) => {
    setDeleteItemType(type);
    setDeleteItemId(itemId);
    setDeleteItemName(itemName);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!connectionString) return;

    const endpoints: Record<DeleteItemType, string> = {
      income: `/api/cases/${id}/income/${deleteItemId}`,
      expense: `/api/cases/${id}/expenses/${deleteItemId}`,
      asset: `/api/cases/${id}/assets/${deleteItemId}`,
      debt: `/api/cases/${id}/debts/${deleteItemId}`,
    };

    const response = await fetch(
      `${endpoints[deleteItemType]}?connectionString=${encodeURIComponent(connectionString)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error('Failed to delete item');
    }

    // Refresh the data
    await fetchFinancialData();
  };

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

  // Calculate totals from actual data
  // For income, calculate CMI (Current Monthly Income) per Form B 122A-2:
  // Sum income from 6 most recent months, divide by 6
  const incomeByMonth = incomeRecords.reduce((acc, r) => {
    const month = r.incomeMonth;
    if (!acc[month]) acc[month] = 0;
    acc[month] += Number(r.grossAmount) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Get the 6 most recent months and sum them
  const sortedMonths = Object.entries(incomeByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);
  const sixMonthTotal = sortedMonths.reduce((sum, [, amt]) => sum + amt, 0);
  // CMI = 6-month total / 6
  const totalMonthlyIncome = sixMonthTotal / 6;
  const totalMonthlyExpenses = expenseRecords.reduce((sum, e) => sum + Number(e.monthlyAmount), 0);
  const totalAssets = assetRecords.reduce((sum, a) => sum + Number(a.currentValue), 0);
  const totalDebt = debtRecords.reduce((sum, d) => sum + Number(d.balance), 0);
  const securedDebt = debtRecords.filter(d => d.secured).reduce((sum, d) => sum + Number(d.balance), 0);
  const unsecuredDebt = debtRecords.filter(d => !d.secured).reduce((sum, d) => sum + Number(d.balance), 0);

  const disposableIncome = totalMonthlyIncome - totalMonthlyExpenses;
  const annualIncome = totalMonthlyIncome * 12;
  const debtToIncomeRatio = annualIncome > 0
    ? ((totalDebt / annualIncome) * 100).toFixed(1)
    : "0";

  const hasFinancialData = incomeRecords.length > 0 || expenseRecords.length > 0 || assetRecords.length > 0 || debtRecords.length > 0;

  // Empty state component
  const EmptyState = ({ title, description, onAdd }: { title: string; description: string; onAdd: () => void }) => (
    <div className="text-center py-8 text-muted-foreground">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm mb-4">{description}</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Add {title.split(" ")[1] || title}
      </button>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Modals */}
      <AddIncomeModal
        open={addIncomeOpen}
        onOpenChange={setAddIncomeOpen}
        caseId={id}
        onSuccess={fetchFinancialData}
      />
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        caseId={id}
        onSuccess={fetchFinancialData}
      />
      <AddAssetModal
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        caseId={id}
        onSuccess={fetchFinancialData}
      />
      <AddDebtModal
        open={addDebtOpen}
        onOpenChange={setAddDebtOpen}
        caseId={id}
        onSuccess={fetchFinancialData}
      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={`Delete ${deleteItemType.charAt(0).toUpperCase() + deleteItemType.slice(1)}?`}
        description={`Are you sure you want to delete "${deleteItemName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />

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
          <span>Financial Data</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push(`/cases/${id}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financial Data</h1>
              <p className="text-muted-foreground mt-1">
                Income, expenses, assets, and debts overview
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No Data Banner */}
      {!hasFinancialData && (
        <div className="p-6 rounded-lg border bg-muted/50 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">No Financial Data Yet</h2>
              <p className="text-muted-foreground mt-1">
                Financial information has not been entered for this case. Add income sources, expenses, assets, and debts to complete the financial profile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalMonthlyIncome > 0 ? `$${totalMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Income</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalMonthlyExpenses > 0 ? `$${totalMonthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Expenses</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalAssets > 0 ? `$${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalDebt > 0 ? `$${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Total Debt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciled Income Section */}
      {(reconciliationSummary && reconciliationSummary.sources.length > 0) && (
        <div className="bg-card p-6 rounded-lg border mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Reconciled Income</h2>
                <p className="text-sm text-muted-foreground">
                  Income verified across multiple documents
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerReconciliation}
              disabled={reconciling}
            >
              {reconciling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Re-reconcile
            </Button>
          </div>

          {/* Reconciliation Status Banner */}
          {!reconciliationSummary.allSourcesReconciled && (
            <div className="p-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {reconciliationSummary.sourcesNeedingReview.length} income source(s) need review
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  There are discrepancies between documents that should be manually verified.
                </p>
              </div>
            </div>
          )}

          {/* Reconciled Sources List */}
          <div className="space-y-3">
            {reconciliationSummary.sources.map((source) => (
              <div
                key={source.id}
                className={`p-4 rounded-lg border ${
                  source.status === 'verified'
                    ? 'bg-green-50 border-green-200'
                    : source.status === 'conflict'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {source.status === 'verified' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : source.status === 'conflict' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    ) : (
                      <FileWarning className="w-5 h-5 text-yellow-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{source.employerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {source.incomeType.replace('_', ' ')}
                        {source.employerEIN && ` • EIN: ${source.employerEIN}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          source.status === 'verified'
                            ? 'bg-green-100 text-green-700'
                            : source.status === 'conflict'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {source.status === 'verified' ? 'Verified' :
                           source.status === 'conflict' ? 'Conflict' : 'Needs Review'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {source.evidence.length} document(s) •{' '}
                          {Math.round(source.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ${source.verifiedMonthlyGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${source.verifiedAnnualGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                    </p>
                  </div>
                </div>

                {/* Discrepancy Info */}
                {source.discrepancy && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-sm">
                      <span className="font-medium">Variance:</span>{' '}
                      {(source.discrepancy.maxVariance * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {source.discrepancy.suggestedResolution}
                    </p>
                  </div>
                )}

                {/* Evidence Breakdown */}
                {source.evidence.length > 1 && (
                  <details className="mt-3 pt-3 border-t border-current/10">
                    <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                      View document sources ({source.evidence.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {source.evidence.map((ev, idx) => (
                        <div key={idx} className="text-sm flex justify-between px-2 py-1 bg-white/50 rounded">
                          <span className="capitalize">{ev.documentType.replace('_', ' ')}</span>
                          <span>${ev.annualizedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Reconciled Totals */}
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Reconciled Income</p>
              <p className="text-xs text-muted-foreground">
                Last calculated: {new Date(reconciliationSummary.lastCalculatedAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                ${reconciliationSummary.totalMonthlyGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
              </p>
              <p className="text-sm text-muted-foreground">
                ${reconciliationSummary.totalAnnualGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile Button when no reconciliation exists but income records do */}
      {(!reconciliationSummary || reconciliationSummary.sources.length === 0) && incomeRecords.length > 0 && (
        <div className="p-4 mb-8 bg-muted/50 rounded-lg border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            <div>
              <p className="font-medium">Income Reconciliation Available</p>
              <p className="text-sm text-muted-foreground">
                Verify income by cross-referencing pay stubs, W-2s, and bank statements
              </p>
            </div>
          </div>
          <Button onClick={triggerReconciliation} disabled={reconciling}>
            {reconciling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            Reconcile Income
          </Button>
        </div>
      )}

      {/* Key Metrics - Only show if there's data */}
      {hasFinancialData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className={`p-4 rounded-lg border ${
            totalMonthlyIncome === 0 && totalMonthlyExpenses === 0
              ? 'bg-muted/50'
              : disposableIncome >= 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Disposable Income</div>
                <div className={`text-2xl font-bold ${
                  totalMonthlyIncome === 0 && totalMonthlyExpenses === 0
                    ? 'text-muted-foreground'
                    : disposableIncome >= 0
                      ? 'text-green-700'
                      : 'text-red-700'
                }`}>
                  {totalMonthlyIncome === 0 && totalMonthlyExpenses === 0
                    ? "—"
                    : `${disposableIncome < 0 ? '-' : ''}$${Math.abs(disposableIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`}
                </div>
              </div>
              {totalMonthlyIncome > 0 || totalMonthlyExpenses > 0 ? (
                disposableIncome >= 0 ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalMonthlyIncome === 0 && totalMonthlyExpenses === 0
                ? "Add income and expenses to calculate"
                : disposableIncome >= 0
                  ? "Client has positive cash flow after expenses"
                  : "Client is spending more than they earn"}
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Debt-to-Income Ratio</div>
                <div className="text-2xl font-bold">
                  {annualIncome > 0 && totalDebt > 0 ? `${debtToIncomeRatio}%` : "—"}
                </div>
              </div>
              {annualIncome > 0 && totalDebt > 0 && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  Number(debtToIncomeRatio) > 50 ? 'bg-red-100 text-red-700' :
                  Number(debtToIncomeRatio) > 35 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {Number(debtToIncomeRatio) > 50 ? 'High' : Number(debtToIncomeRatio) > 35 ? 'Moderate' : 'Low'}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {annualIncome > 0 && totalDebt > 0
                ? "Total debt relative to annual income"
                : "Add income and debt data to calculate"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Section */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Income Sources</h2>
            </div>
            <button
              onClick={() => setAddIncomeOpen(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          </div>

          {incomeRecords.length > 0 ? (
            <>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {incomeRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{record.employer || formatIncomeSource(record.incomeSource)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatIncomeMonth(record.incomeMonth)} &bull; {formatIncomeSource(record.incomeSource)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        ${Number(record.grossAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <button
                        onClick={() => handleDeleteClick('income', record.id, record.employer || 'Income')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">6-Month Total</span>
                  <span className="font-semibold">${sixMonthTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CMI (Monthly Avg)</span>
                  <span className="font-semibold">${totalMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Annualized Income</span>
                  <span className="font-bold">${annualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No Income Sources"
              description="Add income sources to track earnings"
              onAdd={() => setAddIncomeOpen(true)}
            />
          )}
        </div>

        {/* Expenses Section */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Monthly Expenses</h2>
            </div>
            <button
              onClick={() => setAddExpenseOpen(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>

          {expenseRecords.length > 0 ? (
            <>
              <div className="space-y-3">
                {expenseRecords.map((expense) => {
                  const IconComponent = CATEGORY_ICONS[expense.category] || DollarSign;
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{CATEGORY_LABELS[expense.category] || expense.category}</span>
                          {expense.description && (
                            <p className="text-sm text-muted-foreground">{expense.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">${Number(expense.monthlyAmount).toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteClick('expense', expense.id, CATEGORY_LABELS[expense.category] || expense.category)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Total Monthly</span>
                  <span className="font-bold">${totalMonthlyExpenses.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No Expenses"
              description="Add monthly expenses to track spending"
              onAdd={() => setAddExpenseOpen(true)}
            />
          )}
        </div>

        {/* Assets Section */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PiggyBank className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Assets</h2>
            </div>
            <button
              onClick={() => setAddAssetOpen(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>

          {assetRecords.length > 0 ? (
            <>
              <div className="space-y-3">
                {assetRecords.map((asset) => (
                  <div key={asset.id} className="p-3 bg-muted/50 rounded-lg group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{asset.description}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">${Number(asset.currentValue).toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteClick('asset', asset.id, asset.description)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="capitalize">{asset.assetType.replace('_', ' ')}</span>
                      {asset.ownershipPercentage < 100 && (
                        <span>{asset.ownershipPercentage}% ownership</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-semibold">${totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No Assets"
              description="Add assets like property, vehicles, and accounts"
              onAdd={() => setAddAssetOpen(true)}
            />
          )}
        </div>

        {/* Debts Section */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold">Debts</h2>
            </div>
            <button
              onClick={() => setAddDebtOpen(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          </div>

          {debtRecords.length > 0 ? (
            <>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {debtRecords.map((debt) => (
                  <div key={debt.id} className="p-3 bg-muted/50 rounded-lg group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{debt.creditorName}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">${Number(debt.balance).toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteClick('debt', debt.id, debt.creditorName)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          debt.secured ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {debt.secured ? 'Secured' : 'Unsecured'}
                        </span>
                        {debt.priority && (
                          <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                            Priority
                          </span>
                        )}
                      </div>
                      {debt.monthlyPayment && Number(debt.monthlyPayment) > 0 && (
                        <span className="text-muted-foreground">${Number(debt.monthlyPayment).toLocaleString()}/mo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Secured Debt</span>
                  <span className="font-semibold">${securedDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unsecured Debt</span>
                  <span className="font-semibold">${unsecuredDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Debt</span>
                  <span className="font-bold">${totalDebt.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No Debts"
              description="Add debts like mortgages, loans, and credit cards"
              onAdd={() => setAddDebtOpen(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
