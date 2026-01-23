import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import {
  calculateMeansTest,
  calculateIRSAllowances,
  getStateMedianIncome,
  type MeansTestResult,
  type MeansTestAllowances,
} from '@/lib/bankruptcy/chapter7';

/**
 * Means Test API
 *
 * Calculates Chapter 7 eligibility per Form B 122A-2.
 * Uses 6-month average Current Monthly Income (CMI) per 11 U.S.C. § 101(10A).
 */

interface MonthlyIncomeSummary {
  month: string;
  totalGross: number;
  sources: { source: string; amount: number }[];
}

interface CMIDetails {
  monthlyBreakdown: MonthlyIncomeSummary[];
  sixMonthTotal: number;
  currentMonthlyIncome: number; // CMI = 6-month total / 6
  monthsCovered: number;
  isComplete: boolean;
}

interface MeansTestResponse {
  caseId: string;
  calculatedAt: string;
  inputs: {
    state: string;
    county: string | null;
    householdSize: number;
    currentMonthlyIncome: number; // 6-month average CMI
    monthlyExpenses: number;
    totalUnsecuredDebt: number;
    totalSecuredDebt: number;
    hasVehicle: boolean;
    vehicleCount: number;
  };
  cmiDetails: CMIDetails; // Detailed 6-month income breakdown
  irsAllowances: MeansTestAllowances;
  result: MeansTestResult;
}

/**
 * Calculate Current Monthly Income (CMI) from income records
 * Per Form B 122A-2: CMI = Total income for 6 months / 6
 */
