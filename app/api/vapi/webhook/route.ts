import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

/**
 * Vapi Webhook Handler
 *
 * This endpoint receives function calls from the Vapi assistant and executes them.
 * Configure this URL in your Vapi assistant's "Server URL" setting.
 *
 * Supported functions:
 * - check_existing_case: Check if client has existing case (auto-creates if none exists)
 * - verify_client: Verify client identity with name + SSN
 * - create_new_case: Create a new bankruptcy case (deprecated - use check_existing_case)
 * - update_case_intake: Incrementally update case with intake data (call after each field collected)
 * - get_case_documents: Get list of documents uploaded to a case
 * - get_required_documents: Get required documents and their upload status
 *
 * DATA PERSISTENCE STRATEGY:
 * - Cases are created immediately when client provides name (via check_existing_case)
 * - Each piece of collected info is saved immediately (via update_case_intake)
 * - This ensures no data loss if call drops prematurely
 */

interface VapiFunctionCall {
  type: 'function-call';
  functionCall: {
    name: string;
    parameters: Record<string, unknown>;
  };
}

interface VapiRequest {
  message: VapiFunctionCall;
  call?: {
    id: string;
    metadata?: Record<string, unknown>;
  };
}

// Get database connection from request metadata or environment
function getConnectionString(metadata?: Record<string, unknown>): string | null {
  // First try from call metadata (passed from client)
  if (metadata?.connectionString) {
    return metadata.connectionString as string;
  }
  // Fall back to environment variable
  return process.env.DATABASE_URL || null;
}

// Get userId from request metadata
function getUserId(metadata?: Record<string, unknown>): string | null {
  if (metadata?.userId) {
    return metadata.userId as string;
  }
  return null;
}

// GET endpoint for health check / testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'VAPI webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: VapiRequest = await request.json();

    // Log incoming request for debugging
    console.log('[VAPI Webhook] Received request:', {
      messageType: body.message?.type,
      hasMetadata: !!body.call?.metadata,
    });

    // Only process function calls, ignore other message types (status, transcripts, etc.)
    if (body.message?.type !== 'function-call') {
      console.log('[VAPI Webhook] Ignoring non-function-call message:', body.message?.type);
      return NextResponse.json({ success: true, message: 'Message received' }, { status: 200 });
    }

    const { name, parameters } = body.message.functionCall;
    const connectionString = getConnectionString(body.call?.metadata);
    const userId = getUserId(body.call?.metadata);

    console.log('[VAPI Webhook] Function call:', {
      functionName: name,
      hasConnectionString: !!connectionString,
      hasUserId: !!userId,
    });

    if (!connectionString) {
      console.error('[VAPI Webhook] Missing connectionString in metadata');
      return NextResponse.json({
        result: JSON.stringify({
          success: false,
          error: 'Database connection not configured. Ensure connectionString is passed in call metadata.',
        }),
      });
    }

    if (!userId) {
      console.error('[VAPI Webhook] Missing userId in metadata');
      return NextResponse.json({
        result: JSON.stringify({
          success: false,
          error: 'User ID not provided in metadata. Ensure userId is passed in call metadata.',
        }),
      });
    }

    const sql = postgres(connectionString);

    try {
      let result: unknown;

      switch (name) {
        case 'check_existing_case':
          result = await checkExistingCase(sql, parameters, userId);
          break;
        case 'verify_client':
          result = await verifyClient(sql, parameters, userId);
          break;
        case 'create_new_case':
          result = await createNewCase(sql, parameters, userId);
          break;
        case 'update_case_intake':
          result = await updateCaseIntake(sql, parameters, userId);
          break;
        case 'get_case_documents':
          result = await getCaseDocuments(sql, parameters, userId);
          break;
        case 'get_required_documents':
          result = await getRequiredDocuments(sql, parameters, userId);
          break;
        default:
          console.error('[VAPI Webhook] Unknown function:', name);
          result = { success: false, error: `Unknown function: ${name}` };
      }

      console.log('[VAPI Webhook] Function result:', { function: name, result });
      return NextResponse.json({ result: JSON.stringify(result) });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('[VAPI Webhook] Error processing request:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({
      result: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
    });
  }
}

/**
 * Check if a client has any existing cases
 * Called at the start of the conversation to determine the flow
 *
 * IMPORTANT: If no case exists, this function automatically creates one
 * to ensure data is saved even if the call drops prematurely.
 */
