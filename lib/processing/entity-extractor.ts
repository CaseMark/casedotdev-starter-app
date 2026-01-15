/**
 * Entity Extraction Service
 *
 * Extracts named entities and relationships from document chunks.
 * Uses regex patterns for common legal entities and optionally LLM for complex extraction.
 *
 * Entity Types:
 * - person: Names of individuals
 * - organization: Companies, firms, agencies
 * - location: Addresses, jurisdictions
 * - date: Dates and time references
 * - money: Monetary amounts
 * - case: Case numbers and references
 * - concept: Legal concepts and terms
 */

"use client";

import type { Entity, EntityType, Relationship } from "@/lib/storage/graph-store";

// ============================================================================
// Types
// ============================================================================

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  aliases: string[];
  confidence: number;
  position: { start: number; end: number };
}

export interface ExtractedRelationship {
  sourceName: string;
  sourceType: EntityType;
  targetName: string;
  targetType: EntityType;
  type: string;
  evidence: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export interface ChunkContext {
  id: string;
  content: string;
  documentId: string;
  caseId: string;
}

// ============================================================================
// Entity Extractor Class
// ============================================================================

export class EntityExtractor {
  /**
   * Extract entities using regex patterns (fast, no API calls)
   */
  extractWithRegex(chunk: ChunkContext): ExtractionResult {
    const entities: ExtractedEntity[] = [];
    const content = chunk.content;

    // Case numbers (e.g., "Case No. 2024-CV-1234", "No. 21-cv-00123")
    const casePatterns = [
      /(?:Case\s*(?:No\.?|Number)?:?\s*)(\d{2,4}[-\s]?[A-Z]{2,4}[-\s]?\d{3,6})/gi,
      /(?:No\.?\s*)(\d{2,4}[-\s]?[a-z]{2,4}[-\s]?\d{3,6})/gi,
      /\b(\d{1,2}:\d{2}-[a-z]{2,3}-\d{4,6})\b/gi,
    ];

    for (const pattern of casePatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[1] || match[0];
        if (!entities.some((e) => e.name === name && e.type === "case")) {
          entities.push({
            name: name.trim(),
            type: "case",
            aliases: [],
            confidence: 0.9,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Monetary amounts
    const moneyPatterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?/gi,
      /(?:USD|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi,
    ];

    for (const pattern of moneyPatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[0].trim();
        if (!entities.some((e) => e.name === name && e.type === "money")) {
          entities.push({
            name,
            type: "money",
            aliases: [],
            confidence: 0.95,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Dates
    const datePatterns = [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
    ];

    for (const pattern of datePatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[0].trim();
        if (!entities.some((e) => e.name === name && e.type === "date")) {
          entities.push({
            name,
            type: "date",
            aliases: [],
            confidence: 0.9,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Organizations (common legal entity patterns)
    const orgPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc\.|LLC|LLP|Corp\.|Corporation|Company|Co\.|Ltd\.|Limited|PC|P\.C\.|PLLC))\b/g,
      /\b((?:The\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Law\s+(?:Firm|Group|Office)|Associates))\b/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Department|Agency|Commission|Board|Authority))\b/g,
    ];

    for (const pattern of orgPatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[1] || match[0];
        if (
          !entities.some((e) => e.name === name && e.type === "organization") &&
          name.length > 3
        ) {
          entities.push({
            name: name.trim(),
            type: "organization",
            aliases: [],
            confidence: 0.8,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Person names (basic pattern - capitalized words in specific contexts)
    const personPatterns = [
      /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Hon\.|Judge|Attorney|Plaintiff|Defendant)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/g,
      /\b([A-Z][a-z]+)\s+v\.\s+([A-Z][a-z]+)/g, // Case party names
    ];

    for (const pattern of personPatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[1] || match[0];
        if (
          !entities.some((e) => e.name === name && e.type === "person") &&
          name.length > 3
        ) {
          entities.push({
            name: name.trim(),
            type: "person",
            aliases: [],
            confidence: 0.7,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Legal concepts
    const conceptPatterns = [
      /\b(breach of contract|negligence|fraud|defamation|malpractice|discrimination|wrongful termination|intellectual property|patent infringement|trademark|copyright|trade secret)\b/gi,
      /\b(summary judgment|motion to dismiss|preliminary injunction|class action|settlement agreement|consent decree|plea agreement)\b/gi,
    ];

    for (const pattern of conceptPatterns) {
      for (const match of content.matchAll(pattern)) {
        const name = match[0].toLowerCase();
        if (!entities.some((e) => e.name.toLowerCase() === name && e.type === "concept")) {
          entities.push({
            name: match[0].trim(),
            type: "concept",
            aliases: [],
            confidence: 0.85,
            position: { start: match.index!, end: match.index! + match[0].length },
          });
        }
      }
    }

    // Generate co-occurrence relationships
    const relationships = this.generateCooccurrenceRelationships(entities, content);

    return { entities, relationships };
  }

  /**
   * Generate relationships based on entity co-occurrence in the same chunk
   */
  private generateCooccurrenceRelationships(
    entities: ExtractedEntity[],
    content: string
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Create relationships between entities that appear close together
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        // Skip if same type (usually not meaningful)
        if (e1.type === e2.type) continue;

        // Calculate distance between entities
        const distance = Math.abs(e1.position.start - e2.position.start);

        // If within 500 characters, consider them related
        if (distance < 500) {
          const relationType = this.inferRelationshipType(e1.type, e2.type);

          // Extract evidence (text between entities)
          const start = Math.min(e1.position.start, e2.position.start);
          const end = Math.max(e1.position.end, e2.position.end);
          const evidence = content.slice(
            Math.max(0, start - 20),
            Math.min(content.length, end + 20)
          );

          relationships.push({
            sourceName: e1.name,
            sourceType: e1.type,
            targetName: e2.name,
            targetType: e2.type,
            type: relationType,
            evidence: evidence.slice(0, 200),
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Infer relationship type based on entity types
   */
  private inferRelationshipType(type1: EntityType, type2: EntityType): string {
    const pair = [type1, type2].sort().join("-");

    const typeMap: Record<string, string> = {
      "case-organization": "party_in",
      "case-person": "party_in",
      "date-case": "filed_on",
      "money-case": "amount_in",
      "organization-person": "associated_with",
      "concept-case": "involves",
      "location-organization": "located_in",
    };

    return typeMap[pair] || "mentioned_with";
  }

  /**
   * Convert extracted entities to graph store format
   */
  toGraphEntities(
    extracted: ExtractedEntity[],
    chunk: ChunkContext
  ): Omit<Entity, "createdAt" | "updatedAt">[] {
    return extracted.map((e) => ({
      id: this.generateEntityId(e.name, e.type),
      name: e.name,
      type: e.type,
      aliases: e.aliases,
      documentIds: [chunk.documentId],
      chunkIds: [chunk.id],
      caseId: chunk.caseId,
      metadata: { confidence: e.confidence },
    }));
  }

  /**
   * Convert extracted relationships to graph store format
   */
  toGraphRelationships(
    extracted: ExtractedRelationship[],
    chunk: ChunkContext
  ): Omit<Relationship, "createdAt" | "updatedAt">[] {
    return extracted.map((r, i) => ({
      id: `rel_${chunk.documentId}_${chunk.id}_${i}`,
      sourceEntityId: this.generateEntityId(r.sourceName, r.sourceType),
      targetEntityId: this.generateEntityId(r.targetName, r.targetType),
      type: r.type,
      weight: 1,
      documentIds: [chunk.documentId],
      caseId: chunk.caseId,
      evidence: [r.evidence],
    }));
  }

  /**
   * Generate consistent entity ID from name and type
   */
  private generateEntityId(name: string, type: string): string {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return `entity_${type}_${normalized}`;
  }

  /**
   * Extract entities from multiple chunks (batch processing)
   */
  extractFromChunks(chunks: ChunkContext[]): Map<string, ExtractionResult> {
    const results = new Map<string, ExtractionResult>();

    for (const chunk of chunks) {
      results.set(chunk.id, this.extractWithRegex(chunk));
    }

    return results;
  }

  /**
   * Merge extraction results from multiple chunks
   */
  mergeResults(results: ExtractionResult[]): ExtractionResult {
    const entityMap = new Map<string, ExtractedEntity>();
    const relationships: ExtractedRelationship[] = [];

    for (const result of results) {
      for (const entity of result.entities) {
        const key = `${entity.type}_${entity.name.toLowerCase()}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, entity);
        }
      }
      relationships.push(...result.relationships);
    }

    return {
      entities: Array.from(entityMap.values()),
      relationships,
    };
  }
}

// Singleton instance
export const entityExtractor = new EntityExtractor();
