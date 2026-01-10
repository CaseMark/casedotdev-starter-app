import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.CASE_API_URL || 'https://api.case.dev';

function getApiKey(): string | undefined {
  return process.env.CASE_API_KEY;
}

// Supported Latin alphabet language codes
const LANGUAGE_CODES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
  pl: 'Polish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', sk: 'Slovak', sl: 'Slovenian', hr: 'Croatian',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', is: 'Icelandic',
  tr: 'Turkish', id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', tl: 'Tagalog',
  en: 'English',
};

const SUPPORTED_LANG_CODES = Object.entries(LANGUAGE_CODES)
  .map(([code, name]) => `${code} (${name})`)
  .join(', ');

export async function POST(request: NextRequest) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // For text files, default to English
    if (file.type === 'text/plain') {
      return NextResponse.json({
        language: 'en',
        languageName: 'English',
        confidence: 0.5,
      });
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Detect language using LLM
    const response = await fetch(`${API_BASE_URL}/llm/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user',
            content: `Look at this document and identify the PRIMARY language used in it.

Respond with ONLY a JSON object in this exact format (no other text):
{"language_code": "XX", "language_name": "Language Name", "confidence": 0.95}

Where language_code is one of: ${SUPPORTED_LANG_CODES}

Document content (base64 ${file.type}): ${base64Data.slice(0, 10000)}...`
          }
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        language: 'en',
        languageName: 'English',
        confidence: 0.5,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const langCode = parsed.language_code?.toLowerCase() || 'en';
        const langName = parsed.language_name || LANGUAGE_CODES[langCode] || 'Unknown';
        const confidence = parsed.confidence || 0.8;

        return NextResponse.json({
          language: langCode,
          languageName: langName,
          confidence,
        });
      }
    } catch {
      // Parse error - return default
    }

    return NextResponse.json({
      language: 'en',
      languageName: 'English',
      confidence: 0.5,
    });

  } catch {
    return NextResponse.json(
      { error: 'Language detection failed' },
      { status: 500 }
    );
  }
}