async function checkExistingCase(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{ hasExistingCase: boolean; caseId?: string; message: string }> {
  const firstName = (params.first_name as string)?.trim().toLowerCase();
  const lastName = (params.last_name as string)?.trim().toLowerCase();

  if (!firstName || !lastName) {
    return {
      hasExistingCase: false,
      message: 'Please provide your first and last name to check for existing cases.',
    };
  }

  // Search for cases matching the name (case-insensitive partial match) and userId
  const cases = await sql`
    SELECT id, client_name, status, created_at
    FROM bankruptcy_cases
    WHERE user_id = ${userId}
      AND LOWER(client_name) LIKE ${`%${firstName}%`}
      AND LOWER(client_name) LIKE ${`%${lastName}%`}
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (cases.length > 0) {
    return {
      hasExistingCase: true,
      caseId: cases[0].id,
      message: `I found ${cases.length} existing case(s) for ${firstName} ${lastName}. To verify your identity and access your case, I'll need the last 4 digits of your Social Security Number.`,
    };
  }

  // NO EXISTING CASE - Create one immediately to prevent data loss if call drops
  const fullName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;

  // Create minimal case with just the name - let database generate UUID
  const result = await sql`
    INSERT INTO bankruptcy_cases (
      user_id, client_name, case_type, filing_type, status
    ) VALUES (
      ${userId},
      ${fullName},
      'chapter7',
      'individual',
      'intake'
    )
    RETURNING id
  `;

  const newCaseId = result[0].id;

  return {
    hasExistingCase: false,
    caseId: newCaseId,
    message: `I've started a new case for ${fullName}. Let's gather your information.`,
  };
}

/**
 * Verify client identity with name and SSN last 4
 * Returns the matching case(s) if verified
 */
