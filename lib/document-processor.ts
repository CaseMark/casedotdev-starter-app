/**
 * Client-side document processor for extracting text from PDFs and text files.
 * Uses pdfjs-dist for PDF text extraction (fast, no API needed).
 */

export interface ExtractionResult {
  text: string;
  pageCount: number;
  method: 'pdf-text' | 'plain-text';
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

  console.log(`[DocProcessor] Processing ${file.name} (${mimeType})`);

  if (mimeType === 'text/plain') {
    return extractTextFromPlainText(file);
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(file);
  }

  throw new Error(`Unsupported file type: ${mimeType}. Only PDF and text files are supported.`);
}
