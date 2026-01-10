import { NextRequest, NextResponse } from 'next/server';
import { DEMO_LIMITS } from '@/lib/demo-limits/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for processing

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

// Detect language from document using LLM
async function detectLanguageWithLLM(buffer: Buffer, contentType: string, apiKey: string): Promise<{ language: string; languageName: string; confidence: number }> {
  try {
    const base64Data = buffer.toString('base64');

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

Document content (base64 ${contentType}): ${base64Data.slice(0, 10000)}...`
          }
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return { language: 'unknown', languageName: 'Unknown', confidence: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const langCode = parsed.language_code?.toLowerCase() || 'en';
        const langName = parsed.language_name || LANGUAGE_CODES[langCode] || 'Unknown';
        const confidence = parsed.confidence || 0.8;

        return { language: langCode, languageName: langName, confidence };
      }
    } catch {
      // Parse error
    }

    return { language: 'en', languageName: 'English', confidence: 0.5 };
  } catch {
    return { language: 'unknown', languageName: 'Unknown', confidence: 0 };
  }
}

// Clean up OCR text formatting using LLM
async function cleanupOCRText(text: string, sourceLanguage: string, apiKey: string): Promise<string> {
  if (text.length < 50) {
    return text;
  }

  const langName = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;

  try {
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
            role: 'system',
            content: `You are a text formatting specialist. The following text was extracted via OCR and may have formatting issues like:
- Broken lines in the middle of sentences
- Missing spaces between words
- Inconsistent paragraph breaks
- Random line breaks that don't belong

Clean up the formatting while:
1. Keeping the text in its ORIGINAL ${langName} language (DO NOT translate)
2. Fixing broken sentences by joining lines that were incorrectly split
3. Adding proper paragraph breaks where they logically belong
4. Fixing obvious spacing issues
5. Preserving intentional formatting like bullet points, numbered lists, headers

Output ONLY the cleaned up ${langName} text, nothing else.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      console.error(`OCR cleanup API error: ${response.status}`);
      return text;
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      console.error('OCR cleanup response missing content');
      return text;
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OCR cleanup error:', error);
    return text;
  }
}

// Translate text using Case.dev LLM API
async function translateText(text: string, sourceLanguage: string, apiKey: string): Promise<string> {
  const langName = LANGUAGE_CODES[sourceLanguage] || sourceLanguage;

  try {
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
            role: 'system',
            content: `You are a professional legal translator specializing in ${langName} to English translation.
Translate the following document accurately while:
1. Preserving all formatting (paragraphs, line breaks, bullet points, numbering)
2. Maintaining legal terminology precision
3. Keeping proper nouns and names in their original form with English transliteration in parentheses where helpful
4. Preserving any dates, numbers, and reference codes exactly as they appear
5. Translating headers and section titles appropriately

Provide ONLY the translation, no explanations or notes.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Translation API error: ${response.status} - ${errorText}`);
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      console.error('Translation response missing content:', JSON.stringify(data));
      throw new Error('Translation response missing content');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Translation error:', error);
    return `[Translation failed]\n\nOriginal ${langName} text:\n${text}`;
  }
}

