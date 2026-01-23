import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { CaseDevClient } from '@/lib/case-dev/client';
import {
  reconcileIncome,
  normalizeExtraction,
  createNormalizedIncome,
  type RawIncomeExtraction,
  type NormalizedIncome,
} from '@/lib/bankruptcy/income';

/**
 * Income Reconciliation API
 *
 * GET: Returns current reconciled income for a case
 * POST: Triggers re-reconciliation from all income documents
 */

// Document types that contain income information
const INCOME_DOCUMENT_TYPES = ['paystub', 'w2', 'tax_return', 'bank_statement', '1099'];

// Map pay frequency strings to standard format
function mapFrequency(freq: string): RawIncomeExtraction['frequency'] {
  const map: Record<string, RawIncomeExtraction['frequency']> = {
    'weekly': 'weekly',
    'bi-weekly': 'biweekly',
    'biweekly': 'biweekly',
    'semi-monthly': 'semi_monthly',
    'semi_monthly': 'semi_monthly',
    'monthly': 'monthly',
    'annual': 'annual',
    'yearly': 'annual',
    'one-time': 'one_time',
    'one_time': 'one_time',
  };
  return map[freq?.toLowerCase()] || 'monthly';
}

// Map document type strings to standard format
function mapDocumentType(docType: string): RawIncomeExtraction['documentType'] {
  const map: Record<string, RawIncomeExtraction['documentType']> = {
    'paystub': 'paystub',
    'pay_stub': 'paystub',
    'pay-stub': 'paystub',
    'w2': 'w2',
    'w-2': 'w2',
    'tax_return': 'tax_return',
    'tax-return': 'tax_return',
    '1040': 'tax_return',
    'bank_statement': 'bank_statement',
    'bank-statement': 'bank_statement',
    '1099': '1099',
    '1099-misc': '1099',
    '1099-nec': '1099',
  };
  return map[docType?.toLowerCase()] || 'paystub';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure reconciled income table exists
      await sql`
        CREATE TABLE IF NOT EXISTS reconciled_income_sources (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          employer_name TEXT NOT NULL,
          employer_ein TEXT,
          income_type TEXT NOT NULL,
          income_year INTEGER NOT NULL DEFAULT ${new Date().getFullYear()},
          verified_annual_gross DECIMAL(12, 2) NOT NULL,
          verified_monthly_gross DECIMAL(12, 2) NOT NULL,
          verified_annual_net DECIMAL(12, 2),
          verified_monthly_net DECIMAL(12, 2),
          determination_method TEXT NOT NULL,
          evidence JSONB,
          confidence DECIMAL(3, 2) NOT NULL,
          status TEXT NOT NULL,
          discrepancy JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      // Add income_year column if it doesn't exist (for existing tables)
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'reconciled_income_sources'
                         AND column_name = 'income_year') THEN
            ALTER TABLE reconciled_income_sources ADD COLUMN income_year INTEGER DEFAULT ${new Date().getFullYear()};
          END IF;
        END $$;
      `;

      // Fetch existing reconciled income
      const sources = await sql`
        SELECT
          id,
          case_id as "caseId",
          employer_name as "employerName",
          employer_ein as "employerEIN",
          income_type as "incomeType",
          COALESCE(income_year, ${new Date().getFullYear()}) as "incomeYear",
          verified_annual_gross as "verifiedAnnualGross",
          verified_monthly_gross as "verifiedMonthlyGross",
          verified_annual_net as "verifiedAnnualNet",
          verified_monthly_net as "verifiedMonthlyNet",
          determination_method as "determinationMethod",
          evidence,
          confidence,
          status,
          discrepancy,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM reconciled_income_sources
        WHERE case_id = ${caseId}
        ORDER BY income_year DESC, verified_annual_gross DESC
      `;

      // Calculate totals
      const totalAnnualGross = sources.reduce((sum, s) => sum + parseFloat(s.verifiedAnnualGross || 0), 0);
      const totalMonthlyGross = totalAnnualGross / 12;
      const totalAnnualNet = sources.reduce((sum, s) => sum + parseFloat(s.verifiedAnnualNet || 0), 0);
      const totalMonthlyNet = totalAnnualNet > 0 ? totalAnnualNet / 12 : null;

      const sourcesNeedingReview = sources
        .filter(s => s.status === 'needs_review' || s.status === 'conflict')
        .map(s => s.id);

      return NextResponse.json({
        summary: {
          caseId,
          sources,
          totalMonthlyGross,
          totalAnnualGross,
          totalMonthlyNet,
          currentMonthlyIncome: totalMonthlyGross,
          allSourcesReconciled: sourcesNeedingReview.length === 0,
          sourcesNeedingReview,
          lastCalculatedAt: new Date().toISOString(),
        },
      });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching reconciled income:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reconciled income' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    const apiKey = request.nextUrl.searchParams.get('apiKey');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);
    let client: CaseDevClient | null = null;

    if (apiKey) {
      client = new CaseDevClient(apiKey);
    }

    try {
      // Ensure tables exist
      await sql`
        CREATE TABLE IF NOT EXISTS reconciled_income_sources (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          employer_name TEXT NOT NULL,
          employer_ein TEXT,
          income_type TEXT NOT NULL,
          income_year INTEGER NOT NULL DEFAULT ${new Date().getFullYear()},
          verified_annual_gross DECIMAL(12, 2) NOT NULL,
          verified_monthly_gross DECIMAL(12, 2) NOT NULL,
          verified_annual_net DECIMAL(12, 2),
          verified_monthly_net DECIMAL(12, 2),
          determination_method TEXT NOT NULL,
          evidence JSONB,
          confidence DECIMAL(3, 2) NOT NULL,
          status TEXT NOT NULL,
          discrepancy JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      // Add income_year column if it doesn't exist (for existing tables)
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'reconciled_income_sources'
                         AND column_name = 'income_year') THEN
            ALTER TABLE reconciled_income_sources ADD COLUMN income_year INTEGER DEFAULT ${new Date().getFullYear()};
          END IF;
        END $$;
      `;

      // Fetch income documents with OCR text
      const documents = await sql`
        SELECT
          id,
          case_id as "caseId",
          file_name as "fileName",
          document_type as "documentType",
          ocr_text as "ocrText",
          extracted_data as "extractedData"
        FROM case_documents
        WHERE case_id = ${caseId}
          AND document_type = ANY(${INCOME_DOCUMENT_TYPES})
          AND ocr_completed = true
          AND ocr_text IS NOT NULL
          AND LENGTH(ocr_text) > 50
      `;

      // Also fetch existing income records
      const existingRecords = await sql`
        SELECT
          id,
          employer,
          gross_pay as "grossPay",
          net_pay as "netPay",
          pay_period as "payPeriod",
          pay_date as "payDate",
          ytd_gross as "ytdGross",
          income_source as "incomeSource"
        FROM income_records
        WHERE case_id = ${caseId}
      `;

      const rawExtractions: RawIncomeExtraction[] = [];
      let extractionId = 0;

      // Convert existing income records to RawIncomeExtraction format
      for (const record of existingRecords) {
        extractionId++;
        const rawExtraction: RawIncomeExtraction = {
          id: `existing_${record.id}`,
          documentId: record.id,
          documentType: mapDocumentType(record.incomeSource || 'paystub'),
          documentDate: record.payDate || new Date().toISOString().split('T')[0],
          rawAmount: parseFloat(record.grossPay) || 0,
          frequency: mapFrequency(record.payPeriod || 'monthly'),
          amountType: 'gross',
          payerName: record.employer || 'Unknown Employer',
          payerEIN: null,
          periodStart: null,
          periodEnd: record.payDate,
          ytdGross: record.ytdGross ? parseFloat(record.ytdGross) : null,
          ytdNet: null,
          ytdFederalWithheld: null,
          extractionConfidence: 0.8,
        };
        rawExtractions.push(rawExtraction);
      }

      // If we have an LLM client, extract income from documents
      if (client && documents.length > 0) {
        for (const doc of documents) {
          try {
            const docType = mapDocumentType(doc.documentType);

            // Build extraction prompt based on document type
            const extractionPrompt = buildExtractionPrompt(docType);

            const response = await client.llmComplete({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: extractionPrompt,
                },
                {
                  role: 'user',
                  content: `Extract income from this ${docType} document:\n\n${doc.ocrText?.substring(0, 4000)}`,
                },
              ],
              temperature: 0.1,
              response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            const extracted = JSON.parse(content);

            if (extracted.incomes && Array.isArray(extracted.incomes)) {
              for (const income of extracted.incomes) {
                extractionId++;
                const rawExtraction: RawIncomeExtraction = {
                  id: `doc_${doc.id}_${extractionId}`,
                  documentId: doc.id,
                  documentType: docType,
                  documentDate: income.periodEnd || new Date().toISOString().split('T')[0],
                  rawAmount: parseFloat(income.rawAmount) || 0,
                  frequency: mapFrequency(income.payFrequency || 'monthly'),
                  amountType: income.amountType || 'gross',
                  payerName: income.employerName || 'Unknown Employer',
                  payerEIN: income.employerEIN || null,
                  periodStart: income.periodStart || null,
                  periodEnd: income.periodEnd || null,
                  ytdGross: income.ytdGross ? parseFloat(income.ytdGross) : null,
                  ytdNet: income.ytdNet ? parseFloat(income.ytdNet) : null,
                  ytdFederalWithheld: income.ytdFederalWithheld ? parseFloat(income.ytdFederalWithheld) : null,
                  hoursWorked: income.hoursWorked ? parseFloat(income.hoursWorked) : null,
                  hourlyRate: income.hourlyRate ? parseFloat(income.hourlyRate) : null,
                  extractionConfidence: income.confidence || 0.7,
                };
                rawExtractions.push(rawExtraction);
              }
            }
          } catch (extractionError) {
            console.error(`Error extracting income from document ${doc.id}:`, extractionError);
            // Continue with other documents
          }
        }
      }

      // If no extractions found, return empty result
      if (rawExtractions.length === 0) {
        return NextResponse.json({
          summary: {
            caseId,
            sources: [],
            totalMonthlyGross: 0,
            totalAnnualGross: 0,
            totalMonthlyNet: null,
            currentMonthlyIncome: 0,
            allSourcesReconciled: true,
            sourcesNeedingReview: [],
            lastCalculatedAt: new Date().toISOString(),
          },
          message: 'No income documents found to reconcile',
        });
      }

      // Normalize all extractions
      const normalizedIncomes: NormalizedIncome[] = rawExtractions.map((extraction, idx) =>
        createNormalizedIncome(extraction, `norm_${idx}`)
      );

      // Run reconciliation
      const { sources, summary } = reconcileIncome({
        caseId,
        normalizedIncomes,
      });

      // Clear existing reconciled sources for this case
      await sql`DELETE FROM reconciled_income_sources WHERE case_id = ${caseId}`;

      // Save reconciled sources
      for (const source of sources) {
        await sql`
          INSERT INTO reconciled_income_sources (
            id, case_id, employer_name, employer_ein, income_type, income_year,
            verified_annual_gross, verified_monthly_gross,
            verified_annual_net, verified_monthly_net,
            determination_method, evidence, confidence, status, discrepancy,
            created_at, updated_at
          ) VALUES (
            ${source.id},
            ${caseId},
            ${source.employerName},
            ${source.employerEIN || null},
            ${source.incomeType},
            ${source.incomeYear},
            ${source.verifiedAnnualGross},
            ${source.verifiedMonthlyGross},
            ${source.verifiedAnnualNet || null},
            ${source.verifiedMonthlyNet || null},
            ${source.determinationMethod},
            ${JSON.stringify(source.evidence)},
            ${source.confidence},
            ${source.status},
            ${source.discrepancy ? JSON.stringify(source.discrepancy) : null},
            NOW(),
            NOW()
          )
        `;
      }

      return NextResponse.json({
        summary,
        reconciliationDetails: {
          documentsProcessed: documents.length,
          existingRecordsIncluded: existingRecords.length,
          totalExtractionsFound: rawExtractions.length,
          reconciledSourcesCreated: sources.length,
        },
      });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error reconciling income:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconcile income' },
      { status: 500 }
    );
  }
}

