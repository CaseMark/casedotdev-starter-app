/**
 * Financial Data Extraction System
 * Uses case.dev LLM to extract structured data from OCR'd bankruptcy documents
 */

import { CaseDevClient } from '@/lib/case-dev/client';

/**
 * Monthly income record for 6-month CMI calculation per Form B 122A-2
 * Each record represents income received in a specific calendar month
 */
export interface ExtractedMonthlyIncome {
  incomeMonth: string; // YYYY-MM format (the month income was RECEIVED)
  grossAmount: number; // Gross income received that month
  netAmount: number | null; // Net income if available
  employer: string | null; // Employer/payer name
  incomeSource:
    | 'employment'      // Line 2: Wages, salary, tips, bonuses, overtime, commissions
    | 'self_employment' // Line 3: Net business/profession/farm income
    | 'rental'          // Line 4: Rent and real property income
    | 'interest'        // Line 5: Interest, dividends, royalties
    | 'pension'         // Line 6: Pension and retirement income
    | 'government'      // Line 7: State disability, unemployment, etc.
    | 'spouse'          // Line 8: Income from spouse (if not filing jointly)
    | 'alimony'         // Line 9: Alimony/maintenance received
    | 'contributions'   // Line 10: Regular contributions from others
    | 'other';          // Line 11: Other income
  description: string; // e.g., "Bi-weekly paycheck", "Monthly rental income"
  confidence: number; // 0-1 extraction confidence
}

/**
 * Result of income extraction from a document
 * Contains monthly breakdown for 6-month CMI calculation
 */
export interface IncomeExtractionResult {
  documentId: string;
  documentType: string;
  monthlyIncomes: ExtractedMonthlyIncome[];
  totalConfidence: number;
  warnings: string[]; // e.g., "Could not determine exact pay period dates"
}