// Extract text from PDF using vault ingestion
async function extractTextFromPDF(buffer: Buffer, filename: string, apiKey: string): Promise<{ text: string; pageCount: number }> {
  // Create a temporary vault for processing
  const vaultResponse = await fetch(`${API_BASE_URL}/vault`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `MLP Demo - ${filename}`,
      description: `Temporary vault for processing ${filename}`,
      enableGraph: false,
    }),
  });

  if (!vaultResponse.ok) {
    throw new Error('Failed to create vault');
  }

  const vault = await vaultResponse.json();
  const vaultId = vault.id;

  try {
    // Get presigned upload URL
    const uploadResponse = await fetch(`${API_BASE_URL}/vault/${vaultId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        contentType: 'application/pdf',
        auto_index: true,
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const uploadData = await uploadResponse.json();

    // Upload file to S3
    const s3Response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: new Uint8Array(buffer),
    });

    if (!s3Response.ok) {
      throw new Error('Failed to upload to S3');
    }

    // Trigger ingestion
    await fetch(`${API_BASE_URL}/vault/${vaultId}/ingest/${uploadData.objectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${API_BASE_URL}/vault/${vaultId}/objects/${uploadData.objectId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check status');
      }

      const status = await statusResponse.json();

      if (status.ingestionStatus === 'completed') {
        const textResponse = await fetch(`${API_BASE_URL}/vault/${vaultId}/objects/${uploadData.objectId}/text`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!textResponse.ok) {
          throw new Error('Failed to get text');
        }

        const textData = await textResponse.json();
        return { text: textData.text || '', pageCount: status.pageCount || 1 };
      }

      if (status.ingestionStatus === 'failed') {
        throw new Error('Ingestion failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Ingestion timed out');
  } finally {
    // Clean up vault
    try {
      await fetch(`${API_BASE_URL}/vault/${vaultId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Extract text from image using OCR API
async function extractTextFromImage(buffer: Buffer, mimeType: string, filename: string, apiKey: string): Promise<string> {
  // Create temporary vault for the image
  const vaultResponse = await fetch(`${API_BASE_URL}/vault`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `MLP Demo - ${filename}`,
      description: 'Temporary vault for OCR',
      enableGraph: false,
    }),
  });

  if (!vaultResponse.ok) {
    throw new Error('Failed to create vault');
  }

  const vault = await vaultResponse.json();
  const vaultId = vault.id;

  try {
    // Upload image to vault
    const uploadResponse = await fetch(`${API_BASE_URL}/vault/${vaultId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        contentType: mimeType,
        auto_index: false,
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const uploadData = await uploadResponse.json();

    const s3Response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: new Uint8Array(buffer),
    });

    if (!s3Response.ok) {
      throw new Error('Failed to upload to S3');
    }

    // Get download URL
    const objectResponse = await fetch(`${API_BASE_URL}/vault/${vaultId}/objects/${uploadData.objectId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!objectResponse.ok) {
      throw new Error('Failed to get object metadata');
    }

    const objectData = await objectResponse.json();
    const documentUrl = objectData.downloadUrl;

    // Submit OCR job
    const ocrResponse = await fetch(`${API_BASE_URL}/ocr/v1/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_url: documentUrl,
        engine: 'tesseract',
      }),
    });

    if (!ocrResponse.ok) {
      throw new Error('OCR API error');
    }

    const ocrJob = await ocrResponse.json();

    // Poll for OCR completion
    let attempts = 0;
    const maxAttempts = 90;
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${API_BASE_URL}/ocr/v1/${ocrJob.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check OCR status');
      }

      const status = await statusResponse.json();

      if (status.status === 'completed') {
        const textResponse = await fetch(`${API_BASE_URL}/ocr/v1/${ocrJob.id}/download/text`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!textResponse.ok) {
          throw new Error('Failed to get OCR text');
        }

        return await textResponse.text();
      }

      if (status.status === 'failed') {
        throw new Error('OCR failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('OCR timed out');
  } finally {
    // Clean up vault
    try {
      await fetch(`${API_BASE_URL}/vault/${vaultId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured. Please set CASE_API_KEY in your environment variables.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > DEMO_LIMITS.ocr.maxFileSize) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${DEMO_LIMITS.ocr.maxFileSize / 1024 / 1024}MB`,
        limitReached: true,
      }, { status: 400 });
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Detect language using LLM
    let detectedLang = { language: 'en', languageName: 'English', confidence: 0.5 };

    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      detectedLang = await detectLanguageWithLLM(buffer, file.type, apiKey);
    }

    // Extract text
    let originalText = '';
    let pageCount = 1;

    if (file.type === 'text/plain') {
      originalText = buffer.toString('utf-8');
      detectedLang = { language: 'en', languageName: 'English', confidence: 0.5 };
    } else if (file.type === 'application/pdf') {
      try {
        const result = await extractTextFromPDF(buffer, file.name, apiKey);
        originalText = result.text;
        pageCount = result.pageCount;
      } catch {
        return NextResponse.json({
          error: 'PDF text extraction failed. Please try again.'
        }, { status: 500 });
      }
    } else if (file.type.startsWith('image/')) {
      try {
        originalText = await extractTextFromImage(buffer, file.type, file.name, apiKey);
      } catch {
        return NextResponse.json({
          error: 'Image text extraction failed. Please try again.'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Clean up OCR text formatting (for non-English documents)
    if (detectedLang.language !== 'en' && originalText.length > 50) {
      console.log(`Cleaning up OCR text for ${detectedLang.languageName}...`);
      originalText = await cleanupOCRText(originalText, detectedLang.language, apiKey);
      console.log('OCR cleanup completed');
    }

    // Translate to English if not already English
    let translatedText = originalText;
    if (detectedLang.language !== 'en') {
      console.log(`Translating from ${detectedLang.languageName} to English...`);
      translatedText = await translateText(originalText, detectedLang.language, apiKey);
      console.log('Translation completed');
    }

    // Estimate tokens used (rough estimate: ~4 chars per token)
    const tokensUsed = Math.ceil((originalText.length + translatedText.length) / 4);

    console.log(`Processing complete. Original: ${originalText.length} chars, Translated: ${translatedText.length} chars`);

    return NextResponse.json({
      success: true,
      originalText,
      translatedText,
      detectedLanguage: detectedLang.language,
      detectedLanguageName: detectedLang.languageName,
      confidence: detectedLang.confidence,
      pageCount,
      tokensUsed,
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({
      error: 'Processing failed. Please try again.'
    }, { status: 500 });
  }
}
