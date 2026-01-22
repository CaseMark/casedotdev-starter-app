/**
 * Database Schema
 *
 * Drizzle ORM schema definitions for Better Auth and case.dev integration
 */

import { pgTable, text, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Better Auth Tables
 * These tables are required by Better Auth for user management
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Organization Tables (for Better Auth organization plugin)
 */

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  metadata: text('metadata'),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

/**
 * Two-Factor Authentication Tables
 */

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

/**
 * case.dev Integration Tables
 * Stores encrypted API keys and database provisioning info
 */

export const caseDevCredentials = pgTable(
  'case_dev_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    apiKeyEncrypted: text('api_key_encrypted').notNull(),
    apiKeyLast4: text('api_key_last4').notNull(),
    apiKeyPrefix: text('api_key_prefix'),
    verifiedAt: timestamp('verified_at'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('case_dev_creds_user_id_idx').on(table.userId),
  })
);

/**
 * User Databases Table
 * Tracks per-user case.dev database projects
 */
export const userDatabases = pgTable(
  'user_databases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    projectName: text('project_name').notNull(),
    connectionString: text('connection_string').notNull(),
    poolerConnectionString: text('pooler_connection_string'),
    region: text('region').notNull().default('aws-us-east-1'),
    status: text('status').notNull().default('provisioning'), // provisioning, active, error
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_databases_user_id_idx').on(table.userId),
    projectIdIdx: index('user_databases_project_id_idx').on(table.projectId),
  })
);

/**
 * Bankruptcy Case Management Tables
 */

import { integer, decimal, date } from 'drizzle-orm/pg-core';

export const bankruptcyCases = pgTable(
  'bankruptcy_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Client Information
    clientName: text('client_name').notNull(),
    clientEmail: text('client_email'),
    clientPhone: text('client_phone'),
    ssnLast4: text('ssn_last4'),

    // Address
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    county: text('county'),

    // Case Details
    caseType: text('case_type').notNull().$type<'chapter7' | 'chapter13'>(),
    filingType: text('filing_type').notNull().$type<'individual' | 'joint'>(),
    householdSize: integer('household_size'),

    // Status
    status: text('status').notNull().default('intake')
      .$type<'intake' | 'documents_pending' | 'review' | 'ready_to_file' | 'filed' | 'discharged' | 'dismissed'>(),

    // Court Information
    pacerCaseNumber: text('pacer_case_number'),
    courtDistrict: text('court_district'),
    filingDate: date('filing_date'),
    dischargeDate: date('discharge_date'),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('bankruptcy_cases_user_id_idx').on(table.userId),
    statusIdx: index('bankruptcy_cases_status_idx').on(table.status),
  })
);

export const caseDocuments = pgTable(
  'case_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => bankruptcyCases.id, { onDelete: 'cascade' }),

    // Document Storage
    vaultObjectId: text('vault_object_id').notNull(),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size'),
    contentType: text('content_type'),

    // Document Classification
    documentType: text('document_type').notNull()
      .$type<'paystub' | 'w2' | 'tax_return' | '1099' | 'bank_statement' | 'mortgage' | 'lease' | 'utility' | 'insurance' | 'credit_card' | 'loan_statement' | 'medical_bill' | 'collection_notice' | 'vehicle_title' | 'property_deed' | 'other'>(),

    // Validation
    validationStatus: text('validation_status').notNull().default('pending')
      .$type<'pending' | 'valid' | 'invalid' | 'needs_review'>(),
    validationNotes: text('validation_notes'),

    // OCR Results
    ocrText: text('ocr_text'),
    ocrCompleted: boolean('ocr_completed').default(false),

    // Timestamps
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index('case_documents_case_id_idx').on(table.caseId),
    documentTypeIdx: index('case_documents_type_idx').on(table.documentType),
  })
);

