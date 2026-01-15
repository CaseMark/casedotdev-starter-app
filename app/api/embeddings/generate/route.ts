import { NextRequest, NextResponse } from "next/server";
import { caseDevClient } from "@/lib/case-dev/client";

export async function POST(request: NextRequest) {
  try {
    const { texts, model } = await request.json();

    console.log(`[Embeddings API] Request received - texts: ${texts?.length || 0}, model: ${model || "default"}`);

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.error("[Embeddings API] Invalid request - texts array is missing or empty");
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 }
      );
    }

    // Log first text sample for debugging (truncated)
    const firstTextSample = texts[0]?.substring(0, 100) || "(empty)";
    console.log(`[Embeddings API] First text sample: "${firstTextSample}..."`);
    console.log(`[Embeddings API] Generating embeddings for ${texts.length} texts`);

    const result = await caseDevClient.generateEmbeddings(texts, model);

    // Validate result structure
    if (!result || !result.embeddings) {
      console.error("[Embeddings API] Invalid response structure:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "Invalid embedding response from API" },
        { status: 500 }
      );
    }

    console.log(`[Embeddings API] Success! Generated ${result.embeddings.length} embeddings using model: ${result.model}`);

    // Ensure embeddings count matches input count
    if (result.embeddings.length !== texts.length) {
      console.error(
        `[Embeddings API] Count mismatch: ${texts.length} texts, ${result.embeddings.length} embeddings`
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Embeddings API] Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error("[Embeddings API] Stack:", error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Embedding generation failed" },
      { status: 500 }
    );
  }
}
