import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API_BASE_URL = process.env.CASE_API_URL || 'https://api.case.dev';

function getApiKey(): string | undefined {
  return process.env.CASE_API_KEY;
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Skip formatting for very short text
    if (text.length < 100) {
      return NextResponse.json({
        success: true,
        formattedText: text,
        skipped: true,
      });
    }

    console.log(`[Format] Formatting ${text.length} chars...`);

    // Use Gemini for fast formatting (following temp_repos pattern)
    const response = await fetch(`${API_BASE_URL}/llm/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a text formatting specialist. The following text was extracted from a PDF and may have formatting issues like:
- Broken lines in the middle of sentences
- Missing spaces between words
- Inconsistent paragraph breaks
- Random line breaks that don't belong

Clean up the formatting while:
1. Keeping the text in its ORIGINAL language (DO NOT translate)
2. Fixing broken sentences by joining lines that were incorrectly split
3. Adding proper paragraph breaks where they logically belong
4. Fixing obvious spacing issues
5. Preserving intentional formatting like bullet points, numbered lists, headers

Output ONLY the cleaned up text, nothing else.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Format] API error: ${response.status}`, errorText);
      // Return original text if formatting fails
      return NextResponse.json({
        success: true,
        formattedText: text,
        skipped: true,
        debug: { error: response.status, details: errorText },
      });
    }

    const data = await response.json();
    console.log(`[Format] API response:`, JSON.stringify(data).substring(0, 500));
    const formattedText = data.choices?.[0]?.message?.content;

    if (!formattedText) {
      console.error(`[Format] No formatted text in response:`, data);
      return NextResponse.json({
        success: true,
        formattedText: text,
        skipped: true,
        debug: { noContent: true, data },
      });
    }

    console.log(`[Format] Complete: ${formattedText.length} chars`);

    return NextResponse.json({
      success: true,
      formattedText,
    });

  } catch (error) {
    console.error('[Format] Error:', error);
    // Return original text on error
    return NextResponse.json({
      success: true,
      formattedText: '',
      skipped: true,
      error: 'Formatting failed',
    });
  }
}
