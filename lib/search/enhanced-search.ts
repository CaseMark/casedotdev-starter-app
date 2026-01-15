/**
 * Enhanced Search Service
 *
 * Combines vector similarity search with graph-based context enrichment.
 * Provides cross-document linking and relationship-aware search results.
 *
 * Architecture:
 * 1. Vector search for initial chunk retrieval
 * 2. Entity extraction from query
 * 3. Graph traversal for related context
 * 4. Result enrichment with cross-document links
 */

"use client";

import { semanticSearch, type SearchOptions } from "@/lib/vector-store";
import { graphStore, type Entity, type CrossDocumentLink } from "@/lib/storage/graph-store";
import { entityExtractor } from "@/lib/processing/entity-extractor";
import { getChunk, getDocument } from "@/lib/storage/discovery-db";
import type { SearchMatch, DocumentChunk } from "@/types/discovery";

// ============================================================================
// Types
// ============================================================================

export interface GraphContext {
  /** Entities found in query and related through graph */
  queryEntities: Entity[];
  /** Entities connected via graph traversal */
  relatedEntities: Entity[];
  /** Cross-document links based on shared entities */
  crossDocumentLinks: CrossDocumentLink[];
  /** Paths between query entities and result entities */
  entityPaths: Array<{
    entity: Entity;
    distance: number;
    path: string[];
  }>;
}

export interface EnhancedSearchResult {
  /** Standard vector search results */
  matches: SearchMatch[];
  /** Graph-enriched context */
  graphContext: GraphContext;
  /** Additional chunks from graph-connected documents */
  graphEnrichedChunks: SearchMatch[];
  /** Total unique documents across all results */
  uniqueDocuments: string[];
  /** Search metadata */
  metadata: {
    vectorResultCount: number;
    graphResultCount: number;
    totalEntitiesFound: number;
    searchTimeMs: number;
  };
}

export interface EnhancedSearchOptions extends SearchOptions {
  /** Maximum graph traversal hops (default: 2) */
  maxHops?: number;
  /** Include graph-enriched chunks (default: true) */
  includeGraphChunks?: boolean;
  /** Weight for graph results vs vector results (0-1, default: 0.3) */
  graphWeight?: number;
  /** Minimum entity confidence for graph search (default: 0.7) */
  minEntityConfidence?: number;
}

// ============================================================================
// Enhanced Search Service
// ============================================================================

