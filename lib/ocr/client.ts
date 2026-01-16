/**
 * OCR Client for Case.dev OCR API
 *
 * IMPORTANT: This client constructs its own URLs using the public API base.
 * DO NOT use URLs from API responses directly as they may point to internal services.
 */

export interface OCRSubmitResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'pending';
  statusUrl: string;
  textUrl: string;
}

export interface OCRStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'pending' | 'completed' | 'failed';
  text?: string;
  pageCount?: number;
  error?: string;
}

export class OCRClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.case.dev') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Submit a document for OCR processing
   */
  async submitOCR(documentUrl: string, fileName: string): Promise<OCRSubmitResponse> {
    const response = await fetch(`${this.baseUrl}/ocr/v1/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_url: documentUrl,
        file_name: fileName,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OCR submit failed: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // Handle different response field names
    const jobId = result.id || result.jobId || result.job_id;
    const status = result.status || 'queued';

    if (!jobId) {
      throw new Error('OCR API did not return a job ID');
    }

    // CRITICAL: Construct our own URLs using public API base
    // DO NOT use URLs from API response as they may be internal
    const statusUrl = `${this.baseUrl}/ocr/v1/${jobId}`;
    const textUrl = `${this.baseUrl}/ocr/v1/${jobId}/download/json`;

    return {
      jobId,
      status: status as 'queued' | 'processing' | 'pending',
      statusUrl,
      textUrl,
    };
  }

  /**
   * Check the status of an OCR job
   */
  async getOCRStatus(statusUrl: string, textUrl?: string): Promise<OCRStatusResponse> {
    if (!statusUrl || statusUrl === 'undefined') {
      throw new Error('Invalid status URL provided');
    }

    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OCR status check failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const jobId = result.id || result.jobId || result.job_id;
    const status = result.status || 'processing';

    // Fetch extracted text when completed
    let text: string | undefined;
    if (status === 'completed' && textUrl) {
      text = await this.fetchExtractedText(textUrl);
    }

    return {
      jobId,
      status,
      text: text || result.text || result.extracted_text,
      pageCount: result.pageCount || result.page_count,
      error: result.error,
    };
  }

  /**
   * Fetch extracted text from the download endpoint
   */
  private async fetchExtractedText(textUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(textUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('OCR result fetch failed:', response.status);
        return undefined;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const jsonResult = await response.json();

        // Try common field patterns
        let text = jsonResult.text
          || jsonResult.extracted_text
          || jsonResult.content;

        // Concatenate pages if present
        if (!text && jsonResult.pages && Array.isArray(jsonResult.pages)) {
          text = jsonResult.pages
            .map((page: { text?: string; content?: string }) =>
              page.text || page.content || '')
            .join('\n\n');
        }

        return text;
      }

      // Plain text response
      return await response.text();
    } catch (e) {
      console.error('Failed to fetch OCR result:', e);
      return undefined;
    }
  }
}

/**
 * Create an OCR client instance using environment variables
 */
export function createOCRClient(): OCRClient {
  const apiKey = process.env.CASE_API_KEY;
  if (!apiKey) {
    throw new Error('CASE_API_KEY environment variable is not set');
  }
  return new OCRClient(apiKey);
}
