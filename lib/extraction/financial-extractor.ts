/**
 * Financial Data Extraction System
 * Uses case.dev LLM to extract structured data from OCR'd bankruptcy documents
 */

import { CaseDevClient } from '@/lib/case-dev/client';

export interface ExtractedIncome {
  employerName: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'self-employed';
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  startDate: Date | null;
  source: string; // Document ID
  confidence: number;
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
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract income information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "incomes": [
    {
      "employerName": "<string>",
      "employmentType": "full-time" | "part-time" | "contract" | "self-employed",
      "grossMonthlyIncome": <number>,
      "netMonthlyIncome": <number>,
      "payFrequency": "weekly" | "bi-weekly" | "semi-monthly" | "monthly",
      "startDate": "<YYYY-MM-DD or null>",
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Convert all income to MONTHLY amounts (weekly * 4.33, bi-weekly * 2.17, semi-monthly * 2)
- For W-2s, divide annual by 12
- Use gross income (before deductions) and net income (after deductions)
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
      employmentType: income.employmentType || 'full-time',
      grossMonthlyIncome: parseFloat(income.grossMonthlyIncome) || 0,
      netMonthlyIncome: parseFloat(income.netMonthlyIncome) || 0,
      payFrequency: income.payFrequency || 'monthly',
      startDate: income.startDate ? new Date(income.startDate) : null,
      source: 'llm-extraction',
      confidence: income.confidence || 0.7,
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
