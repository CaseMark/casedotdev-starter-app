"use client";

import { useEffect, useState } from "react";
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
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
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

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  verified: boolean;
}

interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  icon: typeof Home;
}

interface Asset {
  id: string;
  name: string;
  value: number;
  exempt: number;
  type: string;
}

interface Debt {
  id: string;
  name: string;
  balance: number;
  monthly: number;
  type: "secured" | "unsecured";
  priority: string;
}

export default function CaseFinancialPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<BankruptcyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Financial data from database (empty by default)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

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
        
        // TODO: Fetch financial data from database
        // For now, financial data will be empty until user adds it
        // In a full implementation, you would fetch income sources, expenses, assets, and debts
        // from separate API endpoints or include them in the case response
        
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

  // Calculate totals from actual data
  const totalMonthlyIncome = caseData.monthlyIncome || incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalMonthlyExpenses = caseData.monthlyExpenses || expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAssets = caseData.totalAssets || assets.reduce((sum, a) => sum + a.value, 0);
  const totalDebt = caseData.totalDebt || debts.reduce((sum, d) => sum + d.balance, 0);
  const totalExempt = assets.reduce((sum, a) => sum + a.exempt, 0);
  const securedDebt = debts.filter(d => d.type === "secured").reduce((sum, d) => sum + d.balance, 0);
  const unsecuredDebt = debts.filter(d => d.type === "unsecured").reduce((sum, d) => sum + d.balance, 0);

  const disposableIncome = totalMonthlyIncome - totalMonthlyExpenses;
  const annualIncome = totalMonthlyIncome * 12;
  const debtToIncomeRatio = annualIncome > 0 
    ? ((totalDebt / annualIncome) * 100).toFixed(1)
    : "0";

  const hasFinancialData = totalMonthlyIncome > 0 || totalMonthlyExpenses > 0 || totalAssets > 0 || totalDebt > 0;

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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Data</h1>
            <p className="text-muted-foreground mt-1">
              Income, expenses, assets, and debts overview
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Edit className="w-4 h-4" />
            Edit Financial Data
          </button>
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
                {totalMonthlyIncome > 0 ? `$${totalMonthlyIncome.toLocaleString()}` : "—"}
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
                {totalMonthlyExpenses > 0 ? `$${totalMonthlyExpenses.toLocaleString()}` : "—"}
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
                {totalAssets > 0 ? `$${totalAssets.toLocaleString()}` : "—"}
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
                {totalDebt > 0 ? `$${totalDebt.toLocaleString()}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Total Debt</div>
            </div>
          </div>
        </div>
      </div>

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
                    : `$${Math.abs(disposableIncome).toLocaleString()}/mo`}
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
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" />
              Add Source
            </button>
          </div>
          
          {incomeSources.length > 0 ? (
            <>
              <div className="space-y-3">
                {incomeSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">Monthly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${source.amount.toLocaleString()}</span>
                      {source.verified && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Verified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Annual Income</span>
                  <span className="font-semibold">${annualIncome.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState 
              title="No Income Sources" 
              description="Add income sources to track earnings"
              onAdd={() => {/* TODO: Open add income modal */}}
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
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
          
          {expenses.length > 0 ? (
            <>
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <expense.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{expense.name}</span>
                    </div>
                    <span className="font-semibold">${expense.amount.toLocaleString()}</span>
                  </div>
                ))}
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
              onAdd={() => {/* TODO: Open add expense modal */}}
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
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
          
          {assets.length > 0 ? (
            <>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{asset.name}</span>
                      <span className="font-semibold">${asset.value.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Exempt Amount</span>
                      <span className="text-green-600">${asset.exempt.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-semibold">${totalAssets.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Exempt</span>
                  <span className="font-semibold text-green-600">${totalExempt.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyState 
              title="No Assets" 
              description="Add assets like property, vehicles, and accounts"
              onAdd={() => {/* TODO: Open add asset modal */}}
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
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          </div>
          
          {debts.length > 0 ? (
            <>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {debts.map((debt) => (
                  <div key={debt.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{debt.name}</span>
                      <span className="font-semibold">${debt.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        debt.type === 'secured' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {debt.type}
                      </span>
                      {debt.monthly > 0 && (
                        <span className="text-muted-foreground">${debt.monthly}/mo</span>
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
              onAdd={() => {/* TODO: Open add debt modal */}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
