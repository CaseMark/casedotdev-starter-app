import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(request: NextRequest) {
  try {
    // Get connection string from query parameter
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      // Return empty array if database not initialized yet
      return NextResponse.json({ cases: [] });
    }

    // Connect to database
    const sql = postgres(connectionString);

    try {
      // Create cases table if it doesn't exist
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

      // Fetch all cases
      const cases = await sql`
        SELECT
          id,
          client_name as "clientName",
          client_email as "clientEmail",
          client_phone as "clientPhone",
          ssn_last4 as "ssnLast4",
          address,
          city,
          state,
          zip,
          county,
          case_type as "caseType",
          filing_type as "filingType",
          household_size as "householdSize",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM bankruptcy_cases
        ORDER BY created_at DESC
      `;

      return NextResponse.json({ cases });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error listing cases:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list cases', cases: [] },
      { status: 500 }
    );
  }
}
