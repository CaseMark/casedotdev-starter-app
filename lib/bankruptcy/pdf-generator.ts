/**
 * PDF Generator for Bankruptcy Forms
 * Generates official bankruptcy form PDFs using jsPDF
 */

import jsPDF from 'jspdf';
import {
  Form101Data,
  Form106IData,
  Form106JData,
  Form106ABData,
  Form106DData,
  Form106EFData,
  Form122AData,
  AllFormsData,
} from './form-mapper';

export interface GeneratedForm {
  formId: string;
  formName: string;
  filename: string;
  blob: Blob;
}

// PDF styling constants
const FONT_SIZE = {
  title: 14,
  subtitle: 12,
  normal: 10,
  small: 8,
};

const MARGINS = {
  top: 72, // 1 inch
  bottom: 72,
  left: 72,
  right: 72,
};

const PAGE_WIDTH = 612; // 8.5 inches in points
const PAGE_HEIGHT = 792; // 11 inches in points
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper to add page header
function addHeader(doc: jsPDF, formName: string, pageNum: number) {
  doc.setFontSize(FONT_SIZE.small);
  doc.setFont('times', 'normal');
  doc.text(formName, MARGINS.left, 36);
  doc.text(`Page ${pageNum}`, PAGE_WIDTH - MARGINS.right - 30, 36);
}

// Helper to add section title
function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.setFont('times', 'bold');
  doc.text(title, MARGINS.left, y);
  doc.setFont('times', 'normal');
  return y + 20;
}

// Helper to add labeled field
function addField(doc: jsPDF, label: string, value: string, x: number, y: number, width: number): number {
  doc.setFontSize(FONT_SIZE.small);
  doc.setFont('times', 'normal');
  doc.text(label, x, y);
  doc.setFont('times', 'bold');
  doc.text(value || 'N/A', x, y + 12);
  doc.setFont('times', 'normal');
  // Draw underline
  doc.line(x, y + 14, x + width, y + 14);
  return y + 24;
}

// Helper to add table row
function addTableRow(doc: jsPDF, columns: string[], widths: number[], y: number, isHeader: boolean = false): number {
  doc.setFontSize(FONT_SIZE.small);
  let x = MARGINS.left;

  if (isHeader) {
    doc.setFont('times', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGINS.left, y - 10, CONTENT_WIDTH, 14, 'F');
  } else {
    doc.setFont('times', 'normal');
  }

  columns.forEach((col, i) => {
    doc.text(col.substring(0, Math.floor(widths[i] / 5)), x + 2, y);
    x += widths[i];
  });

  doc.setFont('times', 'normal');
  return y + 16;
}

// Check if we need a new page
function checkNewPage(doc: jsPDF, y: number, formName: string): { doc: jsPDF; y: number; pageNum: number } {
  const pageCount = doc.getNumberOfPages();
  if (y > PAGE_HEIGHT - MARGINS.bottom - 50) {
    doc.addPage();
    addHeader(doc, formName, pageCount + 1);
    return { doc, y: MARGINS.top + 20, pageNum: pageCount + 1 };
  }
  return { doc, y, pageNum: pageCount };
}

