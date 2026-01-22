import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseData, connectionString } = body;

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database connection string is required' },
        { status: 400 }
      );
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

      // Insert the case
      await sql`
        INSERT INTO bankruptcy_cases (
          id, client_name, client_email, client_phone, ssn_last4,
          address, city, state, zip, county,
          case_type, filing_type, household_size, status, created_at, updated_at
        ) VALUES (
          ${caseData.id},
          ${caseData.clientName},
          ${caseData.clientEmail || null},
          ${caseData.clientPhone || null},
          ${caseData.ssnLast4 || null},
          ${caseData.address || null},
          ${caseData.city || null},
          ${caseData.state || null},
          ${caseData.zip || null},
          ${caseData.county || null},
          ${caseData.caseType},
          ${caseData.filingType},
          ${parseInt(caseData.householdSize) || 1},
          ${caseData.status},
          ${new Date(caseData.createdAt)},
          ${new Date(caseData.createdAt)}
        )
      `;

      return NextResponse.json({ success: true, id: caseData.id });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create case' },
      { status: 500 }
    );
  }
}