async function verifyClient(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{
  verified: boolean;
  caseId?: string;
  caseDetails?: Record<string, unknown>;
  message: string;
}> {
  const firstName = (params.first_name as string)?.trim().toLowerCase();
  const lastName = (params.last_name as string)?.trim().toLowerCase();
  const ssnLast4 = (params.ssn_last_4 as string)?.trim();

  if (!firstName || !lastName || !ssnLast4) {
    return {
      verified: false,
      message: 'Please provide your first name, last name, and the last 4 digits of your SSN.',
    };
  }

  if (ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
    return {
      verified: false,
      message: 'The SSN should be exactly 4 digits. Please try again.',
    };
  }

  // Find case matching name AND SSN last 4 AND userId
  const cases = await sql`
    SELECT id, client_name, client_email, client_phone,
           case_type, filing_type, status, household_size,
           address, city, state, zip, county, created_at
    FROM bankruptcy_cases
    WHERE user_id = ${userId}
      AND LOWER(client_name) LIKE ${`%${firstName}%`}
      AND LOWER(client_name) LIKE ${`%${lastName}%`}
      AND ssn_last4 = ${ssnLast4}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (cases.length === 0) {
    return {
      verified: false,
      message: 'I could not verify your identity with the information provided. Please double-check your name and SSN digits, or we can start a new case.',
    };
  }

  const caseData = cases[0];
  return {
    verified: true,
    caseId: caseData.id,
    caseDetails: {
      clientName: caseData.client_name,
      email: caseData.client_email,
      phone: caseData.client_phone,
      caseType: caseData.case_type,
      filingType: caseData.filing_type,
      status: caseData.status,
      householdSize: caseData.household_size,
      address: caseData.address,
      city: caseData.city,
      state: caseData.state,
      zip: caseData.zip,
      county: caseData.county,
    },
    message: `Identity verified! I found your ${caseData.case_type} case created on ${new Date(caseData.created_at).toLocaleDateString()}. Current status: ${caseData.status}. What would you like to update?`,
  };
}

/**
 * Create a new bankruptcy case
 */
async function createNewCase(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; caseId?: string; message: string }> {
  const clientName = params.client_name as string;
  const ssnLast4 = params.ssn_last_4 as string;
  const caseType = (params.case_type as string) || 'chapter7';
  const filingType = (params.filing_type as string) || 'individual';

  if (!clientName) {
    return {
      success: false,
      message: 'Client name is required to create a case.',
    };
  }

  // Insert new case with basic info - let database generate UUID
  const result = await sql`
    INSERT INTO bankruptcy_cases (
      user_id, client_name, ssn_last4, case_type, filing_type, status
    ) VALUES (
      ${userId},
      ${clientName},
      ${ssnLast4 || null},
      ${caseType},
      ${filingType},
      'intake'
    )
    RETURNING id
  `;

  const newCaseId = result[0].id;

  return {
    success: true,
    caseId: newCaseId,
    message: `I've created a new ${caseType} bankruptcy case for ${clientName}. Let's continue gathering your information.`,
  };
}

/**
 * Update an existing case with intake information
 *
 * INCREMENTAL UPDATES: This function is designed to be called multiple times
 * during a conversation. The VAPI assistant should call this function after
 * collecting each piece of information (e.g., after getting email, after getting
 * address, etc.) to ensure data is saved immediately.
 *
 * Only provided fields are updated - existing data is preserved.
 */
async function updateCaseIntake(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const caseId = params.case_id as string;

  if (!caseId) {
    return {
      success: false,
      message: 'Case ID is required to update intake information.',
    };
  }

  // CRITICAL: Verify case exists and belongs to user before attempting update
  // This function should NEVER create a new case
  const existingCase = await sql`
    SELECT id FROM bankruptcy_cases
    WHERE id = ${caseId} AND user_id = ${userId}
  `;

  if (existingCase.length === 0) {
    return {
      success: false,
      message: 'Case not found or does not belong to this user. Cannot update non-existent case. Please contact support.',
    };
  }

  // Build dynamic update based on provided fields
  // Only fields that are provided in params will be updated
  const updates: Record<string, unknown> = {};

  if (params.client_email) updates.client_email = params.client_email;
  if (params.client_phone) updates.client_phone = params.client_phone;
  if (params.ssn_last_4) updates.ssn_last4 = params.ssn_last_4;
  if (params.address) updates.address = params.address;
  if (params.city) updates.city = params.city;
  if (params.state) updates.state = params.state;
  if (params.zip) updates.zip = params.zip;
  if (params.county) updates.county = params.county;
  if (params.household_size) updates.household_size = params.household_size;
  if (params.case_type) updates.case_type = params.case_type;
  if (params.filing_type) updates.filing_type = params.filing_type;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      message: 'No fields provided to update.',
    };
  }

  // Perform update - with userId filter for security
  await sql`
    UPDATE bankruptcy_cases
    SET
      client_email = COALESCE(${(updates.client_email as string) ?? null}, client_email),
      client_phone = COALESCE(${(updates.client_phone as string) ?? null}, client_phone),
      ssn_last4 = COALESCE(${(updates.ssn_last4 as string) ?? null}, ssn_last4),
      address = COALESCE(${(updates.address as string) ?? null}, address),
      city = COALESCE(${(updates.city as string) ?? null}, city),
      state = COALESCE(${(updates.state as string) ?? null}, state),
      zip = COALESCE(${(updates.zip as string) ?? null}, zip),
      county = COALESCE(${(updates.county as string) ?? null}, county),
      household_size = COALESCE(${updates.household_size !== undefined ? Number(updates.household_size) : null}, household_size),
      case_type = COALESCE(${(updates.case_type as string) ?? null}, case_type),
      filing_type = COALESCE(${(updates.filing_type as string) ?? null}, filing_type),
      updated_at = NOW()
    WHERE id = ${caseId as string} AND user_id = ${userId}
  `;

  const fieldsUpdated = Object.keys(updates).length;
  return {
    success: true,
    message: `Updated ${fieldsUpdated} field(s) on your case. Is there anything else you'd like to add or update?`,
  };
}

/**
 * Get documents uploaded to a case
 */
