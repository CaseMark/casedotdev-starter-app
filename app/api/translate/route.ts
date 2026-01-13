import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max for translation

const API_BASE_URL = process.env.CASE_API_URL || 'https://api.case.dev';

function getApiKey(): string | undefined {
  return process.env.CASE_API_KEY;
}

const LANGUAGE_CODES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
  pl: 'Polish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', sk: 'Slovak', sl: 'Slovenian', hr: 'Croatian',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', is: 'Icelandic',
  tr: 'Turkish', id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', tl: 'Tagalog',
  en: 'English',
};

// Markers to preserve formatting through Google Translate
// Using XML-style tags that translation APIs typically preserve
const PRESERVE_MARKERS = {
  DOUBLE_NEWLINE: '<x id="p"/>',  // \n\n -> preserve paragraph breaks
  SINGLE_NEWLINE: '<x id="n"/>',  // \n -> preserve line breaks
};

// Replace newlines with markers before translation
function preserveFormatting(text: string): string {
  return text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n\n+/g, PRESERVE_MARKERS.DOUBLE_NEWLINE)  // Paragraph breaks
    .replace(/\n/g, PRESERVE_MARKERS.SINGLE_NEWLINE);     // Single line breaks
}

// Decode HTML entities that Google Translate may produce
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

// Restore newlines from markers after translation
function restoreFormatting(text: string): string {
  // First decode HTML entities
  let result = decodeHtmlEntities(text);

  // Handle variations Google Translate might produce (with/without spaces, encoded, etc.)
  result = result
    .replace(/<x\s+id\s*=\s*"p"\s*\/?>/gi, '\n\n')
    .replace(/<x\s+id\s*=\s*"n"\s*\/?>/gi, '\n');

  return result;
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
    const { text, sourceLanguage } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (!sourceLanguage || typeof sourceLanguage !== 'string') {
      return NextResponse.json({ error: 'No source language provided' }, { status: 400 });
    }

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

    // Preserve formatting by replacing newlines with Unicode PUA markers
    const preservedText = preserveFormatting(text);
    console.log(`[Translate] Preserved formatting: ${text.length} -> ${preservedText.length} chars`);

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

      const response = await fetch(`${API_BASE_URL}/translate/v1/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: chunk,
          source: sourceLanguage,
          target: 'en',
          format: 'html',  // Tell API to preserve HTML tags
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Translate] API error: ${response.status} - ${errorText}`);
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedChunk = data.data?.translations?.[0]?.translatedText;

      if (!translatedChunk) {
        console.error('[Translate] Response missing content:', JSON.stringify(data));
        throw new Error('Translation response missing content');
      }

      translatedChunks.push(translatedChunk);
    }

    // Join chunks and restore formatting
    const joinedTranslation = translatedChunks.join('');
    const fullTranslation = restoreFormatting(joinedTranslation);
    console.log(`[Translate] Complete: ${fullTranslation.length} chars (formatting restored)`);

    return NextResponse.json({
      success: true,
      translatedText: fullTranslation,
      sourceLanguage,
      targetLanguage: 'en',
      charsProcessed: text.length,
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
