"use client";

/**
 * Theme Extractor
 *
 * Analyzes document content and entities to extract key themes
 * and generate suggested questions for legal discovery.
 */

import type { DocumentChunk, CaseTheme, SuggestedQuestion } from "@/types/discovery";
import type { Entity, EntityType } from "@/lib/storage/graph-store";

// Configuration
const SAMPLE_CHUNKS_FOR_ANALYSIS = 50;
const MAX_CONTENT_LENGTH = 15000;

// ============================================================================
// Types
// ============================================================================

export interface ThemeExtractionInput {
  caseId: string;
  caseName: string;
  caseDescription?: string;
  chunks: DocumentChunk[];
  entities: Entity[];
  documentCount: number;
}

export interface ThemeExtractionResult {
  themes: Omit<CaseTheme, "id">[];
  suggestedQuestions: Omit<SuggestedQuestion, "id">[];
}

interface LLMTheme {
  title: string;
  description: string;
  relevanceScore: number;
  keyTerms: string[];
}

interface LLMQuestion {
  question: string;
  themeTitle: string;
  rationale: string;
  priority: number;
}

// ============================================================================
// Main Extraction Function
// ============================================================================

export async function extractThemes(
  input: ThemeExtractionInput
): Promise<ThemeExtractionResult> {
  console.log("[ThemeExtractor] Starting extraction for case:", input.caseId);
  console.log("[ThemeExtractor] Input stats:", {
    chunks: input.chunks.length,
    entities: input.entities.length,
    documents: input.documentCount,
  });

  // 1. Sample representative chunks with document diversity
  const sampledChunks = sampleChunks(input.chunks, SAMPLE_CHUNKS_FOR_ANALYSIS);
  console.log("[ThemeExtractor] Sampled", sampledChunks.length, "chunks");

  // 2. Build context from chunks and entities
  const contextContent = buildAnalysisContext(
    sampledChunks,
    input.entities,
    input.caseName,
    input.caseDescription
  );
  console.log("[ThemeExtractor] Context length:", contextContent.length);

  // 3. Build LLM prompt
  const messages = buildThemeExtractionPrompt(contextContent, input.documentCount);

  // 4. Call LLM API
  const response = await fetch("/api/llm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[ThemeExtractor] API error:", error);
    throw new Error(`Theme extraction API call failed: ${response.status}`);
  }

  const result = await response.json();
  console.log("[ThemeExtractor] LLM response received");

  // 5. Parse LLM response
  const parsed = parseThemeResponse(
    result.choices[0]?.message?.content || "",
    input.caseId
  );

  console.log("[ThemeExtractor] Extracted", parsed.themes.length, "themes and", parsed.suggestedQuestions.length, "questions");

  return parsed;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sample chunks ensuring document diversity
 */
function sampleChunks(chunks: DocumentChunk[], limit: number): DocumentChunk[] {
  if (chunks.length <= limit) {
    return chunks;
  }

  // Group chunks by document
  const byDocument = new Map<string, DocumentChunk[]>();
  for (const chunk of chunks) {
    const existing = byDocument.get(chunk.documentId) || [];
    existing.push(chunk);
    byDocument.set(chunk.documentId, existing);
  }

  const sampled: DocumentChunk[] = [];
  const docsArray = Array.from(byDocument.entries());
  const chunksPerDoc = Math.max(1, Math.floor(limit / docsArray.length));

  for (const [, docChunks] of docsArray) {
    // Take first chunk (usually contains important context)
    if (docChunks.length > 0) {
      sampled.push(docChunks[0]);
    }

    // Add some middle chunks for variety
    if (docChunks.length > 1 && chunksPerDoc > 1) {
      const middleChunks = docChunks.slice(1);
      const step = Math.max(1, Math.floor(middleChunks.length / (chunksPerDoc - 1)));
      for (let i = 0; i < middleChunks.length && sampled.length < limit; i += step) {
        sampled.push(middleChunks[i]);
      }
    }

    if (sampled.length >= limit) break;
  }

  return sampled.slice(0, limit);
}

/**
 * Build analysis context from chunks and entities
 */
function buildAnalysisContext(
  chunks: DocumentChunk[],
  entities: Entity[],
  caseName: string,
  caseDescription?: string
): string {
  let context = `Case: ${caseName}\n`;
  if (caseDescription) {
    context += `Description: ${caseDescription}\n`;
  }

  // Add entity summary organized by type
  const entitySummary = summarizeEntities(entities);
  if (entitySummary) {
    context += `\nKey Entities Found:\n${entitySummary}\n`;
  }

  // Add document excerpts
  context += "\nDocument Excerpts:\n";
  for (const chunk of chunks) {
    // Truncate long chunks
    const excerpt = chunk.content.slice(0, 500);
    context += `---\n${excerpt}${chunk.content.length > 500 ? "..." : ""}\n`;
  }

  // Truncate if too long
  if (context.length > MAX_CONTENT_LENGTH) {
    context = context.slice(0, MAX_CONTENT_LENGTH) + "\n[truncated]";
  }

  return context;
}