async function getCaseDocuments(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{
  success: boolean;
  documents?: Array<{ fileName: string; documentType: string; status: string }>;
  message: string;
}> {
  const caseId = params.case_id as string;

  if (!caseId) {
    return {
      success: false,
      message: 'Case ID is required. Please verify your identity first.',
    };
  }

  // Verify case belongs to user
  const caseCheck = await sql`
    SELECT id FROM bankruptcy_cases
    WHERE id = ${caseId} AND user_id = ${userId}
  `;

  if (caseCheck.length === 0) {
    return {
      success: false,
      message: 'Case not found or does not belong to this user.',
    };
  }

  // Check if case_documents table exists
  const tableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'case_documents'
    )
  `;

  if (!tableExists[0].exists) {
    return {
      success: true,
      documents: [],
      message: 'No documents have been uploaded to your case yet.',
    };
  }

  const documents = await sql`
    SELECT file_name, document_type, validation_status, uploaded_at
    FROM case_documents
    WHERE case_id = ${caseId}
    ORDER BY uploaded_at DESC
  `;

  if (documents.length === 0) {
    return {
      success: true,
      documents: [],
      message: 'No documents have been uploaded to your case yet. You can upload documents through the case dashboard.',
    };
  }

  const docList = documents.map((d: any) => ({
    fileName: d.file_name,
    documentType: formatDocType(d.document_type),
    status: d.validation_status === 'valid' ? 'Validated' :
            d.validation_status === 'pending' ? 'Processing' : 'Needs Review',
  }));

  const summary = docList.map(d => `${d.fileName} (${d.documentType}) - ${d.status}`).join(', ');

  return {
    success: true,
    documents: docList,
    message: `You have ${documents.length} document(s) uploaded: ${summary}`,
  };
}

/**
 * Get list of required documents and their upload status
 */
async function getRequiredDocuments(
  sql: postgres.Sql,
  params: Record<string, unknown>,
  userId: string
): Promise<{
  success: boolean;
  required: string[];
  optional: string[];
  uploaded: string[];
  message: string;
}> {
  const caseId = params.case_id as string;

  if (!caseId) {
    return {
      success: false,
      required: [],
      optional: [],
      uploaded: [],
      message: 'Case ID is required. Please verify your identity first.',
    };
  }

  // Verify case belongs to user
  const caseCheck = await sql`
    SELECT id FROM bankruptcy_cases
    WHERE id = ${caseId} AND user_id = ${userId}
  `;

  if (caseCheck.length === 0) {
    return {
      success: false,
      required: [],
      optional: [],
      uploaded: [],
      message: 'Case not found or does not belong to this user.',
    };
  }

  // Required documents for Chapter 7
  const requiredDocs = [
    { type: 'tax_return', label: 'Tax Returns (Last 2 Years)', required: true },
    { type: 'paystub', label: 'Pay Stubs (Last 6 Months)', required: true },
    { type: 'bank_statement', label: 'Bank Statements (Last 6 Months)', required: true },
    { type: 'mortgage', label: 'Mortgage Statement or Lease', required: true },
    { type: 'credit_card', label: 'Credit Card Statements', required: true },
    { type: 'vehicle_title', label: 'Vehicle Titles & Loan Statements', required: false },
    { type: 'medical_bill', label: 'Medical Bills', required: false },
    { type: 'utility', label: 'Utility Bills', required: false },
  ];

  // Check what's been uploaded
  let uploadedTypes: string[] = [];
  const tableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'case_documents'
    )
  `;

  if (tableExists[0].exists) {
    const docs = await sql`
      SELECT DISTINCT document_type FROM case_documents WHERE case_id = ${caseId}
    `;
    uploadedTypes = docs.map((d: any) => d.document_type);
  }

  const missingRequired = requiredDocs
    .filter(d => d.required && !uploadedTypes.includes(d.type))
    .map(d => d.label);

  const missingOptional = requiredDocs
    .filter(d => !d.required && !uploadedTypes.includes(d.type))
    .map(d => d.label);

  const completed = requiredDocs
    .filter(d => uploadedTypes.includes(d.type))
    .map(d => d.label);

  let message = '';
  if (missingRequired.length > 0) {
    message = `You still need to upload: ${missingRequired.join(', ')}.`;
  } else {
    message = 'All required documents have been uploaded.';
  }

  if (completed.length > 0) {
    message += ` You've completed: ${completed.join(', ')}.`;
  }

  return {
    success: true,
    required: missingRequired,
    optional: missingOptional,
    uploaded: completed,
    message,
  };
}

// Helper to format document type for display
function formatDocType(type: string | null): string {
  if (!type) return 'Unknown';
  const typeMap: Record<string, string> = {
    tax_return: 'Tax Return',
    paystub: 'Pay Stub',
    bank_statement: 'Bank Statement',
    mortgage: 'Mortgage/Lease',
    credit_card: 'Credit Card Statement',
    vehicle_title: 'Vehicle Title',
    medical_bill: 'Medical Bill',
    utility: 'Utility Bill',
    w2: 'W-2 Form',
    '1099': '1099 Form',
  };
  return typeMap[type] || type.replace(/_/g, ' ');
}
