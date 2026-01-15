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
  status: "queued" | "processing" | "pending";
  statusUrl: string;
  textUrl: string;
}

interface OCRStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "pending" | "completed" | "failed";
  text?: string;
  pageCount?: number;
  error?: string;
}

interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  tokensUsed: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
   * @param documentUrl - URL to the document (Vercel Blob URL or data URL)
   * @param fileName - Original file name
   */
  async submitOCR(documentUrl: string, fileName: string): Promise<OCRSubmitResponse> {
    // If no API key, return mock response
    if (!this.apiKey) {
      return this.mockOCRSubmit();
    }

    console.log("[CaseDev] Submitting OCR job for:", fileName);

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

    const result = await response.json();

    // Handle different response formats from the API
    const jobId = result.id || result.jobId || result.job_id;
    const status = result.status || "queued";

    if (!jobId) {
      console.error("[CaseDev] OCR response missing job ID:", result);
      throw new Error("OCR API did not return a job ID");
    }

    // Construct our own URLs using the public API base URL
    // The API returns internal URLs (vision.casemark.net) that aren't publicly accessible
    // Internal pattern: /v1/ocr/{jobId} -> Public pattern: /ocr/v1/{jobId}
    // Download endpoints require /download/ in the path: /ocr/v1/{jobId}/download/{format}
    const statusUrl = `${this.baseUrl}/ocr/v1/${jobId}`;
    const jsonUrl = `${this.baseUrl}/ocr/v1/${jobId}/download/json`;

    console.log("[CaseDev] OCR job created:", jobId);

    return {
      jobId,
      status: status as "queued" | "processing" | "pending",
      statusUrl,
      textUrl: jsonUrl, // Use JSON endpoint which contains extracted text
    };
  }

  /**
   * Check OCR job status using the status URL from submit response
   */
  async getOCRStatus(statusUrl: string, textUrl?: string): Promise<OCRStatusResponse> {
    // If no API key, return mock response
    if (!this.apiKey) {
      return this.mockOCRStatus("mock");
    }

    // Validate statusUrl before making request
    if (!statusUrl || statusUrl === "undefined") {
      throw new Error("Invalid status URL provided to getOCRStatus");
    }

    const response = await fetch(statusUrl, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OCR status check failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const jobId = (result.id || result.jobId || result.job_id) as string;
    const status = (result.status || "processing") as OCRStatusResponse["status"];

    // If completed and we have a text/json URL, fetch the extracted text
    let text: string | undefined;
    if (status === "completed" && textUrl) {
      try {
        const textResponse = await fetch(textUrl, {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        });
        if (textResponse.ok) {
          const contentType = textResponse.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            // JSON response - extract text from the OCR result structure
            const jsonResult = await textResponse.json();

            // The JSON result may have text in various locations
            // Try common patterns: text, extracted_text, content, or pages[].text
            text = jsonResult.text
              || jsonResult.extracted_text
              || jsonResult.content;

            // If text is in pages array, concatenate all page texts
            if (!text && jsonResult.pages && Array.isArray(jsonResult.pages)) {
              text = jsonResult.pages
                .map((page: { text?: string; content?: string }) => page.text || page.content || "")
                .join("\n\n");
            }
          } else {
            // Plain text response - use directly
            text = await textResponse.text();
          }
        } else {
          console.error("[CaseDev] OCR result fetch failed:", textResponse.status);
        }
      } catch (e) {
        console.error("[CaseDev] Failed to fetch OCR result:", e);
      }
    }

    // Normalize response format (handle snake_case vs camelCase)
    return {
      jobId,
      status,
      text: text || (result.text || result.extracted_text) as string | undefined,
      pageCount: (result.pageCount || result.page_count) as number | undefined,
      error: result.error as string | undefined,
    };
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(texts: string[], model: string = "voyage-law-2"): Promise<EmbeddingResponse> {
    // If no API key, use local deterministic embeddings
    if (!this.apiKey) {
      return this.localEmbeddings(texts, model);
    }

    // Case.dev API expects "input" parameter per OpenAI embeddings spec
    const response = await this.request<Record<string, unknown>>("/llm/v1/embeddings", {
      method: "POST",
      body: JSON.stringify({ input: texts, model }),
    });

    // Handle OpenAI-style response format (data array with embedding objects)
    const data = response.data as Array<{ embedding: number[]; index: number }> | undefined;
    if (data && Array.isArray(data)) {
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
      return {
        embeddings: embeddings,
        model: (response.model as string) || model,
        tokensUsed: (response.tokensUsed as number) || (response.usage as { total_tokens: number })?.total_tokens || 0,
      };
    }

    throw new Error("Unexpected embedding API response format");
  }

  /**
   * Create a chat completion using the LLM API
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<ChatCompletionResponse> {
    const {
      model = "anthropic/claude-3-5-sonnet-20241022",
      temperature = 0.7,
      max_tokens = 2000,
    } = options;

    // If no API key, return mock response
    if (!this.apiKey) {
      return this.mockChatCompletion(messages);
    }

    console.log("[CaseDev] Creating chat completion with model:", model);

    const response = await this.request<ChatCompletionResponse>("/llm/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    return response;
  }

  // ============================================================================
  // Mock/Local implementations for development without API key
  // ============================================================================

  private mockOCRSubmit(): OCRSubmitResponse {
    const mockId = `mock-${Date.now()}`;
    return {
      jobId: mockId,
      status: "queued",
      statusUrl: `mock://status/${mockId}`,
      textUrl: `mock://text/${mockId}`,
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

  private mockChatCompletion(messages: ChatMessage[]): ChatCompletionResponse {
    // Generate mock themes and questions for development without API key
    const mockContent = JSON.stringify({
      themes: [
        {
          title: "Contract Dispute",
          description: "Central disagreement over contract terms and obligations between parties.",
          relevanceScore: 0.92,
          keyTerms: ["breach", "damages", "obligations", "performance"]
        },
        {
          title: "Timeline of Events",
          description: "Key dates and sequence of events leading to the dispute.",
          relevanceScore: 0.85,
          keyTerms: ["filing date", "notice", "deadline", "execution"]
        },
        {
          title: "Parties and Relationships",
          description: "Key individuals and organizations involved in the matter.",
          relevanceScore: 0.78,
          keyTerms: ["plaintiff", "defendant", "counsel", "witness"]
        }
      ],
      suggestedQuestions: [
        {
          question: "What were the specific contract terms that were allegedly breached?",
          themeTitle: "Contract Dispute",
          rationale: "Understanding the exact terms in dispute is fundamental to the case.",
          priority: 5
        },
        {
          question: "What communications occurred between the parties before the dispute?",
          themeTitle: "Timeline of Events",
          rationale: "Pre-dispute communications often reveal intent and expectations.",
          priority: 4
        },
        {
          question: "Who are the key decision-makers mentioned in the documents?",
          themeTitle: "Parties and Relationships",
          rationale: "Identifying decision-makers helps focus discovery efforts.",
          priority: 4
        },
        {
          question: "What damages are being claimed and how are they calculated?",
          themeTitle: "Contract Dispute",
          rationale: "Understanding damage claims is essential for case valuation.",
          priority: 5
        }
      ]
    });

    return {
      id: `mock-chat-${Date.now()}`,
      choices: [{
        message: {
          role: "assistant",
          content: mockContent
        },
        finish_reason: "stop"
      }],
      model: "mock-model",
      usage: {
        prompt_tokens: messages.reduce((sum, m) => sum + m.content.length / 4, 0),
        completion_tokens: mockContent.length / 4,
        total_tokens: messages.reduce((sum, m) => sum + m.content.length / 4, 0) + mockContent.length / 4
      }
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