export class EnhancedSearchService {
  /**
   * Perform enhanced search with graph context
   */
  async search(
    query: string,
    queryEmbedding: number[],
    options: EnhancedSearchOptions
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now();

    const {
      maxHops = 2,
      includeGraphChunks = true,
      graphWeight = 0.3,
      minEntityConfidence = 0.7,
      ...vectorOptions
    } = options;

    // Initialize graph store
    await graphStore.initialize();

    // 1. Standard vector search
    const vectorMatches = await semanticSearch(
      {
        caseId: options.caseId,
        query: options.query,
        limit: options.limit,
        threshold: options.threshold,
        documentIds: options.documentIds,
      },
      queryEmbedding
    );

    // 2. Extract entities from query
    const queryContext = {
      id: "query",
      content: query,
      documentId: "query",
      caseId: options.caseId,
    };
    const queryExtraction = entityExtractor.extractWithRegex(queryContext);
    const queryEntities = queryExtraction.entities.filter(
      (e) => e.confidence >= minEntityConfidence
    );

    // 3. Find matching entities in graph store
    const graphContext: GraphContext = {
      queryEntities: [],
      relatedEntities: [],
      crossDocumentLinks: [],
      entityPaths: [],
    };

    const graphEnrichedChunks: SearchMatch[] = [];
    const graphChunkIds = new Set<string>();

    for (const extracted of queryEntities) {
      // Search for this entity in the graph
      const matchingEntities = await graphStore.searchEntities(
        extracted.name,
        options.caseId
      );

      for (const entity of matchingEntities) {
        graphContext.queryEntities.push(entity);

        // Traverse graph to find related entities
        if (includeGraphChunks) {
          const traversal = await graphStore.traverseGraph(entity.id, maxHops);

          for (const [, result] of traversal) {
            if (result.distance > 0) {
              graphContext.relatedEntities.push(result.entity);
              graphContext.entityPaths.push(result);

              // Collect chunk IDs from related entities
              result.entity.chunkIds.forEach((id) => graphChunkIds.add(id));
            }
          }

          // Find cross-document links
          for (const docId of entity.documentIds) {
            const links = await graphStore.findCrossDocumentLinks(docId);
            graphContext.crossDocumentLinks.push(...links);
          }
        }
      }
    }

    // 4. Fetch graph-connected chunks
    if (includeGraphChunks && graphChunkIds.size > 0) {
      // Remove chunks already in vector results
      const vectorChunkIds = new Set(vectorMatches.map((m) => m.chunkId));
      const newChunkIds = Array.from(graphChunkIds).filter(
        (id) => !vectorChunkIds.has(id)
      );

      // Fetch and score graph chunks
      for (const chunkId of newChunkIds.slice(0, 10)) {
        // Limit to top 10
        const chunk = await getChunk(chunkId);
        if (!chunk) continue;

        const doc = await getDocument(chunk.documentId);
        if (!doc) continue;

        // Calculate graph-based score
        const relatedEntity = graphContext.relatedEntities.find((e) =>
          e.chunkIds.includes(chunkId)
        );
        const distance = graphContext.entityPaths.find(
          (p) => p.entity.id === relatedEntity?.id
        )?.distance || maxHops;

        // Score decreases with distance
        const graphScore = Math.max(0.3, 1 - distance * 0.2) * graphWeight;

        graphEnrichedChunks.push({
          chunkId,
          documentId: chunk.documentId,
          documentName: doc.fileName,
          content: chunk.content,
          score: graphScore,
          pageNumber: chunk.metadata?.pageNumber,
          highlights: [],
        });
      }
    }

    // 5. Deduplicate cross-document links
    const uniqueLinks = new Map<string, CrossDocumentLink>();
    for (const link of graphContext.crossDocumentLinks) {
      const existing = uniqueLinks.get(link.linkedDocumentId);
      if (!existing || link.strength > existing.strength) {
        uniqueLinks.set(link.linkedDocumentId, link);
      }
    }
    graphContext.crossDocumentLinks = Array.from(uniqueLinks.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);

    // 6. Collect unique documents
    const uniqueDocuments = new Set<string>();
    vectorMatches.forEach((m) => uniqueDocuments.add(m.documentId));
    graphEnrichedChunks.forEach((m) => uniqueDocuments.add(m.documentId));

    const searchTimeMs = Date.now() - startTime;

    return {
      matches: vectorMatches,
      graphContext,
      graphEnrichedChunks: graphEnrichedChunks.sort((a, b) => b.score - a.score),
      uniqueDocuments: Array.from(uniqueDocuments),
      metadata: {
        vectorResultCount: vectorMatches.length,
        graphResultCount: graphEnrichedChunks.length,
        totalEntitiesFound:
          graphContext.queryEntities.length + graphContext.relatedEntities.length,
        searchTimeMs,
      },
    };
  }

  /**
   * Get related documents based on shared entities
   */
  async getRelatedDocuments(
    documentId: string,
    caseId: string,
    limit: number = 5
  ): Promise<CrossDocumentLink[]> {
    await graphStore.initialize();
    const links = await graphStore.findCrossDocumentLinks(documentId);
    return links.slice(0, limit);
  }

  /**
   * Get entity network for visualization
   */
  async getEntityNetwork(
    caseId: string
  ): Promise<{
    entities: Entity[];
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }>;
  }> {
    await graphStore.initialize();

    const entities = await graphStore.getEntitiesByCase(caseId);
    const relationships = await graphStore.getRelationshipsByCase(caseId);

    return {
      entities,
      relationships: relationships.map((r) => ({
        source: r.sourceEntityId,
        target: r.targetEntityId,
        type: r.type,
        weight: r.weight,
      })),
    };
  }

  /**
   * Find all mentions of an entity across documents
   */
  async findEntityMentions(
    entityId: string,
    caseId: string
  ): Promise<{
    entity: Entity | null;
    chunks: DocumentChunk[];
    documents: string[];
  }> {
    await graphStore.initialize();

    const entity = await graphStore.getEntity(entityId);
    if (!entity || entity.caseId !== caseId) {
      return { entity: null, chunks: [], documents: [] };
    }

    const chunks: DocumentChunk[] = [];
    for (const chunkId of entity.chunkIds) {
      const chunk = await getChunk(chunkId);
      if (chunk) chunks.push(chunk);
    }

    return {
      entity,
      chunks,
      documents: entity.documentIds,
    };
  }
}

// Singleton instance
export const enhancedSearch = new EnhancedSearchService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Perform enhanced semantic search with graph context
 */
export async function enhancedSemanticSearch(
  query: string,
  queryEmbedding: number[],
  options: EnhancedSearchOptions
): Promise<EnhancedSearchResult> {
  return enhancedSearch.search(query, queryEmbedding, options);
}

/**
 * Get documents related to a given document through shared entities
 */
export async function getRelatedDocuments(
  documentId: string,
  caseId: string,
  limit?: number
): Promise<CrossDocumentLink[]> {
  return enhancedSearch.getRelatedDocuments(documentId, caseId, limit);
}
