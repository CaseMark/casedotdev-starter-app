import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max for translation

const API_BASE_URL = process.env.CASE_API_URL || 'https://api.case.dev';

function getApiKey(): string | undefined {
  return process.env.CASE_API_KEY;
}

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

// Note: Newlines are preserved naturally by the translation API
// No special formatting markers needed

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
    let { text, sourceLanguage } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (!sourceLanguage || typeof sourceLanguage !== 'string') {
      return NextResponse.json({ error: 'No source language provided' }, { status: 400 });
    }

    // Normalize language codes: zh-CN and zh-TW should just be 'zh' for Google Translate
    // Google Translate API uses simple language codes
    const originalSourceLanguage = sourceLanguage;
    if (sourceLanguage === 'zh-CN' || sourceLanguage === 'zh-TW') {
      sourceLanguage = 'zh';
      console.log(`[Translate] Normalized ${originalSourceLanguage} -> ${sourceLanguage}`);
    }

    console.log(`[Translate] Request: ${sourceLanguage} -> en, ${text.length} chars`);

    // If already English, return as-is
    if (sourceLanguage === 'en') {
      return NextResponse.json({
        success: true,
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en',
      });
    }

    console.log(`[Translate] Translating from ${sourceLanguage} to English...`);

    // For now, just send text as-is without formatting markers
    // Newlines will be preserved naturally by the translation API
    const preservedText = text;
    console.log(`[Translate] Text length: ${text.length} chars`);

    // Split into chunks if needed (Translation API has size limits)
    const maxChunkSize = 4000;
    const chunks: string[] = [];

    if (preservedText.length <= maxChunkSize) {
      chunks.push(preservedText);
    } else {
      // Split on sentence boundaries where possible
      let remaining = preservedText;
      while (remaining.length > 0) {
        if (remaining.length <= maxChunkSize) {
          chunks.push(remaining);
          break;
        }
        // Find a good split point (sentence end) within the chunk size
        let splitIndex = maxChunkSize;
        const searchArea = remaining.substring(0, maxChunkSize);
        const lastSentenceEnd = Math.max(
          searchArea.lastIndexOf('. '),
          searchArea.lastIndexOf('? '),
          searchArea.lastIndexOf('! ')
        );
        if (lastSentenceEnd > maxChunkSize / 2) {
          splitIndex = lastSentenceEnd + 2;
        }
        chunks.push(remaining.substring(0, splitIndex));
        remaining = remaining.substring(splitIndex);
      }
    }

    console.log(`[Translate] Processing ${chunks.length} chunk(s)...`);

    const translatedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[Translate] Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

      const requestBody = {
        q: chunk,
        source: sourceLanguage,
        target: 'en',
        format: 'text',  // Using 'text' without formatting markers to avoid 411 error
      };

      const response = await fetch(`${API_BASE_URL}/translate/v1/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Translate] API error for ${sourceLanguage}:`);
        console.error(`  Status: ${response.status}`);
        console.error(`  Response: ${errorText}`);
        console.error(`  Request body:`, JSON.stringify({
          q: chunk.substring(0, 100) + '...',
          source: sourceLanguage,
          target: 'en',
          format: 'html'
        }, null, 2));
        const langName = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;
        throw new Error(`Translation API error for ${langName}: ${response.status}. The language code "${sourceLanguage}" may not be supported by the translation service.`);
      }

      const data = await response.json();
      const translatedChunk = data.data?.translations?.[0]?.translatedText;

      if (!translatedChunk) {
        console.error('[Translate] Response missing content:', JSON.stringify(data));
        throw new Error('Translation response missing content');
      }

      translatedChunks.push(translatedChunk);
    }

    // Join chunks - newlines are preserved naturally
    const fullTranslation = translatedChunks.join('');
    console.log(`[Translate] Complete: ${fullTranslation.length} chars`);

    // Calculate approximate cost based on character count
    // Case.dev API pricing: Translation is typically $0.10-0.50 per 1000 characters
    // Using a conservative estimate of $0.30 per 1000 characters
    const costPerThousandChars = 0.30;
    const totalCost = (text.length / 1000) * costPerThousandChars;

    return NextResponse.json({
      success: true,
      translatedText: fullTranslation,
      sourceLanguage,
      targetLanguage: 'en',
      charsProcessed: text.length,
      cost: totalCost, // Cost in dollars
    });

  } catch (error) {
    console.error('[Translate] Error:', error);
    const body = await request.json().catch(() => ({}));
    const langName = LANGUAGE_CODES[body.sourceLanguage] || body.sourceLanguage || 'Unknown';
    return NextResponse.json({
      error: `Translation from ${langName} failed. Please try again.`
    }, { status: 500 });
  }
}