/**
 * Build extraction prompt based on document type
 */
function buildExtractionPrompt(documentType: RawIncomeExtraction['documentType']): string {
  const baseStructure = `{
  "incomes": [
    {
      "employerName": "<string>",
      "employerEIN": "<string XX-XXXXXXX format or null>",
      "rawAmount": <number - exact amount on document>,
      "payFrequency": "weekly" | "bi-weekly" | "semi-monthly" | "monthly" | "annual",
      "amountType": "gross" | "net",
      "periodStart": "<YYYY-MM-DD or null>",
      "periodEnd": "<YYYY-MM-DD or null>",
      "ytdGross": <number or null>,
      "ytdNet": <number or null>,
      "ytdFederalWithheld": <number or null>,
      "hoursWorked": <number or null>,
      "hourlyRate": <number or null>,
      "confidence": <0-1 score>
    }
  ]
}`;

  switch (documentType) {
    case 'paystub':
      return `Extract income from this pay stub for bankruptcy reconciliation.
Return JSON: ${baseStructure}

Rules:
- rawAmount: GROSS pay for this period (before deductions)
- amountType: "gross"
- Extract YTD figures if shown
- Determine payFrequency from pay period dates
- Extract employer EIN if visible`;

    case 'w2':
      return `Extract income from this W-2 for bankruptcy reconciliation.
Return JSON: ${baseStructure}

Rules:
- rawAmount: Box 1 wages (annual total)
- payFrequency: "annual"
- ytdGross = rawAmount
- ytdFederalWithheld: Box 2
- periodStart: Tax year Jan 1
- periodEnd: Tax year Dec 31
- employerEIN: Box b`;

    case 'bank_statement':
      return `Extract PAYROLL deposits from this bank statement for bankruptcy reconciliation.
Return JSON: ${baseStructure}

Rules:
- Look for recurring deposits marked as payroll/direct deposit
- rawAmount: deposit amount (this is NET after deductions)
- amountType: "net"
- employerName: Extract from deposit description
- periodStart/periodEnd: Statement period
- Determine payFrequency from deposit pattern`;

    case 'tax_return':
      return `Extract income from this tax return for bankruptcy reconciliation.
Return JSON: ${baseStructure}

Rules:
- rawAmount: Wages from Line 1 (annual)
- payFrequency: "annual"
- periodStart/periodEnd: Tax year
- Create separate entries for each W-2/employer if shown`;

    case '1099':
      return `Extract income from this 1099 for bankruptcy reconciliation.
Return JSON: ${baseStructure}

Rules:
- rawAmount: Total compensation shown
- payFrequency: "annual"
- amountType: "gross"
- employerEIN: Payer's TIN`;

    default:
      return `Extract income from this document for bankruptcy reconciliation.
Return JSON: ${baseStructure}`;
  }
}
