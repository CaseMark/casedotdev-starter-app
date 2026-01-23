/**
 * Financial Data Extraction System
 * Uses case.dev LLM to extract structured data from OCR'd bankruptcy documents
 */

import { CaseDevClient } from '@/lib/case-dev/client';

export interface ExtractedIncome {
  employerName: string;
  employerEIN: string | null;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'self-employed';
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  startDate: Date | null;
  source: string; // Document ID
  confidence: number;
  // For reconciliation system
  rawAmount: number;
  amountType: 'gross' | 'net' | 'unknown';
  periodStart: string | null;
  periodEnd: string | null;
  ytdGross: number | null;
  ytdNet: number | null;
  ytdFederalWithheld: number | null;
  hoursWorked: number | null;
  hourlyRate: number | null;
}

export interface ExtractedDebt {
  creditorName: string;
  accountNumber: string | null;
  debtType: 'credit-card' | 'medical' | 'personal-loan' | 'auto-loan' | 'mortgage' | 'student-loan' | 'tax-debt' | 'other';
  originalAmount: number | null;
  currentBalance: number;
  monthlyPayment: number | null;
  isSecured: boolean;
  collateralDescription: string | null;
  source: string;
  confidence: number;
}

export interface ExtractedAsset {
  assetType: 'real-estate' | 'vehicle' | 'bank-account' | 'investment' | 'retirement' | 'personal-property' | 'other';
  description: string;
  estimatedValue: number;
  ownershipPercentage: number;
  isExempt: boolean | null;
  encumbrances: number;
  source: string;
  confidence: number;
}

export interface ExtractedExpenses {
  housing: number;
  utilities: number;
  food: number;
  transportation: number;
  insurance: number;
  medical: number;
  childcare: number;
  other: number;
  source: string;
  confidence: number;
}

export class FinancialDataExtractor {
  constructor(private client: CaseDevClient) {}

  /**
   * Extract income data from paystubs, W-2s, or tax returns
   */
  async extractIncome(ocrText: string, documentType: string): Promise<ExtractedIncome[]> {
    const prompt = this.buildIncomeExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract income information from this document:\n\n${ocrText}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured income data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeIncomeData(extracted);
  }

  /**
   * Extract debt information from credit reports, statements, or collection notices
   */
  async extractDebts(ocrText: string, documentType: string): Promise<ExtractedDebt[]> {
    const prompt = this.buildDebtExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract debt information from this document:\n\n${ocrText}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured debt data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeDebtData(extracted);
  }

  /**
   * Extract asset information from bank statements, appraisals, or property records
   */
  async extractAssets(ocrText: string, documentType: string): Promise<ExtractedAsset[]> {
    const prompt = this.buildAssetExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract asset information from this document:\n\n${ocrText}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured asset data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeAssetData(extracted);
  }

  /**
   * Extract monthly expenses from bank statements or budget documents
   */
  async extractExpenses(ocrText: string): Promise<ExtractedExpenses> {
    const prompt = `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract monthly expense information from the provided document.

Return a JSON object with this exact structure:
{
  "expenses": {
    "housing": <number or 0>,
    "utilities": <number or 0>,
    "food": <number or 0>,
    "transportation": <number or 0>,
    "insurance": <number or 0>,
    "medical": <number or 0>,
    "childcare": <number or 0>,
    "other": <number or 0>
  },
  "confidence": <0-1 score>
}

Include ONLY the JSON object in your response. Calculate monthly averages if data is weekly/annual.`;

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract expense information from this document:\n\n${ocrText}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured expense data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return {
      ...extracted.expenses,
      source: 'llm-extraction',
      confidence: extracted.confidence || 0.7,
    };
  }