// Legacy interface for backward compatibility
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
  accountLast4: string | null; // Last 4 digits for matching across statements
  debtType: 'credit-card' | 'medical' | 'personal-loan' | 'auto-loan' | 'mortgage' | 'student-loan' | 'tax-debt' | 'other';
  originalAmount: number | null;
  currentBalance: number;
  monthlyPayment: number | null;
  isSecured: boolean;
  collateralDescription: string | null;
  statementDate: string | null; // YYYY-MM-DD for determining most recent
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
  accountLast4: string | null; // Last 4 digits for bank accounts - used to match across statements
  institutionName: string | null; // Bank name for matching
  statementDate: string | null; // YYYY-MM-DD for determining most recent
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

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM income extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured income data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeIncomeData(extracted);
  }

  /**
   * Extract monthly income for 6-month CMI calculation per Form B 122A-2
   *
   * This method extracts income with specific calendar months for the means test.
   * Per 11 U.S.C. § 101(10A), "current monthly income" is the average monthly income
   * received during the 6 calendar months before filing.
   *
   * @param ocrText - OCR text from the document
   * @param documentType - Type of document (paystub, w2, tax_return, 1099, etc.)
   * @param documentId - ID of the source document
   * @returns Income extraction result with monthly breakdown
   */
  async extractMonthlyIncome(
    ocrText: string,
    documentType: string,
    documentId: string
  ): Promise<IncomeExtractionResult> {
    const prompt = this.buildMonthlyIncomePrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract monthly income information from this ${documentType} document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM monthly income extraction returned unexpected response:', JSON.stringify(response));
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['LLM returned unexpected response format'],
      };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['Failed to extract structured income data from document'],
      };
    }

    try {
      const extracted = JSON.parse(jsonMatch[0]);
      return this.normalizeMonthlyIncomeData(extracted, documentId, documentType);
    } catch (e) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['Failed to parse extracted income data'],
      };
    }
  }

  /**
   * Build prompt for monthly income extraction
   */
  private buildMonthlyIncomePrompt(documentType: string): string {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const currentYear = today.getFullYear();
    const lastYear = currentYear - 1;

    const typeSpecificInstructions: Record<string, string> = {
      paystub: `This is a PAYSTUB. Extract:
- Pay period dates and/or check date
- Gross pay (total earnings before deductions)
- Net pay (take-home after deductions)
- Employer name
- YTD (year-to-date) amounts if shown

Create ONE income record per pay period shown on the stub.
Use the check date or pay period end date to determine incomeMonth.`,

      w2: `This is a W-2 FORM. Extract:
- Box 1: Wages, tips, other compensation (this is the annual gross)
- Employer name (Box c)
- Tax year from the form

IMPORTANT: For W-2s, create a SINGLE income record with:
- incomeMonth: Use the LAST month of the tax year (e.g., "${lastYear}-12" for a ${lastYear} W-2)
- grossAmount: The ANNUAL amount from Box 1 (do NOT divide by 12)
- description: "Annual W-2 wages for [year]"
- employer: The employer name from the W-2

This allows the system to properly calculate monthly averages.`,

      tax_return: `This is a TAX RETURN. Extract:
- Total income or Adjusted Gross Income (AGI)
- Tax year from the form
- Specific income types if visible (wages, self-employment, interest, etc.)

IMPORTANT: For tax returns, create a SINGLE income record with:
- incomeMonth: Use the LAST month of the tax year (e.g., "${lastYear}-12" for a ${lastYear} return)
- grossAmount: The ANNUAL total income or AGI (do NOT divide by 12)
- incomeSource: Based on primary income type shown
- description: "Annual tax return income for [year]"

This allows the system to properly calculate monthly averages.`,

      '1099': `This is a 1099 FORM. Extract:
- Total income amount from the relevant box
- Payer name
- Tax year
- Type of 1099 (MISC, INT, DIV, NEC, etc.)

Create a SINGLE income record with:
- incomeMonth: Use the LAST month of the tax year
- grossAmount: The total amount (do NOT divide by 12)
- incomeSource: Based on 1099 type (interest, self_employment, other)
- description: "1099 income from [payer] for [year]"`,
    };

    const specificInstructions = typeSpecificInstructions[documentType] ||
      `This is a ${documentType} document. Extract all income information you can find.`;

    return `You are a bankruptcy paralegal assistant extracting income data for Chapter 7 means test.

${specificInstructions}

Current date: ${currentMonth}

Return a JSON object with this EXACT structure:
{
  "monthlyIncomes": [
    {
      "incomeMonth": "YYYY-MM",
      "grossAmount": <number>,
      "netAmount": <number or null>,
      "employer": "<string or null>",
      "incomeSource": "employment" | "self_employment" | "rental" | "interest" | "pension" | "government" | "alimony" | "contributions" | "other",
      "description": "<brief description of income>",
      "confidence": <0-1 score>
    }
  ],
  "warnings": ["<any issues or uncertainties>"]
}

Income source mapping:
- employment: wages, salary, tips, bonuses (W-2 income)
- self_employment: business income, 1099-NEC, Schedule C
- rental: rental property income
- interest: 1099-INT, bank interest, dividends
- pension: retirement distributions
- government: unemployment, disability
- alimony: alimony received
- contributions: family support
- other: any other income

IMPORTANT:
- Use YYYY-MM format for incomeMonth
- For annual documents (W-2, tax returns, 1099s), use the full annual amount - do NOT divide
- Set confidence to 0.9+ when amounts are clearly visible
- Return ONLY the JSON object`;
  }

  /**
   * Normalize and validate extracted monthly income data
   */
  private normalizeMonthlyIncomeData(
    extracted: any,
    documentId: string,
    documentType: string
  ): IncomeExtractionResult {
    const warnings: string[] = extracted.warnings || [];

    if (!extracted.monthlyIncomes || !Array.isArray(extracted.monthlyIncomes)) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: [...warnings, 'No monthly income data found in extraction'],
      };
    }

    const monthlyIncomes: ExtractedMonthlyIncome[] = extracted.monthlyIncomes
      .filter((income: any) => income.incomeMonth && income.grossAmount)
      .map((income: any) => ({
        incomeMonth: this.normalizeMonth(income.incomeMonth),
        grossAmount: Math.round(parseFloat(income.grossAmount) * 100) / 100,
        netAmount: income.netAmount ? Math.round(parseFloat(income.netAmount) * 100) / 100 : null,
        employer: income.employer || null,
        incomeSource: this.normalizeIncomeSource(income.incomeSource),
        description: income.description || `Income from ${documentType}`,
        confidence: Math.min(1, Math.max(0, parseFloat(income.confidence) || 0.7)),
      }));

    // Calculate average confidence
    const totalConfidence = monthlyIncomes.length > 0
      ? monthlyIncomes.reduce((sum, inc) => sum + inc.confidence, 0) / monthlyIncomes.length
      : 0;

    return {
      documentId,
      documentType,
      monthlyIncomes,
      totalConfidence,
      warnings,
    };
  }

  /**
   * Normalize month format to YYYY-MM
   */
  private normalizeMonth(month: string): string {
    // Handle various formats: "2025-01", "01/2025", "January 2025", etc.
    if (/^\d{4}-\d{2}$/.test(month)) {
      return month;
    }

    // Try to parse and format
    const date = new Date(month + '-01');
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 7);
    }

    // Default to current month if parsing fails
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Normalize income source to valid enum value
   */
  private normalizeIncomeSource(source: string): ExtractedMonthlyIncome['incomeSource'] {
    const validSources = [
      'employment', 'self_employment', 'rental', 'interest',
      'pension', 'government', 'spouse', 'alimony', 'contributions', 'other'
    ];

    const normalized = source?.toLowerCase().replace(/-/g, '_');
    if (validSources.includes(normalized)) {
      return normalized as ExtractedMonthlyIncome['incomeSource'];
    }

    // Map common variations
    if (normalized?.includes('wage') || normalized?.includes('salary')) return 'employment';
    if (normalized?.includes('business') || normalized?.includes('self')) return 'self_employment';
    if (normalized?.includes('rent')) return 'rental';
    if (normalized?.includes('dividend') || normalized?.includes('interest')) return 'interest';
    if (normalized?.includes('retire') || normalized?.includes('pension')) return 'pension';
    if (normalized?.includes('unemploy') || normalized?.includes('disability')) return 'government';
    if (normalized?.includes('alimony') || normalized?.includes('maintenance')) return 'alimony';

    return 'other';
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

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM debt extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

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

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM asset extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

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

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM expense extraction returned unexpected response:', JSON.stringify(response));
      return {
        housing: 0,
        utilities: 0,
        food: 0,
        transportation: 0,
        insurance: 0,
        medical: 0,
        childcare: 0,
        other: 0,
        source: 'llm-extraction-failed',
        confidence: 0,
      };
    }

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
    const typeSpecificInstructions: Record<string, string> = {
      credit_card: `This is a CREDIT CARD STATEMENT. Look for:
- Credit card company/bank name (Chase, Capital One, Discover, etc.)
- Statement balance, current balance, or new balance
- Minimum payment due
- Account number (last 4 digits)
- Credit limit and available credit
The debt type should be "credit-card" and isSecured should be false.`,

      loan_statement: `This is a LOAN STATEMENT. Look for:
- Lender name
- Principal balance or payoff amount
- Monthly payment amount
- Interest rate
- Loan type (personal, auto, student, etc.)
Determine if secured based on collateral mentioned.`,

      medical_bill: `This is a MEDICAL BILL. Look for:
- Healthcare provider or hospital name
- Patient responsibility / amount due
- Insurance adjustments
- Account or invoice number
The debt type should be "medical" and isSecured should be false.`,

      collection_notice: `This is a COLLECTION NOTICE. Look for:
- Collection agency name
- Original creditor
- Total amount owed
- Account/reference number
Debt type depends on original debt nature.`,

      mortgage: `This is a MORTGAGE DOCUMENT. Look for:
- Lender/servicer name
- Principal balance
- Monthly payment (P&I, escrow)
- Interest rate
- Property address
The debt type should be "mortgage" and isSecured should be true with property as collateral.`,
    };

    const specificInstructions = typeSpecificInstructions[documentType] ||
      `This is a ${documentType} document. Extract all debt information you can find.`;

    return `You are a bankruptcy paralegal assistant extracting debt information for bankruptcy filing.

${specificInstructions}

Return a JSON object with this exact structure:
{
  "debts": [
    {
      "creditorName": "<string>",
      "accountNumber": "<full account number if visible, or null>",
      "accountLast4": "<last 4 digits of account number - IMPORTANT for matching>",
      "debtType": "credit-card" | "medical" | "personal-loan" | "auto-loan" | "mortgage" | "student-loan" | "tax-debt" | "other",
      "originalAmount": <number or null>,
      "currentBalance": <number>,
      "monthlyPayment": <number or null>,
      "isSecured": <boolean>,
      "collateralDescription": "<string or null>",
      "statementDate": "<YYYY-MM-DD format - the statement date or closing date>",
      "confidence": <0-1 score>
    }
  ]
}

CRITICAL:
- Extract accountLast4 (last 4 digits) - this is used to match the same account across multiple statements
- Extract statementDate - this determines which statement is most recent
- Extract the CURRENT BALANCE / STATEMENT BALANCE as the primary amount
- If multiple balances shown, use the total/statement balance
- Set confidence to 0.9+ for clearly visible amounts
- Include ONLY the JSON object in your response`;
  }

  private buildAssetExtractionPrompt(documentType: string): string {
    const typeSpecificInstructions: Record<string, string> = {
      bank_statement: `This is a BANK STATEMENT. Look for:
- Bank name (Chase, Wells Fargo, Bank of America, etc.) - IMPORTANT for matching
- Account number - extract the LAST 4 DIGITS - CRITICAL for matching across statements
- Account type (checking, savings, money market)
- ENDING BALANCE or CURRENT BALANCE (use this as the asset value)
- Statement date or statement period END date - CRITICAL for determining most recent

The asset type should be "bank-account". Use the ending/current balance as estimatedValue.
IMPORTANT: The accountLast4 and statementDate are CRITICAL for matching the same account across multiple monthly statements.`,

      vehicle_title: `This is a VEHICLE TITLE. Look for:
- Make, Model, Year of vehicle
- VIN number
- Owner name(s)
- Lienholder if any (indicates encumbrance)
The asset type should be "vehicle". Include make/model/year in description.
Note: Title doesn't show value - use a reasonable estimate or 0 if unknown.`,

      property_deed: `This is a PROPERTY DEED. Look for:
- Property address or legal description
- Owner/grantee names
- Recording information
The asset type should be "real-estate". Include address in description.
Note: Deeds don't show value - use a reasonable estimate or 0 if unknown.`,

      mortgage: `This is a MORTGAGE DOCUMENT. For asset extraction, look for:
- Property address
- Property value or appraised value if mentioned
- Owner information
The asset type should be "real-estate" if property info is present.`,
    };

    const specificInstructions = typeSpecificInstructions[documentType] ||
      `This is a ${documentType} document. Extract all asset information you can find.`;

    return `You are a bankruptcy paralegal assistant extracting asset information for bankruptcy filing.

${specificInstructions}

Return a JSON object with this exact structure:
{
  "assets": [
    {
      "assetType": "real-estate" | "vehicle" | "bank-account" | "investment" | "retirement" | "personal-property" | "other",
      "description": "<string>",
      "estimatedValue": <number>,
      "ownershipPercentage": <number 0-100, default 100>,
      "isExempt": <boolean or null>,
      "encumbrances": <number, default 0>,
      "accountLast4": "<last 4 digits of account number for bank accounts - CRITICAL>",
      "institutionName": "<bank or institution name - CRITICAL for matching>",
      "statementDate": "<YYYY-MM-DD - statement date or period end date - CRITICAL>",
      "confidence": <0-1 score>
    }
  ]
}

CRITICAL:
- For bank accounts: accountLast4, institutionName, and statementDate are REQUIRED for matching across multiple statements
- For bank accounts, use the ENDING or CURRENT balance as estimatedValue
- For vehicles, include year/make/model in description
- For real estate, include the property address in description
- Set confidence to 0.9+ for clearly visible values
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

    return extracted.debts.map((debt: any) => {
      // Extract last 4 digits from account number if not explicitly provided
      let accountLast4 = debt.accountLast4 || null;
      if (!accountLast4 && debt.accountNumber) {
        const cleaned = debt.accountNumber.replace(/\D/g, '');
        accountLast4 = cleaned.slice(-4) || null;
      }

      return {
        creditorName: debt.creditorName || 'Unknown Creditor',
        accountNumber: debt.accountNumber || null,
        accountLast4,
        debtType: debt.debtType || 'other',
        originalAmount: debt.originalAmount ? parseFloat(debt.originalAmount) : null,
        currentBalance: parseFloat(debt.currentBalance) || 0,
        monthlyPayment: debt.monthlyPayment ? parseFloat(debt.monthlyPayment) : null,
        isSecured: debt.isSecured || false,
        collateralDescription: debt.collateralDescription || null,
        statementDate: this.normalizeDate(debt.statementDate),
        source: 'llm-extraction',
        confidence: debt.confidence || 0.7,
      };
    });
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private normalizeDate(date: string | null | undefined): string | null {
    if (!date) return null;

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // Try to parse various formats
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    } catch (e) {
      // Parsing failed
    }

    return null;
  }

  private normalizeAssetData(extracted: any): ExtractedAsset[] {
    if (!extracted.assets || !Array.isArray(extracted.assets)) {
      return [];
    }

    return extracted.assets.map((asset: any) => {
      // Extract last 4 digits if provided
      let accountLast4 = asset.accountLast4 || null;
      if (!accountLast4 && asset.accountNumber) {
        const cleaned = asset.accountNumber.replace(/\D/g, '');
        accountLast4 = cleaned.slice(-4) || null;
      }

      return {
        assetType: asset.assetType || 'other',
        description: asset.description || 'Unknown asset',
        estimatedValue: parseFloat(asset.estimatedValue) || 0,
        ownershipPercentage: parseFloat(asset.ownershipPercentage) || 100,
        isExempt: asset.isExempt !== undefined ? asset.isExempt : null,
        encumbrances: parseFloat(asset.encumbrances) || 0,
        accountLast4,
        institutionName: asset.institutionName || null,
        statementDate: this.normalizeDate(asset.statementDate),
        source: 'llm-extraction',
        confidence: asset.confidence || 0.7,
      };
    });
  }
}