/**
 * Summarize entities by type
 */
function summarizeEntities(entities: Entity[]): string {
  const byType = new Map<EntityType, string[]>();

  // Sort by frequency (based on how many documents mention them)
  const sorted = [...entities].sort(
    (a, b) => b.documentIds.length - a.documentIds.length
  );

  for (const entity of sorted) {
    const existing = byType.get(entity.type) || [];
    if (existing.length < 5) {
      existing.push(entity.name);
    }
    byType.set(entity.type, existing);
  }

  if (byType.size === 0) {
    return "";
  }

  // Order types for consistent output
  const typeOrder: EntityType[] = [
    "person",
    "organization",
    "case",
    "concept",
    "date",
    "money",
    "location",
  ];

  return typeOrder
    .filter((type) => byType.has(type))
    .map((type) => `- ${type}: ${byType.get(type)!.join(", ")}`)
    .join("\n");
}

/**
 * Build the LLM prompt for theme extraction
 */
function buildThemeExtractionPrompt(
  context: string,
  documentCount: number
): Array<{ role: string; content: string }> {
  const systemPrompt = `You are a legal discovery analyst specializing in identifying key themes and patterns in case documents. Your task is to analyze document content and extract the most important themes for legal review.

Output your analysis in the following JSON format:
{
  "themes": [
    {
      "title": "Short theme title (3-5 words)",
      "description": "1-2 sentence description of the theme",
      "relevanceScore": 0.95,
      "keyTerms": ["term1", "term2", "term3"]
    }
  ],
  "suggestedQuestions": [
    {
      "question": "A specific question to investigate",
      "themeTitle": "Related Theme Title",
      "rationale": "Why this question matters",
      "priority": 5
    }
  ]
}

Guidelines:
- Identify 3-5 key themes that represent the core issues in the case
- Each theme should be distinct and legally relevant
- Suggested questions should help uncover important facts
- Priority: 5 = critical, 4 = important, 3 = useful, 2 = supplementary, 1 = optional
- Focus on patterns, disputes, relationships, key events, and potential issues
- Questions should be specific enough to guide semantic search
- Return ONLY valid JSON, no additional text`;

  const userPrompt = `Analyze this legal discovery case with ${documentCount} documents.

${context}

Extract the key themes and suggest investigative questions based on the document content and entities.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

/**
 * Parse the LLM response into structured themes and questions
 */
function parseThemeResponse(
  content: string,
  caseId: string
): ThemeExtractionResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/```\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonStr);

    const now = new Date();

    const themes: Omit<CaseTheme, "id">[] = (parsed.themes || []).map(
      (t: LLMTheme) => ({
        caseId,
        title: t.title || "Untitled Theme",
        description: t.description || "",
        relevanceScore: Math.min(1, Math.max(0, t.relevanceScore || 0.8)),
        supportingDocIds: [],
        keyTerms: Array.isArray(t.keyTerms) ? t.keyTerms : [],
        createdAt: now,
        updatedAt: now,
      })
    );

    const suggestedQuestions: Omit<SuggestedQuestion, "id">[] = (
      parsed.suggestedQuestions || []
    ).map((q: LLMQuestion) => ({
      caseId,
      question: q.question || "",
      themeId: "", // Will be linked after themes are saved with IDs
      rationale: q.rationale || "",
      priority: Math.min(5, Math.max(1, q.priority || 3)),
      createdAt: now,
      // Store themeTitle temporarily for linking
      _themeTitle: q.themeTitle,
    }));

    return { themes, suggestedQuestions };
  } catch (error) {
    console.error("[ThemeExtractor] Failed to parse response:", error);
    console.error("[ThemeExtractor] Raw content:", content.slice(0, 500));
    return { themes: [], suggestedQuestions: [] };
  }
}

/**
 * Link suggested questions to their themes by matching titles
 */
export function linkQuestionsToThemes(
  savedThemes: CaseTheme[],
  questions: Omit<SuggestedQuestion, "id">[]
): Omit<SuggestedQuestion, "id">[] {
  return questions.map((q) => {
    // Find matching theme by title
    const themeTitle = (q as { _themeTitle?: string })._themeTitle;
    const matchingTheme = savedThemes.find(
      (t) => t.title.toLowerCase() === themeTitle?.toLowerCase()
    );

    // Clean up temporary field and set themeId
    const { _themeTitle, ...cleanQuestion } = q as Omit<SuggestedQuestion, "id"> & { _themeTitle?: string };

    return {
      ...cleanQuestion,
      themeId: matchingTheme?.id || savedThemes[0]?.id || "",
    };
  });
}
