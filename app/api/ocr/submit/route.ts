import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createOCRClient } from '@/lib/ocr/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Submit an image for OCR processing
 * Accepts multipart form data with file and documentId
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentId = formData.get('documentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - only accept images
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/tiff'];
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image file (PNG, JPEG, GIF, WebP, or TIFF).' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`[OCR Submit] Processing ${file.name} (${file.type}, ${file.size} bytes)`);

    // Vercel Blob is required for OCR image uploads
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is not configured. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    // Upload to Vercel Blob for OCR processing
    console.log('[OCR Submit] Uploading to Vercel Blob...');
    const blob = await put(`ocr/${Date.now()}-${file.name}`, file, {
      access: 'public',
      token: blobToken,
    });
    const documentUrl = blob.url;
    const blobUrl = blob.url;
    console.log(`[OCR Submit] Uploaded to: ${blob.url}`);

    // Submit to OCR API
    const ocrClient = createOCRClient();
    const result = await ocrClient.submitOCR(documentUrl, file.name);

    console.log(`[OCR Submit] Job submitted: ${result.jobId}, status: ${result.status}`);

    return NextResponse.json({
      success: true,
      documentId: documentId || result.jobId,
      jobId: result.jobId,
      status: result.status,
      statusUrl: result.statusUrl,
      textUrl: result.textUrl,
      blobUrl: blobUrl, // Store for cleanup later
    });

  } catch (error) {
    console.error('[OCR Submit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR submission failed' },
      { status: 500 }
    );
  }
}
