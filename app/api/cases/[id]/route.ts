import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Fetch case by ID
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
        WHERE id = ${id}
      `;

      if (cases.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ case: cases[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch case' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    const body = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Update case
      const result = await sql`
        UPDATE bankruptcy_cases
        SET
          client_name = COALESCE(${body.clientName}, client_name),
          client_email = COALESCE(${body.clientEmail}, client_email),
          client_phone = COALESCE(${body.clientPhone}, client_phone),
          ssn_last4 = COALESCE(${body.ssnLast4}, ssn_last4),
          address = COALESCE(${body.address}, address),
          city = COALESCE(${body.city}, city),
          state = COALESCE(${body.state}, state),
          zip = COALESCE(${body.zip}, zip),
          county = COALESCE(${body.county}, county),
          case_type = COALESCE(${body.caseType}, case_type),
          filing_type = COALESCE(${body.filingType}, filing_type),
          household_size = COALESCE(${body.householdSize}, household_size),
          status = COALESCE(${body.status}, status),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING
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
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ case: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Delete case
      const result = await sql`
        DELETE FROM bankruptcy_cases
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete case' },
      { status: 500 }
    );
  }
}
