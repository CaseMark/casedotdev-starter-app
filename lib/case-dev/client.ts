/**
 * Case.dev API Client
 *
 * Server-side client for OCR and embedding generation via Case.dev API
 * This client should only be used in API routes, not in client components
 */

const CASEDEV_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASEDEV_API_KEY = process.env.CASE_API_KEY;

interface OCRSubmitResponse {
  jobId: string;
  status: "queued" | "processing";
}

interface OCRStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  text?: string;
  pageCount?: number;
  error?: string;
}

interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  tokensUsed: number;
}

class CaseDevClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!CASEDEV_API_KEY) {
      console.warn("[CaseDev] No API key configured - OCR and embeddings will use local fallback");
    }
    this.apiKey = CASEDEV_API_KEY || "";
    this.baseUrl = CASEDEV_API_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Case.dev API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Submit a document for OCR processing
   */
  async submitOCR(fileData: ArrayBuffer, fileName: string, fileType: string): Promise<OCRSubmitResponse> {
    // If no API key, return mock response
    if (!this.apiKey) {
      return this.mockOCRSubmit();
    }

    // Convert ArrayBuffer to base64 for API submission
    const base64Data = this.arrayBufferToBase64(fileData);
    
    // Create a data URL that the API can use as document_url
    const documentUrl = `data:${fileType};base64,${base64Data}`;

    const response = await fetch(`${this.baseUrl}/ocr/v1/process`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
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

    return response.json();
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Check OCR job status
   */
  async getOCRStatus(jobId: string): Promise<OCRStatusResponse> {
    // If no API key, return mock response
    if (!this.apiKey) {
      return this.mockOCRStatus(jobId);
    }

    return this.request<OCRStatusResponse>(`/ocr/v1/status/${jobId}`);
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(texts: string[], model: string = "voyage-law-2"): Promise<EmbeddingResponse> {
    console.log(`[CaseDev] generateEmbeddings called with ${texts.length} texts`);
    console.log(`[CaseDev] API key configured: ${this.apiKey ? "yes (length: " + this.apiKey.length + ")" : "no"}`);
    console.log(`[CaseDev] Base URL: ${this.baseUrl}`);

    // If no API key, use local deterministic embeddings
    if (!this.apiKey) {
      console.log("[CaseDev] No API key - using local embeddings fallback");
      return this.localEmbeddings(texts, model);
    }

    console.log(`[CaseDev] Calling external API: ${this.baseUrl}/llm/v1/embeddings`);
    console.log(`[CaseDev] Request payload: { input: [${texts.length} texts], model: "${model}" }`);

    // Case.dev API expects "input" parameter per OpenAI embeddings spec
    const response = await this.request<Record<string, unknown>>("/llm/v1/embeddings", {
      method: "POST",
      body: JSON.stringify({ input: texts, model }),
    });

    // Log the actual response structure for debugging
    console.log("[CaseDev] Raw API response keys:", Object.keys(response));
    console.log("[CaseDev] Raw API response structure:", JSON.stringify(response, (key, value) => {
      // Truncate embedding arrays for readability
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "number") {
        return `[number array, length: ${value.length}]`;
      }
      if (Array.isArray(value) && value.length > 3) {
        return `[array, length: ${value.length}, first item keys: ${value[0] ? Object.keys(value[0]) : "N/A"}]`;
      }
      return value;
    }, 2));

    // Handle OpenAI-style response format (data array with embedding objects)
    const data = response.data as Array<{ embedding: number[]; index: number }> | undefined;
    if (data && Array.isArray(data)) {
      console.log("[CaseDev] Detected OpenAI-style format with data array");
      // Sort by index to ensure correct ordering
      const sorted = [...data].sort((a, b) => a.index - b.index);
      return {
        embeddings: sorted.map(item => item.embedding),
        model: (response.model as string) || model,
        tokensUsed: (response.usage as { total_tokens: number })?.total_tokens || 0,
      };
    }

    // Handle direct embeddings array format (legacy)
    const embeddings = response.embeddings as number[][] | undefined;
    if (embeddings && Array.isArray(embeddings)) {
      console.log("[CaseDev] Detected direct embeddings array format");
      return {
        embeddings: embeddings,
        model: (response.model as string) || model,
        tokensUsed: (response.tokensUsed as number) || (response.usage as { total_tokens: number })?.total_tokens || 0,
      };
    }

    console.error("[CaseDev] Unrecognized response format. Response:", JSON.stringify(response, null, 2));
    throw new Error("Unexpected embedding API response format");
  }

  // ============================================================================
  // Mock/Local implementations for development without API key
  // ============================================================================

  private mockOCRSubmit(): OCRSubmitResponse {
    return {
      jobId: `mock-${Date.now()}`,
      status: "queued",
    };
  }

  private mockOCRStatus(jobId: string): OCRStatusResponse {
    // Simulate processing delay with mock text
    return {
      jobId,
      status: "completed",
      text: `This is mock OCR text for document ${jobId}.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Section 1: Introduction
The parties agree to the following terms and conditions as set forth in this agreement. This document constitutes the entire agreement between the parties.

Section 2: Terms
All terms shall be interpreted according to applicable law. Any disputes arising from this agreement shall be resolved through arbitration.

Section 3: Conclusion
This agreement is effective as of the date signed below by both parties.`,
      pageCount: 1,
    };
  }

  /**
   * Local deterministic embeddings using bag-of-words with TF-IDF-like weighting
   * This provides semantic similarity based on word overlap - not as good as real
   * embeddings but functional for demos without an API key.
   */
  private localEmbeddings(texts: string[], model: string): EmbeddingResponse {
    const EMBEDDING_DIM = 1536;

    // Common English stop words to ignore
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
      'will', 'with', 'this', 'but', 'they', 'have', 'had', 'what', 'when', 'where',
      'who', 'which', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now', 'been', 'being',
      'do', 'does', 'did', 'doing', 'would', 'could', 'might', 'must', 'shall',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'any', 'about'
    ]);

    const embeddings = texts.map((text) => {
      // Tokenize and normalize
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      // Create word frequency map
      const wordFreq = new Map<string, number>();
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }

      // Generate deterministic embedding based on word hashes
      const embedding = new Array(EMBEDDING_DIM).fill(0);

      for (const [word, freq] of wordFreq) {
        // Hash word to multiple indices for better distribution
        const hash1 = this.hashString(word);
        const hash2 = this.hashString(word + '_2');
        const hash3 = this.hashString(word + '_3');

        // Weight by frequency with diminishing returns (log scale)
        const weight = Math.log(1 + freq) / Math.log(2);

        // Add to multiple positions for richer representation
        const idx1 = Math.abs(hash1) % EMBEDDING_DIM;
        const idx2 = Math.abs(hash2) % EMBEDDING_DIM;
        const idx3 = Math.abs(hash3) % EMBEDDING_DIM;

        embedding[idx1] += weight * (hash1 > 0 ? 1 : -1);
        embedding[idx2] += weight * 0.5 * (hash2 > 0 ? 1 : -1);
        embedding[idx3] += weight * 0.25 * (hash3 > 0 ? 1 : -1);

        // Also add n-gram features for phrases
        const wordLen = word.length;
        for (let i = 0; i < wordLen - 2; i++) {
          const trigram = word.slice(i, i + 3);
          const trigramHash = this.hashString(trigram);
          const trigramIdx = Math.abs(trigramHash) % EMBEDDING_DIM;
          embedding[trigramIdx] += 0.1 * (trigramHash > 0 ? 1 : -1);
        }
      }

      // Normalize to unit vector
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          embedding[i] /= magnitude;
        }
      }

      return embedding;
    });

    return {
      embeddings,
      model: `local-bow-${model}`,
      tokensUsed: texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
    };
  }

  /**
   * Deterministic string hash function (djb2 algorithm)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return hash;
  }
}

export const caseDevClient = new CaseDevClient();
