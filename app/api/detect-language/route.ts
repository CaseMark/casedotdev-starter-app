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

    // Use Case.dev Translation API for language detection
    const response = await fetch(`${API_BASE_URL}/translate/v1/detect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text.slice(0, 5000), // Use first 5000 chars for detection
      }),
    });

    if (!response.ok) {
      console.error(`Language detection API error: ${response.status}`);
      return NextResponse.json({
        language: 'en',
        languageName: 'English',
        confidence: 0.5,
      });
    }

    const data = await response.json();
    const detection = data.data?.detections?.[0]?.[0];

    if (detection) {
      const langCode = detection.language || 'en';
      const langName = LANGUAGE_CODES[langCode] || langCode.toUpperCase();
      const confidence = detection.confidence || 0.8;

      return NextResponse.json({
        language: langCode,
        languageName: langName,
        confidence,
      });
    }

    return NextResponse.json({
      language: 'en',
      languageName: 'English',
      confidence: 0.5,
    });

  } catch (error) {
    console.error('Language detection error:', error);
    return NextResponse.json(
      { error: 'Language detection failed' },
      { status: 500 }
    );
  }
}
