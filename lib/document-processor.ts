/**
 * Client-side document processor for extracting text from PDFs, RTF files, and text files.
 * Uses pdfjs-dist for PDF text extraction and rtf-parser for RTF files (fast, no API needed).
 */

export interface ExtractionResult {
  text: string;
  pageCount: number;
  method: 'pdf-text' | 'plain-text' | 'rtf-text';
}

// Dynamically load PDF.js
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function loadPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing must be done on client side');
  }

  if (pdfjsLib) return pdfjsLib;

  pdfjsLib = await import('pdfjs-dist');
  // Use CDN worker for reliability
  const version = pdfjsLib.version;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  return pdfjsLib;
}

/**
 * Extract text from a PDF file using pdfjs-dist (client-side)
 */
async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    const textParts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text items and join them
      const pageText = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');

      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    const fullText = textParts.join('\n\n');

    // If we got very little text, the PDF might be scanned/image-based
    if (fullText.trim().length < 50 && pageCount > 0) {
      console.log('[DocProcessor] PDF appears to be scanned or image-based');
      throw new Error('This PDF appears to be a scanned document or image-based. Please upload a PDF with selectable text.');
    }

    console.log(`[DocProcessor] Extracted ${fullText.length} chars from ${pageCount} pages`);

    return {
      text: fullText,
      pageCount,
      method: 'pdf-text',
    };
  } catch (error) {
    console.error('[DocProcessor] PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF with selectable text.');
  }
}

/**
 * Extract text from a plain text file
 */
async function extractTextFromPlainText(file: File): Promise<ExtractionResult> {
  const text = await file.text();
  return {
    text,
    pageCount: 1,
    method: 'plain-text',
  };
}

/**
 * Extract text from an RTF file using rtf-parser
 */
async function extractTextFromRTF(file: File): Promise<ExtractionResult> {
  try {
    // Dynamically import rtf-parser
    const parseRTF = await import('rtf-parser');
    const rtfString = await file.text();

    // Parse RTF using callback-based API wrapped in a promise
    const rtfDoc = await new Promise<any>((resolve, reject) => {
      parseRTF.default.string(rtfString, (err: Error | null, doc: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });

    // Extract plain text from RTF document
    // Structure: RTFDocument -> paragraphs -> spans with 'value' property
    const textParts: string[] = [];

    if (rtfDoc.content && Array.isArray(rtfDoc.content)) {
      for (const paragraph of rtfDoc.content) {
        const paragraphText: string[] = [];

        if (paragraph.content && Array.isArray(paragraph.content)) {
          for (const span of paragraph.content) {
            // RTFSpan objects have a 'value' property with the text
            if (span.value) {
              paragraphText.push(span.value);
            }
          }
        }

        // Join spans in a paragraph and add to text parts
        if (paragraphText.length > 0) {
          textParts.push(paragraphText.join(''));
        }
      }
    }

    // Join paragraphs with newlines
    const text = textParts.join('\n');

    console.log(`[DocProcessor] Extracted ${text.length} chars from RTF (${textParts.length} paragraphs)`);

    return {
      text: text.trim(),
      pageCount: 1,
      method: 'rtf-text',
    };
  } catch (error) {
    console.error('[DocProcessor] RTF extraction error:', error);
    throw new Error('Failed to extract text from RTF file. Please ensure the file is a valid RTF document.');
  }
}

/**
 * Convert a file to base64 for server-side OCR
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main function to process a document.
 * Returns extracted text if possible, or indicates OCR is needed.
 */
export async function processDocument(file: File): Promise<ExtractionResult> {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  console.log(`[DocProcessor] Processing ${file.name} (${mimeType})`);

  if (mimeType === 'text/plain') {
    return extractTextFromPlainText(file);
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(file);
  }

  // Handle RTF files (MIME type can be application/rtf or text/rtf, or empty for .rtf files)
  if (mimeType === 'application/rtf' || mimeType === 'text/rtf' || fileName.endsWith('.rtf')) {
    return extractTextFromRTF(file);
  }

  throw new Error(`Unsupported file type: ${mimeType}. Only PDF, RTF, and text files are supported.`);
}
