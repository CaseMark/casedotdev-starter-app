import { NextRequest, NextResponse } from "next/server";
import { caseDevClient } from "@/lib/case-dev/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const fileData = await file.arrayBuffer();
    const result = await caseDevClient.submitOCR(
      fileData,
      fileName || file.name,
      file.type
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR submit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR submission failed" },
      { status: 500 }
    );
  }
}
