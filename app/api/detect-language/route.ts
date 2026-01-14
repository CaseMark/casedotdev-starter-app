import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.CASE_API_URL || 'https://api.case.dev';

function getApiKey(): string | undefined {
  return process.env.CASE_API_KEY;
}

// All languages supported by Google Cloud Platform Translation API
const LANGUAGE_CODES: Record<string, string> = {
  // Western European
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
  // Central European
  pl: 'Polish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', sk: 'Slovak', sl: 'Slovenian', hr: 'Croatian',
  // Nordic
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', is: 'Icelandic',
  // Other Latin-script
  tr: 'Turkish', id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', tl: 'Tagalog',
  // East Asian
  zh: 'Chinese', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese', ko: 'Korean',
  // South Asian
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', ur: 'Urdu',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', si: 'Sinhala', ne: 'Nepali',
  // Middle Eastern
  ar: 'Arabic', he: 'Hebrew', fa: 'Persian',
  // Cyrillic
  ru: 'Russian', uk: 'Ukrainian', bg: 'Bulgarian', sr: 'Serbian', be: 'Belarusian',
  // Greek
  el: 'Greek',
  // Thai and Southeast Asian
  th: 'Thai', km: 'Khmer', lo: 'Lao', my: 'Burmese',
  // Additional languages
  af: 'Afrikaans', sq: 'Albanian', am: 'Amharic', hy: 'Armenian', az: 'Azerbaijani',
  eu: 'Basque', bs: 'Bosnian', ca: 'Catalan', et: 'Estonian', ka: 'Georgian',
  kk: 'Kazakh', lv: 'Latvian', lt: 'Lithuanian', mk: 'Macedonian', mn: 'Mongolian',
  sw: 'Swahili',
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
    const requestBody = {
      q: text.slice(0, 5000), // Use first 5000 chars for detection
    };

    const response = await fetch(`${API_BASE_URL}/translate/v1/detect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      const confidence = detection.confidence || 0.8;

      // Get language name, fallback to the code itself if not in our list
      const langName = LANGUAGE_CODES[langCode] || langCode.toUpperCase();

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
