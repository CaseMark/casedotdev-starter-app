/**
 * LLM Chat Completion API Route
 * 
 * Proxies chat completion requests to Case.dev LLM API
 * with server-side API key authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

const CASE_API_BASE_URL = 'https://api.case.dev';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequestBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key is configured
    const apiKey = process.env.CASEDEV_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Case.dev API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: ChatCompletionRequestBody = await request.json();

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Call Case.dev LLM API
    const response = await fetch(`${CASE_API_BASE_URL}/llm/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || 'anthropic/claude-3-5-sonnet-20241022',
        messages: body.messages,
        temperature: body.temperature ?? 0.3,
        max_tokens: body.max_tokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific error codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { error: errorData.error?.message || 'Invalid request parameters' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'API request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the response
    return NextResponse.json({
      choices: data.choices,
      usage: data.usage,
    });
  } catch (error) {
    console.error('LLM Chat API Error:', error);

    // Generic error response
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