function calculateCMI(incomeRecords: any[]): CMIDetails {
  const monthlyTotals = new Map<string, MonthlyIncomeSummary>();

  for (const record of incomeRecords) {
    const month = record.income_month;
    if (!month) continue;

    if (!monthlyTotals.has(month)) {
      monthlyTotals.set(month, {
        month,
        totalGross: 0,
        sources: [],
      });
    }

    const summary = monthlyTotals.get(month)!;
    const grossAmount = Number(record.gross_amount) || 0;

    summary.totalGross += grossAmount;

    // Track by source
    const existingSource = summary.sources.find(s => s.source === record.income_source);
    if (existingSource) {
      existingSource.amount += grossAmount;
    } else {
      summary.sources.push({
        source: record.income_source || 'employment',
        amount: grossAmount,
      });
    }
  }

  // Sort months descending and take the 6 most recent
  const sortedMonths = Array.from(monthlyTotals.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);

  const sixMonthTotal = sortedMonths.reduce((sum, m) => sum + m.totalGross, 0);
  const monthsCovered = sortedMonths.length;

  // CMI is always divided by 6 per Form B 122A-2
  const currentMonthlyIncome = sixMonthTotal / 6;

  return {
    monthlyBreakdown: sortedMonths,
    sixMonthTotal,
    currentMonthlyIncome: Math.round(currentMonthlyIncome * 100) / 100,
    monthsCovered,
    isComplete: monthsCovered >= 6,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const connectionString = request.nextUrl.searchParams.get('connectionString');

  if (!connectionString) {
    return NextResponse.json({ error: 'Connection string is required' }, { status: 400 });
  }

  const sql = postgres(connectionString);

  try {
    // Fetch case data including county for IRS Local Standards
    // Note: Financial totals are calculated from related tables, not stored on the case
    const caseResult = await sql`
      SELECT id, client_name, case_type, status, household_size, state, county
      FROM bankruptcy_cases
      WHERE id = ${caseId}
    `;

    if (caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Fetch income records with new schema (income_month, gross_amount)
    // Get all records to calculate 6-month CMI
    const incomeRecords = await sql`
      SELECT income_month, gross_amount, income_source
      FROM income_records
      WHERE case_id = ${caseId}
      ORDER BY income_month DESC
    `;

    // Fetch expense records
    const expenseRecords = await sql`
      SELECT monthly_amount FROM expenses WHERE case_id = ${caseId}
    `;

    // Fetch debt records
    const debtRecords = await sql`
      SELECT balance, secured, monthly_payment FROM debts WHERE case_id = ${caseId}
    `;

    // Fetch asset records (to check for vehicles)
    const assetRecords = await sql`
      SELECT asset_type FROM assets WHERE case_id = ${caseId}
    `;

    // Calculate 6-month CMI per Form B 122A-2
    const cmiDetails = calculateCMI(incomeRecords);
    const currentMonthlyIncome = cmiDetails.currentMonthlyIncome;

    const monthlyExpenses = expenseRecords.reduce(
      (sum, e) => sum + Number(e.monthly_amount),
      0
    );

    const totalSecuredDebt = debtRecords
      .filter(d => d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    const totalUnsecuredDebt = debtRecords
      .filter(d => !d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    // Check for vehicles
    const vehicleCount = assetRecords.filter(a => a.asset_type === 'vehicle').length;
    const hasVehicle = vehicleCount > 0;

    // Get state, county, and household size from case
    const state = caseData.state || 'CA';
    const county = caseData.county || null;
    const householdSize = caseData.household_size || 1;

    // Calculate IRS allowances (uses county-level housing and regional transportation)
    const irsAllowances = calculateIRSAllowances(
      state,
      householdSize,
      county,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    // Calculate means test result using 6-month CMI
    const result = calculateMeansTest(
      state,
      householdSize,
      currentMonthlyIncome, // Use 6-month average CMI
      monthlyExpenses,
      totalUnsecuredDebt,
      county,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    const response: MeansTestResponse = {
      caseId,
      calculatedAt: new Date().toISOString(),
      inputs: {
        state,
        county,
        householdSize,
        currentMonthlyIncome, // 6-month average
        monthlyExpenses,
        totalUnsecuredDebt,
        totalSecuredDebt,
        hasVehicle,
        vehicleCount: vehicleCount || 0,
      },
      cmiDetails, // Include full 6-month breakdown
      irsAllowances,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating means test:', error);
    return NextResponse.json(
      { error: 'Failed to calculate means test' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const connectionString = request.nextUrl.searchParams.get('connectionString');

  if (!connectionString) {
    return NextResponse.json({ error: 'Connection string is required' }, { status: 400 });
  }

  const sql = postgres(connectionString);

  try {
    // Fetch case data including county for IRS Local Standards
    // Note: Financial totals are calculated from related tables, not stored on the case
    const caseResult = await sql`
      SELECT id, client_name, case_type, status, household_size, state, county
      FROM bankruptcy_cases
      WHERE id = ${caseId}
    `;

    if (caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Fetch income records with new schema
    const incomeRecords = await sql`
      SELECT income_month, gross_amount, income_source
      FROM income_records
      WHERE case_id = ${caseId}
      ORDER BY income_month DESC
    `;

    // Fetch expense records
    const expenseRecords = await sql`
      SELECT monthly_amount FROM expenses WHERE case_id = ${caseId}
    `;

    // Fetch debt records
    const debtRecords = await sql`
      SELECT balance, secured, monthly_payment FROM debts WHERE case_id = ${caseId}
    `;

    // Fetch asset records (to check for vehicles)
    const assetRecords = await sql`
      SELECT asset_type FROM assets WHERE case_id = ${caseId}
    `;

    // Calculate 6-month CMI per Form B 122A-2
    const cmiDetails = calculateCMI(incomeRecords);
    const currentMonthlyIncome = cmiDetails.currentMonthlyIncome;

    const monthlyExpenses = expenseRecords.reduce(
      (sum, e) => sum + Number(e.monthly_amount),
      0
    );

    const totalSecuredDebt = debtRecords
      .filter(d => d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    const totalUnsecuredDebt = debtRecords
      .filter(d => !d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    // Check for vehicles
    const vehicleCount = assetRecords.filter(a => a.asset_type === 'vehicle').length;
    const hasVehicle = vehicleCount > 0;

    // Get state, county, and household size from case
    const state = caseData.state || 'CA';
    const county = caseData.county || null;
    const householdSize = caseData.household_size || 1;

    // Calculate IRS allowances
    const irsAllowances = calculateIRSAllowances(
      state,
      householdSize,
      county,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    // Calculate means test result using 6-month CMI
    const result = calculateMeansTest(
      state,
      householdSize,
      currentMonthlyIncome,
      monthlyExpenses,
      totalUnsecuredDebt,
      county,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    // Update case timestamp to reflect recalculation
    await sql`
      UPDATE bankruptcy_cases
      SET updated_at = NOW()
      WHERE id = ${caseId}
    `;

    const response: MeansTestResponse = {
      caseId,
      calculatedAt: new Date().toISOString(),
      inputs: {
        state,
        county,
        householdSize,
        currentMonthlyIncome,
        monthlyExpenses,
        totalUnsecuredDebt,
        totalSecuredDebt,
        hasVehicle,
        vehicleCount: vehicleCount || 0,
      },
      cmiDetails,
      irsAllowances,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating means test:', error);
    return NextResponse.json(
      { error: 'Failed to calculate means test' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}