  private buildIncomeExtractionPrompt(documentType: string): string {
    const baseStructure = `{
  "incomes": [
    {
      "employerName": "<string>",
      "employerEIN": "<string XX-XXXXXXX format or null>",
      "employmentType": "full-time" | "part-time" | "contract" | "self-employed",
      "grossMonthlyIncome": <number>,
      "netMonthlyIncome": <number>,
      "payFrequency": "weekly" | "bi-weekly" | "semi-monthly" | "monthly",
      "startDate": "<YYYY-MM-DD or null>",
      "rawAmount": <number - the exact amount on the document before conversion>,
      "amountType": "gross" | "net" | "unknown",
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

    if (documentType === 'paystub') {
      return `You are a bankruptcy paralegal assistant specializing in analyzing pay stubs.
Extract DETAILED income information from this pay stub document.

Return a JSON object with this exact structure:
${baseStructure}

CRITICAL EXTRACTION RULES FOR PAY STUBS:
1. EMPLOYER INFO:
   - Extract the EXACT employer name as printed
   - Look for EIN/FEIN (Federal Employer ID) - usually format XX-XXXXXXX

2. PAY PERIOD:
   - periodStart: First day of pay period
   - periodEnd: Last day of pay period (or pay date if period not shown)

3. PAY FREQUENCY (determine from pay period length or stated):
   - "weekly" = 7 days or stated weekly
   - "bi-weekly" = 14 days or stated bi-weekly/every two weeks
   - "semi-monthly" = 1st-15th or 16th-end, or stated twice monthly
   - "monthly" = full month

4. AMOUNTS:
   - rawAmount: The GROSS pay for this pay period (before deductions)
   - grossMonthlyIncome: Convert to monthly (weekly*4.33, bi-weekly*2.17, semi-monthly*2)
   - netMonthlyIncome: NET pay converted to monthly
   - amountType: Always "gross" for gross pay amount

5. YTD FIGURES (VERY IMPORTANT - look for "YTD" or "Year to Date"):
   - ytdGross: Total gross earnings year-to-date
   - ytdNet: Total net pay year-to-date (if shown)
   - ytdFederalWithheld: Federal tax withheld year-to-date

6. HOURLY INFO (if applicable):
   - hoursWorked: Hours for this pay period
   - hourlyRate: Rate per hour

Include ONLY the JSON object in your response.`;
    }

    if (documentType === 'w2') {
      return `You are a bankruptcy paralegal assistant specializing in analyzing W-2 forms.
Extract income information from this W-2 tax document.

Return a JSON object with this exact structure:
${baseStructure}

CRITICAL EXTRACTION RULES FOR W-2:
1. Box 1 (Wages, tips, other compensation) = rawAmount AND ytdGross
2. Box 2 (Federal income tax withheld) = ytdFederalWithheld
3. Box c (Employer's name) = employerName
4. Box b (Employer's EIN) = employerEIN
5. payFrequency: Always "monthly" for W-2 (we'll divide annual by 12)
6. grossMonthlyIncome: Box 1 divided by 12
7. amountType: "gross"
8. periodStart: Use tax year January 1 (e.g., "2024-01-01")
9. periodEnd: Use tax year December 31 (e.g., "2024-12-31")
10. confidence: High (0.9+) for clear W-2s

Include ONLY the JSON object in your response.`;
    }

    if (documentType === 'tax_return' || documentType === '1040') {
      return `You are a bankruptcy paralegal assistant specializing in analyzing tax returns.
Extract income information from this tax return document.

Return a JSON object with this exact structure:
${baseStructure}

CRITICAL EXTRACTION RULES FOR TAX RETURNS:
1. Look for Line 1 (Wages, salaries, tips) on Form 1040
2. For each W-2/employer mentioned, create a separate income entry
3. rawAmount: Annual income amount
4. grossMonthlyIncome: Annual divided by 12
5. payFrequency: "monthly" (representing annual/12)
6. amountType: "gross"
7. periodStart: Tax year January 1
8. periodEnd: Tax year December 31
9. Look for Schedule C for self-employment income (employmentType: "self-employed")
10. Look for Schedule SE for self-employment tax

Include ONLY the JSON object in your response.`;
    }

    if (documentType === 'bank_statement') {
      return `You are a bankruptcy paralegal assistant specializing in analyzing bank statements for income.
Extract PAYROLL DEPOSITS from this bank statement.

Return a JSON object with this exact structure:
${baseStructure}

CRITICAL EXTRACTION RULES FOR BANK STATEMENT INCOME:
1. Look ONLY for recurring deposits that appear to be payroll:
   - "DIRECT DEP", "PAYROLL", "ACH DEPOSIT", company names
   - Regular amounts appearing weekly/bi-weekly/monthly

2. employerName: Extract from deposit description (may be truncated)
3. rawAmount: The deposit amount (this is NET pay after deductions)
4. amountType: "net" (bank deposits are after-tax)
5. netMonthlyIncome: Convert deposit to monthly
6. grossMonthlyIncome: Estimate by multiplying net by 1.30 (assumes ~23% deductions)
7. periodStart: Statement start date
8. periodEnd: Statement end date
8. payFrequency: Determine from deposit pattern
9. Do NOT include: transfers, refunds, reimbursements, one-time deposits

Include ONLY the JSON object in your response.`;
    }

    if (documentType === '1099') {
      return `You are a bankruptcy paralegal assistant specializing in analyzing 1099 forms.
Extract income information from this 1099 document.

Return a JSON object with this exact structure:
${baseStructure}

CRITICAL EXTRACTION RULES FOR 1099:
1. 1099-MISC/1099-NEC: Box 1 or 7 = Non-employee compensation
2. 1099-INT: Interest income
3. 1099-DIV: Dividend income
4. employerName: Payer's name
5. employerEIN: Payer's TIN/EIN
6. employmentType: "self-employed" for 1099-NEC/MISC, "contract" for others
7. rawAmount: The annual amount shown
8. grossMonthlyIncome: Annual divided by 12
9. amountType: "gross"
10. payFrequency: "monthly" (representing annual/12)
11. No withholding typically, so ytdFederalWithheld likely 0

Include ONLY the JSON object in your response.`;
    }

    // Default generic prompt
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract income information from ${documentType} documents.

Return a JSON object with this exact structure:
${baseStructure}

Important rules:
- Convert all income to MONTHLY amounts (weekly * 4.33, bi-weekly * 2.17, semi-monthly * 2)
- For annual documents (W-2s, tax returns), divide by 12
- rawAmount: The exact amount shown on the document before any conversion
- amountType: "gross" for pre-deduction amounts, "net" for post-deduction
- Extract YTD figures when available
- Extract employer EIN when visible
- Confidence should reflect OCR quality and data completeness
- Include ONLY the JSON object in your response`;
  }

  private buildDebtExtractionPrompt(documentType: string): string {
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract debt information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "debts": [
    {
      "creditorName": "<string>",
      "accountNumber": "<string or null>",
      "debtType": "credit-card" | "medical" | "personal-loan" | "auto-loan" | "mortgage" | "student-loan" | "tax-debt" | "other",
      "originalAmount": <number or null>,
      "currentBalance": <number>,
      "monthlyPayment": <number or null>,
      "isSecured": <boolean>,
      "collateralDescription": "<string or null>",
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Secured debts have collateral (auto loans, mortgages)
- Credit cards and medical bills are typically unsecured
- Current balance is most important
- Include ONLY the JSON object in your response`;
  }

  private buildAssetExtractionPrompt(documentType: string): string {
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract asset information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "assets": [
    {
      "assetType": "real-estate" | "vehicle" | "bank-account" | "investment" | "retirement" | "personal-property" | "other",
      "description": "<string>",
      "estimatedValue": <number>,
      "ownershipPercentage": <number 0-100>,
      "isExempt": <boolean or null>,
      "encumbrances": <number (liens/loans against asset)>,
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Bank accounts show balance as value
- Vehicles should include make, model, year in description
- Real estate should include address in description
- Ownership percentage is usually 100 for single filers, 50 for joint
- Encumbrances are loans secured by the asset
- Include ONLY the JSON object in your response`;
  }

  private normalizeIncomeData(extracted: any): ExtractedIncome[] {
    if (!extracted.incomes || !Array.isArray(extracted.incomes)) {
      return [];
    }

    return extracted.incomes.map((income: any) => ({
      employerName: income.employerName || 'Unknown',
      employerEIN: income.employerEIN || null,
      employmentType: income.employmentType || 'full-time',
      grossMonthlyIncome: parseFloat(income.grossMonthlyIncome) || 0,
      netMonthlyIncome: parseFloat(income.netMonthlyIncome) || 0,
      payFrequency: income.payFrequency || 'monthly',
      startDate: income.startDate ? new Date(income.startDate) : null,
      source: 'llm-extraction',
      confidence: income.confidence || 0.7,
      // Reconciliation fields
      rawAmount: parseFloat(income.rawAmount) || parseFloat(income.grossMonthlyIncome) || 0,
      amountType: income.amountType || 'unknown',
      periodStart: income.periodStart || null,
      periodEnd: income.periodEnd || null,
      ytdGross: income.ytdGross ? parseFloat(income.ytdGross) : null,
      ytdNet: income.ytdNet ? parseFloat(income.ytdNet) : null,
      ytdFederalWithheld: income.ytdFederalWithheld ? parseFloat(income.ytdFederalWithheld) : null,
      hoursWorked: income.hoursWorked ? parseFloat(income.hoursWorked) : null,
      hourlyRate: income.hourlyRate ? parseFloat(income.hourlyRate) : null,
    }));
  }

  private normalizeDebtData(extracted: any): ExtractedDebt[] {
    if (!extracted.debts || !Array.isArray(extracted.debts)) {
      return [];
    }

    return extracted.debts.map((debt: any) => ({
      creditorName: debt.creditorName || 'Unknown Creditor',
      accountNumber: debt.accountNumber || null,
      debtType: debt.debtType || 'other',
      originalAmount: debt.originalAmount ? parseFloat(debt.originalAmount) : null,
      currentBalance: parseFloat(debt.currentBalance) || 0,
      monthlyPayment: debt.monthlyPayment ? parseFloat(debt.monthlyPayment) : null,
      isSecured: debt.isSecured || false,
      collateralDescription: debt.collateralDescription || null,
      source: 'llm-extraction',
      confidence: debt.confidence || 0.7,
    }));
  }

  private normalizeAssetData(extracted: any): ExtractedAsset[] {
    if (!extracted.assets || !Array.isArray(extracted.assets)) {
      return [];
    }

    return extracted.assets.map((asset: any) => ({
      assetType: asset.assetType || 'other',
      description: asset.description || 'Unknown asset',
      estimatedValue: parseFloat(asset.estimatedValue) || 0,
      ownershipPercentage: parseFloat(asset.ownershipPercentage) || 100,
      isExempt: asset.isExempt !== undefined ? asset.isExempt : null,
      encumbrances: parseFloat(asset.encumbrances) || 0,
      source: 'llm-extraction',
      confidence: asset.confidence || 0.7,
    }));
  }
}
