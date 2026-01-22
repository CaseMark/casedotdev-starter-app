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
      // Check if case_documents table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'case_documents'
        )
      `;

      if (!tableExists[0].exists) {
        // Table doesn't exist yet, return empty array
        return NextResponse.json({ documents: [] });
      }

      // Fetch documents for this case
      const documents = await sql`
        SELECT
          id,
          case_id as "caseId",
          file_name as "fileName",
          file_type as "fileType",
          file_size as "fileSize",
          document_type as "documentType",
          validation_status as "validationStatus",
          extracted_data as "extractedData",
          uploaded_at as "uploadedAt"
        FROM case_documents
        WHERE case_id = ${id}
        ORDER BY uploaded_at DESC
      `;

      return NextResponse.json({ documents });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(
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
      // Ensure case_documents table exists
      await sql`
        CREATE TABLE IF NOT EXISTS case_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES bankruptcy_cases(id) ON DELETE CASCADE,
          file_name TEXT NOT NULL,
          file_type TEXT,
          file_size INTEGER,
          document_type TEXT,
          validation_status TEXT DEFAULT 'pending',
          extracted_data JSONB,
          vault_file_id TEXT,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Insert document record
      const result = await sql`
        INSERT INTO case_documents (
          case_id,
          file_name,
          file_type,
          file_size,
          document_type,
          validation_status,
          vault_file_id
        ) VALUES (
          ${id},
          ${body.fileName},
          ${body.fileType || null},
          ${body.fileSize || null},
          ${body.documentType || null},
          ${body.validationStatus || 'pending'},
          ${body.vaultFileId || null}
        )
        RETURNING
          id,
          case_id as "caseId",
          file_name as "fileName",
          file_type as "fileType",
          file_size as "fileSize",
          document_type as "documentType",
          validation_status as "validationStatus",
          vault_file_id as "vaultFileId",
          uploaded_at as "uploadedAt"
      `;

      return NextResponse.json({ document: result[0] }, { status: 201 });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}
