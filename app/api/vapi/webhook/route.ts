import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

/**
 * Vapi Webhook Handler
 *
 * This endpoint receives function calls from the Vapi assistant and executes them.
 * Configure this URL in your Vapi assistant's "Server URL" setting.
 *
 * Supported functions:
 * - check_existing_case: Check if client has an existing case
 * - verify_client: Verify client identity with name + SSN
 * - create_new_case: Create a new bankruptcy case
 * - update_case_intake: Update an existing case with intake data
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

export async function POST(request: NextRequest) {
  try {
    const body: VapiRequest = await request.json();

    // Verify this is a function call
    if (body.message?.type !== 'function-call') {
      return NextResponse.json({ error: 'Not a function call' }, { status: 400 });
    }

    const { name, parameters } = body.message.functionCall;
    const connectionString = getConnectionString(body.call?.metadata);

    if (!connectionString) {
      return NextResponse.json({
        result: JSON.stringify({
          success: false,
          error: 'Database connection not configured',
        }),
      });
    }

    const sql = postgres(connectionString);

    try {
      let result: unknown;

      switch (name) {
        case 'check_existing_case':
          result = await checkExistingCase(sql, parameters);
          break;
        case 'verify_client':
          result = await verifyClient(sql, parameters);
          break;
        case 'create_new_case':
          result = await createNewCase(sql, parameters);
          break;
        case 'update_case_intake':
          result = await updateCaseIntake(sql, parameters);
          break;
        default:
          result = { success: false, error: `Unknown function: ${name}` };
      }

      return NextResponse.json({ result: JSON.stringify(result) });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Vapi webhook error:', error);
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
 */
async function checkExistingCase(
  sql: postgres.Sql,
  params: Record<string, unknown>
): Promise<{ hasExistingCase: boolean; message: string }> {
  const firstName = (params.first_name as string)?.trim().toLowerCase();
  const lastName = (params.last_name as string)?.trim().toLowerCase();

  if (!firstName || !lastName) {
    return {
      hasExistingCase: false,
      message: 'Please provide your first and last name to check for existing cases.',
    };
  }

  // Search for cases matching the name (case-insensitive partial match)
  const cases = await sql`
    SELECT id, client_name, status, created_at
    FROM bankruptcy_cases
    WHERE LOWER(client_name) LIKE ${`%${firstName}%`}
      AND LOWER(client_name) LIKE ${`%${lastName}%`}
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (cases.length > 0) {
    return {
      hasExistingCase: true,
      message: `I found ${cases.length} existing case(s) for ${firstName} ${lastName}. To verify your identity and access your case, I'll need the last 4 digits of your Social Security Number.`,
    };
  }

  return {
    hasExistingCase: false,
    message: `I don't see any existing cases for ${firstName} ${lastName}. Let's start a new case for you.`,
  };
}

/**
 * Verify client identity with name and SSN last 4
 * Returns the matching case(s) if verified
 */
async function verifyClient(
  sql: postgres.Sql,
  params: Record<string, unknown>
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

  // Find case matching name AND SSN last 4
  const cases = await sql`
    SELECT id, client_name, client_email, client_phone,
           case_type, filing_type, status, household_size,
           address, city, state, zip, county, created_at
    FROM bankruptcy_cases
    WHERE LOWER(client_name) LIKE ${`%${firstName}%`}
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
  params: Record<string, unknown>
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

  // Generate a unique ID
  const id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS bankruptcy_cases (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      ssn_last4 TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      county TEXT,
      case_type TEXT NOT NULL,
      filing_type TEXT NOT NULL,
      household_size INTEGER,
      status TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // Insert new case with basic info
  await sql`
    INSERT INTO bankruptcy_cases (
      id, client_name, ssn_last4, case_type, filing_type, status, created_at, updated_at
    ) VALUES (
      ${id},
      ${clientName},
      ${ssnLast4 || null},
      ${caseType},
      ${filingType},
      'intake',
      NOW(),
      NOW()
    )
  `;

  return {
    success: true,
    caseId: id,
    message: `I've created a new ${caseType} bankruptcy case for ${clientName}. Let's continue gathering your information.`,
  };
}

/**
 * Update an existing case with intake information
 */
async function updateCaseIntake(
  sql: postgres.Sql,
  params: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const caseId = params.case_id as string;

  if (!caseId) {
    return {
      success: false,
      message: 'Case ID is required to update intake information.',
    };
  }

  // Build dynamic update based on provided fields
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

  // Perform update
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
    WHERE id = ${caseId as string}
  `;

  const fieldsUpdated = Object.keys(updates).length;
  return {
    success: true,
    message: `Updated ${fieldsUpdated} field(s) on your case. Is there anything else you'd like to add or update?`,
  };
}
