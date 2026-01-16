import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { createOCRClient } from '@/lib/ocr/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// OCR pricing: $0.01 per page (based on Case.dev OCR API)
const OCR_COST_PER_PAGE = 0.01;

/**
 * Check the status of an OCR job and fetch results when complete
 * Also handles cleanup of blob storage after successful OCR
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusUrl = searchParams.get('statusUrl');
    const textUrl = searchParams.get('textUrl');
    const blobUrl = searchParams.get('blobUrl');

    if (!statusUrl) {
      return NextResponse.json(
        { error: 'Missing statusUrl parameter' },
        { status: 400 }
      );
    }

    console.log(`[OCR Status] Checking: ${statusUrl}`);

    const ocrClient = createOCRClient();
    const result = await ocrClient.getOCRStatus(statusUrl, textUrl || undefined);

    console.log(`[OCR Status] Job ${result.jobId}: ${result.status}`);

    // If completed and we have a blob URL, delete the blob to clean up
    if (result.status === 'completed' && blobUrl) {
      try {
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        if (blobToken) {
          console.log(`[OCR Status] Cleaning up blob: ${blobUrl}`);
          await del(blobUrl, { token: blobToken });
          console.log('[OCR Status] Blob deleted successfully');
        }
      } catch (deleteError) {
        // Log but don't fail the request if cleanup fails
        console.error('[OCR Status] Failed to delete blob:', deleteError);
      }
    }

    // Calculate OCR cost based on page count
    const pageCount = result.pageCount || 1;
    const ocrCost = result.status === 'completed' ? pageCount * OCR_COST_PER_PAGE : 0;

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      text: result.text,
      pageCount: pageCount,
      ocrCost: ocrCost,
      error: result.error,
    });

  } catch (error) {
    console.error('[OCR Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR status check failed' },
      { status: 500 }
    );
  }
}
