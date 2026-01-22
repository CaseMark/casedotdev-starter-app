import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { CaseDevClient } from "@/lib/case-dev/client";

export async function POST(request: NextRequest) {
  try {
    // Get connection string from query params
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    // Get API key from header
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caseId = formData.get("caseId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !caseId || !documentType) {
      return NextResponse.json(
        { error: "File, caseId, and documentType are required" },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Verify case exists
      const caseResult = await sql`
        SELECT id FROM bankruptcy_cases WHERE id = ${caseId}
      `;

      if (caseResult.length === 0) {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 }
        );
      }

      // Create case.dev client for vault operations
      const client = new CaseDevClient(apiKey);

      // Upload to Vaults with OCR enabled
      const vaultName = `bankruptcy-case-${caseId}`;

      // Upload file to vault (handles vault creation automatically)
      const uploadResult = await client.uploadToVault({
        vaultName,
        file,
        enableOCR: true,
        enableSemanticSearch: true,
        metadata: {
          caseId,
          documentType,
          fileName: file.name,
        },
      });

      // Get the file ID from the upload result
      const vaultFileId = uploadResult.objectId;

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
          ocr_text TEXT,
          ocr_completed BOOLEAN DEFAULT FALSE,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Store document record in database
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
          ${caseId},
          ${file.name},
          ${file.type || null},
          ${file.size || null},
          ${documentType},
          'pending',
          ${vaultFileId}
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

      const newDocument = result[0];

      // Start OCR processing in background (non-blocking)
      if (vaultFileId) {
        processDocumentOCR(
          client,
          sql,
          newDocument.id,
          uploadResult.vaultId,
          vaultFileId,
          documentType
        ).catch((error) => {
          console.error("OCR processing error:", error);
        });
      }

      return NextResponse.json({
        success: true,
        documentId: newDocument.id,
        document: newDocument,
        message: "Document uploaded successfully. OCR processing started.",
      });
    } finally {
      // Note: Don't close sql connection here as OCR processing may still be running
      // The connection will be closed when the process completes
    }
  } catch (error: any) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}

/**
 * Background process to handle OCR extraction and validation
 */
async function processDocumentOCR(
  client: CaseDevClient,
  sql: postgres.Sql,
  documentId: string,
  vaultId: string,
  vaultFileId: string,
  documentType: string
) {
  try {
    // Wait for OCR to complete (case.dev processes this automatically)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get OCR text from Vaults
    let ocrText = "";
    try {
      const ocrResult = await client.getVaultObjectText({
        vaultId,
        objectId: vaultFileId,
      });
      ocrText = ocrResult.text || "";
    } catch (ocrError) {
      console.error("Error getting OCR text:", ocrError);
    }

    // Validate document using LLM if we have OCR text
    let validationStatus = "pending";
    let validationNotes = "";

    if (ocrText) {
      try {
        const validation = await client.llmComplete({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a bankruptcy paralegal validating client documents.
Check if this document is a valid ${documentType}.
Verify: 1) Legibility, 2) Completeness, 3) Dates (not expired), 4) Required information is present.
Return JSON: { "valid": boolean, "issues": string[], "confidence": number }`,
            },
            {
              role: "user",
              content: `Document type: ${documentType}\n\nOCR Text (first 2000 chars):\n${ocrText.substring(
                0,
                2000
              )}`,
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const validationResult = JSON.parse(
          validation.choices[0].message.content
        );
        validationStatus = validationResult.valid ? "valid" : "needs_review";
        validationNotes = validationResult.issues?.join("; ") || "";
      } catch (llmError) {
        console.error("Error validating document with LLM:", llmError);
        validationStatus = "pending";
      }
    }

    // Update document with OCR results and validation
    await sql`
      UPDATE case_documents
      SET
        ocr_text = ${ocrText.substring(0, 50000)},
        ocr_completed = true,
        validation_status = ${validationStatus},
        extracted_data = ${JSON.stringify({ validationNotes })}
      WHERE id = ${documentId}
    `;

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);

    // Update document to show OCR error
    try {
      await sql`
        UPDATE case_documents
        SET
          validation_status = 'needs_review',
          extracted_data = ${JSON.stringify({ error: "OCR processing encountered an error" })}
        WHERE id = ${documentId}
      `;
    } catch (updateError) {
      console.error("Error updating document status:", updateError);
    }
  } finally {
    // Close the SQL connection after OCR processing completes
    try {
      await sql.end();
    } catch (e) {
      // Connection may already be closed
    }
  }
}