export const incomeRecords = pgTable(
  'income_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => bankruptcyCases.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .references(() => caseDocuments.id, { onDelete: 'set null' }),

    // Income Details
    employer: text('employer'),
    occupation: text('occupation'),
    grossPay: decimal('gross_pay', { precision: 10, scale: 2 }),
    netPay: decimal('net_pay', { precision: 10, scale: 2 }),
    payPeriod: text('pay_period').$type<'weekly' | 'biweekly' | 'monthly' | 'annual'>(),
    payDate: date('pay_date'),
    ytdGross: decimal('ytd_gross', { precision: 10, scale: 2 }),

    // Income Source Type
    incomeSource: text('income_source').default('employment')
      .$type<'employment' | 'business' | 'rental' | 'government' | 'other'>(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index('income_records_case_id_idx').on(table.caseId),
  })
);

export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => bankruptcyCases.id, { onDelete: 'cascade' }),

    // Creditor Information
    creditorName: text('creditor_name').notNull(),
    creditorAddress: text('creditor_address'),
    accountNumber: text('account_number'),
    accountLast4: text('account_last4'),

    // Debt Details
    balance: decimal('balance', { precision: 10, scale: 2 }).notNull(),
    monthlyPayment: decimal('monthly_payment', { precision: 10, scale: 2 }),
    interestRate: decimal('interest_rate', { precision: 5, scale: 2 }),

    // Classification
    debtType: text('debt_type').notNull()
      .$type<'credit_card' | 'medical' | 'personal_loan' | 'auto_loan' | 'mortgage' | 'student_loan' | 'tax' | 'child_support' | 'other'>(),
    secured: boolean('secured').default(false),
    priority: boolean('priority').default(false),

    // Collateral (if secured)
    collateral: text('collateral'),
    collateralValue: decimal('collateral_value', { precision: 10, scale: 2 }),

    // Dates
    dateIncurred: date('date_incurred'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index('debts_case_id_idx').on(table.caseId),
    debtTypeIdx: index('debts_type_idx').on(table.debtType),
  })
);

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => bankruptcyCases.id, { onDelete: 'cascade' }),

    // Asset Details
    assetType: text('asset_type').notNull()
      .$type<'real_estate' | 'vehicle' | 'bank_account' | 'retirement' | 'household_goods' | 'jewelry' | 'collectibles' | 'business' | 'other'>(),
    description: text('description').notNull(),
    currentValue: decimal('current_value', { precision: 10, scale: 2 }).notNull(),

    // Real Estate Specific
    address: text('address'),

    // Vehicle Specific
    make: text('make'),
    model: text('model'),
    year: integer('year'),
    vin: text('vin'),

    // Financial Account Specific
    institution: text('institution'),
    accountNumberLast4: text('account_number_last4'),

    // Ownership
    ownershipPercentage: decimal('ownership_percentage', { precision: 5, scale: 2 }).default('100'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index('assets_case_id_idx').on(table.caseId),
  })
);

export const meansTestResults = pgTable(
  'means_test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .unique()
      .references(() => bankruptcyCases.id, { onDelete: 'cascade' }),

    // Income Calculations
    currentMonthlyIncome: decimal('current_monthly_income', { precision: 10, scale: 2 }).notNull(),
    annualizedIncome: decimal('annualized_income', { precision: 10, scale: 2 }).notNull(),
    stateMedianIncome: decimal('state_median_income', { precision: 10, scale: 2 }).notNull(),
    belowMedian: boolean('below_median').notNull(),

    // Disposable Income (if above median)
    disposableIncome: decimal('disposable_income', { precision: 10, scale: 2 }),

    // Result
    passed: boolean('passed').notNull(),
    eligible: boolean('eligible').notNull(),

    // Explanation
    explanation: text('explanation'),

    calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index('means_test_case_id_idx').on(table.caseId),
  })
);

/**
 * Type exports for use in application code
 */

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type CaseDevCredentials = typeof caseDevCredentials.$inferSelect;
export type NewCaseDevCredentials = typeof caseDevCredentials.$inferInsert;

export type BankruptcyCase = typeof bankruptcyCases.$inferSelect;
export type NewBankruptcyCase = typeof bankruptcyCases.$inferInsert;
export type CaseDocument = typeof caseDocuments.$inferSelect;
export type NewCaseDocument = typeof caseDocuments.$inferInsert;
export type IncomeRecord = typeof incomeRecords.$inferSelect;
export type NewIncomeRecord = typeof incomeRecords.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type MeansTestResult = typeof meansTestResults.$inferSelect;
export type NewMeansTestResult = typeof meansTestResults.$inferInsert;
