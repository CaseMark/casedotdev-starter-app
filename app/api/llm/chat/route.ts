import { NextRequest, NextResponse } from "next/server";
import { caseDevClient } from "@/lib/case-dev/client";

export async function POST(request: NextRequest) {
  try {
    const { messages, model, temperature, max_tokens } = await request.json();

    console.log(`[LLM Chat API] Request received - messages: ${messages?.length || 0}, model: ${model || "default"}`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[LLM Chat API] Invalid request - messages array is missing or empty");
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        console.error("[LLM Chat API] Invalid message structure:", msg);
        return NextResponse.json(
          { error: "Each message must have role and content" },
          { status: 400 }
        );
      }
    }

    console.log(`[LLM Chat API] Creating chat completion with ${messages.length} messages`);

    const result = await caseDevClient.createChatCompletion(messages, {
      model,
      temperature,
      max_tokens,
    });

    // Validate result structure
    if (!result || !result.choices || result.choices.length === 0) {
      console.error("[LLM Chat API] Invalid response structure:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "Invalid chat completion response from API" },
        { status: 500 }
      );
    }

    console.log(`[LLM Chat API] Success! Model: ${result.model}, tokens: ${result.usage?.total_tokens || "unknown"}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[LLM Chat API] Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error("[LLM Chat API] Stack:", error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat completion failed" },
      { status: 500 }
    );
  }
}
