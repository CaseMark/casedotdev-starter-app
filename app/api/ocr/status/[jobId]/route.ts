import { NextRequest, NextResponse } from "next/server";
import { caseDevClient } from "@/lib/case-dev/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const result = await caseDevClient.getOCRStatus(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get OCR status" },
      { status: 500 }
    );
  }
}