// Generate Form 101 - Voluntary Petition
export function generateForm101(data: Form101Data): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Title
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('UNITED STATES BANKRUPTCY COURT', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(FONT_SIZE.subtitle);
  doc.text(data.courtDistrict, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  doc.setFontSize(FONT_SIZE.title);
  doc.text('Voluntary Petition for Individuals Filing for Bankruptcy', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 101', pageNum);

  // Debtor Information Section
  y = addSectionTitle(doc, 'Part 1: Identify Yourself', y);

  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);

  if (data.spouseName) {
    y = addField(doc, 'Spouse Name:', data.spouseName, MARGINS.left + 220, y - 24, 200);
    y += 24;
  }

  y = addField(doc, 'Social Security Number:', data.ssn, MARGINS.left, y, 150);

  y = addField(doc, 'Street Address:', data.address.street, MARGINS.left, y, CONTENT_WIDTH);
  y = addField(doc, 'City, State, ZIP:', `${data.address.city}, ${data.address.state} ${data.address.zip}`, MARGINS.left, y, CONTENT_WIDTH);
  y = addField(doc, 'County:', data.address.county, MARGINS.left, y, 200);

  // Filing Information
  y = addSectionTitle(doc, 'Part 2: Tell the Court About Your Bankruptcy Case', y + 10);

  y = addField(doc, 'Chapter:', `Chapter ${data.chapter}`, MARGINS.left, y, 100);
  y = addField(doc, 'Filing Type:', data.filingType === 'joint' ? 'Joint Filing' : 'Individual Filing', MARGINS.left + 150, y - 24, 150);
  y += 24;

  // Statistical Information
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 101'));
  y = addSectionTitle(doc, 'Part 3: Statistical Information', y + 10);

  y = addField(doc, 'Estimated Number of Creditors:', data.estimatedCreditors, MARGINS.left, y, 200);
  y = addField(doc, 'Estimated Assets:', data.estimatedAssets, MARGINS.left, y, 200);
  y = addField(doc, 'Estimated Liabilities:', data.estimatedLiabilities, MARGINS.left, y, 200);
  y = addField(doc, 'Estimated Annual Income:', data.estimatedIncome, MARGINS.left, y, 200);

  // Signature Block
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 101'));
  y = addSectionTitle(doc, 'Part 4: Sign Below', y + 20);

  doc.setFontSize(FONT_SIZE.small);
  doc.text('I declare under penalty of perjury that the information provided in this petition is true and correct.', MARGINS.left, y);
  y += 30;

  doc.text('Signature of Debtor: _________________________________', MARGINS.left, y);
  y += 20;
  doc.text('Date: _______________', MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form101',
    formName: data.formName,
    filename: 'Form_101_Voluntary_Petition.pdf',
    blob,
  };
}

// Generate Form 106I - Schedule I (Income)
export function generateForm106I(data: Form106IData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Schedule I: Your Income', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 106I', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Employment Income
  y = addSectionTitle(doc, 'Part 1: Employment Income', y + 10);

  if (data.incomeSources.length > 0) {
    const colWidths = [150, 100, 100, 118];
    y = addTableRow(doc, ['Employer', 'Occupation', 'Gross Pay', 'Net Pay'], colWidths, y, true);

    data.incomeSources.forEach(source => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106I'));
      y = addTableRow(doc, [
        source.employer,
        source.occupation,
        formatCurrency(source.monthlyGross),
        formatCurrency(source.monthlyNet),
      ], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('No employment income reported.', MARGINS.left, y);
    y += 20;
  }

  // Other Income
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 106I'));
  y = addSectionTitle(doc, 'Part 2: Other Income', y + 20);

  if (data.otherIncome.length > 0) {
    const colWidths = [300, 168];
    y = addTableRow(doc, ['Source', 'Monthly Amount'], colWidths, y, true);

    data.otherIncome.forEach(income => {
      y = addTableRow(doc, [income.source, formatCurrency(income.amount)], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('No other income reported.', MARGINS.left, y);
    y += 20;
  }

  // Total
  y += 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.text(`Total Monthly Income: ${formatCurrency(data.totalMonthlyIncome)}`, MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form106I',
    formName: data.formName,
    filename: 'Form_106I_Schedule_I_Income.pdf',
    blob,
  };
}

// Generate Form 106J - Schedule J (Expenses)
export function generateForm106J(data: Form106JData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Schedule J: Your Expenses', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 106J', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Expenses
  y = addSectionTitle(doc, 'Part 1: Monthly Expenses', y + 10);

  const expenseItems = [
    { label: 'Rent or Mortgage', value: data.expenses.rent },
    { label: 'Utilities (Electric, Gas, Water, etc.)', value: data.expenses.utilities },
    { label: 'Food', value: data.expenses.food },
    { label: 'Clothing', value: data.expenses.clothing },
    { label: 'Transportation', value: data.expenses.transportation },
    { label: 'Medical and Dental', value: data.expenses.medical },
    { label: 'Childcare', value: data.expenses.childcare },
    { label: 'Education', value: data.expenses.education },
    { label: 'Entertainment', value: data.expenses.entertainment },
    { label: 'Taxes (Not deducted from paycheck)', value: data.expenses.taxes },
    { label: 'Insurance', value: data.expenses.insurance },
    { label: 'Installment Payments', value: data.expenses.debtPayments },
    { label: 'Other Expenses', value: data.expenses.other },
  ];

  const colWidths = [350, 118];
  y = addTableRow(doc, ['Expense Category', 'Monthly Amount'], colWidths, y, true);

  expenseItems.forEach(item => {
    ({ y, pageNum } = checkNewPage(doc, y, 'Form 106J'));
    y = addTableRow(doc, [item.label, formatCurrency(item.value)], colWidths, y);
  });

  // Totals
  y += 10;
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 20;

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.normal);
  doc.text(`Total Monthly Expenses: ${formatCurrency(data.totalExpenses)}`, MARGINS.left, y);
  y += 20;
  doc.text(`Monthly Net Income: ${formatCurrency(data.monthlyNetIncome)}`, MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form106J',
    formName: data.formName,
    filename: 'Form_106J_Schedule_J_Expenses.pdf',
    blob,
  };
}

// Generate Form 106A/B - Property
export function generateForm106AB(data: Form106ABData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Schedule A/B: Property', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 106A/B', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Real Property
  y = addSectionTitle(doc, 'Part 1: Real Property', y + 10);

  if (data.realProperty.length > 0) {
    const colWidths = [200, 150, 118];
    y = addTableRow(doc, ['Description', 'Address', 'Current Value'], colWidths, y, true);

    data.realProperty.forEach(prop => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
      y = addTableRow(doc, [prop.description, prop.address, formatCurrency(prop.currentValue)], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('None', MARGINS.left, y);
    y += 20;
  }

  // Vehicles
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
  y = addSectionTitle(doc, 'Part 2: Vehicles', y + 20);

  if (data.personalProperty.vehicles.length > 0) {
    const colWidths = [250, 100, 118];
    y = addTableRow(doc, ['Description', 'Year', 'Current Value'], colWidths, y, true);

    data.personalProperty.vehicles.forEach(v => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
      y = addTableRow(doc, [
        `${v.make} ${v.model}`.trim() || v.description,
        v.year?.toString() || 'N/A',
        formatCurrency(v.currentValue),
      ], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('None', MARGINS.left, y);
    y += 20;
  }

  // Bank Accounts
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
  y = addSectionTitle(doc, 'Part 3: Bank Accounts', y + 20);

  if (data.personalProperty.bankAccounts.length > 0) {
    const colWidths = [200, 150, 118];
    y = addTableRow(doc, ['Institution', 'Account Type', 'Balance'], colWidths, y, true);

    data.personalProperty.bankAccounts.forEach(acct => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
      y = addTableRow(doc, [acct.institution, acct.accountType, formatCurrency(acct.currentValue)], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('None', MARGINS.left, y);
    y += 20;
  }

  // Summary
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 106A/B'));
  y += 20;
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 20;

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.normal);
  doc.text(`Total Real Property: ${formatCurrency(data.totalRealProperty)}`, MARGINS.left, y);
  y += 16;
  doc.text(`Total Personal Property: ${formatCurrency(data.totalPersonalProperty)}`, MARGINS.left, y);
  y += 16;
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.text(`Total Assets: ${formatCurrency(data.totalAssets)}`, MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form106AB',
    formName: data.formName,
    filename: 'Form_106AB_Schedule_AB_Property.pdf',
    blob,
  };
}

// Generate Form 106D - Secured Claims
export function generateForm106D(data: Form106DData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Schedule D: Creditors Who Have Claims Secured by Property', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 106D', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Secured Claims
  y = addSectionTitle(doc, 'Secured Creditors', y + 10);

  if (data.securedClaims.length > 0) {
    const colWidths = [150, 150, 84, 84];
    y = addTableRow(doc, ['Creditor', 'Collateral', 'Value', 'Claim'], colWidths, y, true);

    data.securedClaims.forEach(claim => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106D'));
      y = addTableRow(doc, [
        claim.creditorName,
        claim.collateral || 'N/A',
        formatCurrency(claim.collateralValue),
        formatCurrency(claim.amountOfClaim),
      ], colWidths, y);
    });
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('No secured creditors.', MARGINS.left, y);
    y += 20;
  }

  // Total
  y += 20;
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 20;

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.text(`Total Secured Claims: ${formatCurrency(data.totalSecuredClaims)}`, MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form106D',
    formName: data.formName,
    filename: 'Form_106D_Schedule_D_Secured.pdf',
    blob,
  };
}

// Generate Form 106E/F - Unsecured Claims
export function generateForm106EF(data: Form106EFData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Schedule E/F: Creditors Who Have Unsecured Claims', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 106E/F', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Priority Claims
  y = addSectionTitle(doc, 'Part 1: Priority Unsecured Claims', y + 10);

  if (data.priorityClaims.length > 0) {
    const colWidths = [200, 168, 100];
    y = addTableRow(doc, ['Creditor', 'Priority Type', 'Amount'], colWidths, y, true);

    data.priorityClaims.forEach(claim => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106E/F'));
      y = addTableRow(doc, [claim.creditorName, claim.priorityType, formatCurrency(claim.amountOfClaim)], colWidths, y);
    });

    y += 10;
    doc.setFont('times', 'bold');
    doc.text(`Subtotal Priority Claims: ${formatCurrency(data.totalPriorityClaims)}`, MARGINS.left, y);
    y += 20;
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('No priority unsecured claims.', MARGINS.left, y);
    y += 20;
  }

  // Non-Priority Claims
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 106E/F'));
  y = addSectionTitle(doc, 'Part 2: Non-Priority Unsecured Claims', y + 20);

  if (data.nonPriorityClaims.length > 0) {
    const colWidths = [200, 168, 100];
    y = addTableRow(doc, ['Creditor', 'Claim Type', 'Amount'], colWidths, y, true);

    data.nonPriorityClaims.forEach(claim => {
      ({ y, pageNum } = checkNewPage(doc, y, 'Form 106E/F'));
      y = addTableRow(doc, [claim.creditorName, claim.claimType, formatCurrency(claim.amountOfClaim)], colWidths, y);
    });

    y += 10;
    doc.setFont('times', 'bold');
    doc.text(`Subtotal Non-Priority Claims: ${formatCurrency(data.totalNonPriorityClaims)}`, MARGINS.left, y);
  } else {
    doc.setFontSize(FONT_SIZE.normal);
    doc.text('No non-priority unsecured claims.', MARGINS.left, y);
  }

  // Total
  y += 30;
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 20;

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.text(`Total Unsecured Claims: ${formatCurrency(data.totalPriorityClaims + data.totalNonPriorityClaims)}`, MARGINS.left, y);

  const blob = doc.output('blob');
  return {
    formId: 'form106EF',
    formName: data.formName,
    filename: 'Form_106EF_Schedule_EF_Unsecured.pdf',
    blob,
  };
}

// Generate Form 122A - Means Test
export function generateForm122A(data: Form122AData): GeneratedForm {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  let y = MARGINS.top;
  let pageNum = 1;

  // Header
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('times', 'bold');
  doc.text('Chapter 7 Means Test Calculation', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 30;

  addHeader(doc, 'Form 122A', pageNum);

  // Case Info
  y = addField(doc, 'Debtor Name:', data.debtorName, MARGINS.left, y, 200);
  y = addField(doc, 'Case Number:', data.caseNumber || 'Pending', MARGINS.left + 250, y - 24, 150);
  y += 24;

  // Income Comparison
  y = addSectionTitle(doc, 'Part 1: Calculate Your Current Monthly Income', y + 10);

  y = addField(doc, 'Average Monthly Income:', formatCurrency(data.averageMonthlyIncome), MARGINS.left, y, 200);
  y = addField(doc, 'Annualized Income:', formatCurrency(data.annualizedIncome), MARGINS.left, y, 200);
  y = addField(doc, 'State Median Income:', formatCurrency(data.stateMedianIncome), MARGINS.left, y, 200);

  y += 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.normal);
  if (data.isAboveMedian) {
    doc.text('Income is ABOVE state median - must complete Part 2', MARGINS.left, y);
  } else {
    doc.setTextColor(0, 128, 0);
    doc.text('Income is BELOW state median - No presumption of abuse', MARGINS.left, y);
    doc.setTextColor(0, 0, 0);
  }
  y += 30;

  // Deductions (if above median)
  if (data.isAboveMedian) {
    y = addSectionTitle(doc, 'Part 2: Calculate Deductions', y);

    y = addField(doc, 'National Standards:', formatCurrency(data.allowedDeductions.nationalStandards), MARGINS.left, y, 200);
    y = addField(doc, 'Local Standards:', formatCurrency(data.allowedDeductions.localStandards), MARGINS.left, y, 200);
    y = addField(doc, 'Other Expenses:', formatCurrency(data.allowedDeductions.otherExpenses), MARGINS.left, y, 200);
    y = addField(doc, 'Secured Debt Payments:', formatCurrency(data.allowedDeductions.securedDebtPayments), MARGINS.left, y, 200);
    y = addField(doc, 'Priority Debt Payments:', formatCurrency(data.allowedDeductions.priorityDebtPayments), MARGINS.left, y, 200);
  }

  // Determination
  ({ y, pageNum } = checkNewPage(doc, y, 'Form 122A'));
  y = addSectionTitle(doc, 'Part 3: Determination', y + 20);

  y = addField(doc, 'Monthly Disposable Income:', formatCurrency(data.monthlyDisposableIncome), MARGINS.left, y, 200);
  y = addField(doc, '60-Month Total:', formatCurrency(data.sixtyMonthDisposable), MARGINS.left, y, 200);

  y += 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE.subtitle);

  if (data.passesTest) {
    doc.setFillColor(200, 255, 200);
    doc.rect(MARGINS.left - 5, y - 15, CONTENT_WIDTH + 10, 25, 'F');
    doc.setTextColor(0, 100, 0);
    doc.text('RESULT: No presumption of abuse - Eligible for Chapter 7', MARGINS.left, y);
  } else {
    doc.setFillColor(255, 200, 200);
    doc.rect(MARGINS.left - 5, y - 15, CONTENT_WIDTH + 10, 25, 'F');
    doc.setTextColor(150, 0, 0);
    doc.text('RESULT: Presumption of abuse applies - Consider Chapter 13', MARGINS.left, y);
  }
  doc.setTextColor(0, 0, 0);

  const blob = doc.output('blob');
  return {
    formId: 'form122A',
    formName: data.formName,
    filename: 'Form_122A_Means_Test.pdf',
    blob,
  };
}

// Generate all forms
export function generateAllForms(formsData: AllFormsData): GeneratedForm[] {
  return [
    generateForm101(formsData.form101),
    generateForm106I(formsData.form106I),
    generateForm106J(formsData.form106J),
    generateForm106AB(formsData.form106AB),
    generateForm106D(formsData.form106D),
    generateForm106EF(formsData.form106EF),
    generateForm122A(formsData.form122A),
  ];
}
