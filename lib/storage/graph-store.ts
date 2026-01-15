/**
 * Graph Store for Entity and Relationship Storage
 *
 * Provides cross-document linking and relationship mapping using IndexedDB.
 * Enables multi-hop graph traversal for enhanced semantic search.
 *
 * Schema:
 * - entities: Named entities (people, orgs, dates, etc.) with document references
 * - relationships: Edges between entities with co-occurrence weights
 * - docEntityMap: Fast document-to-entity lookups
 */

"use client";

// ============================================================================
// Types
// ============================================================================

export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "date"
  | "money"
  | "case"
  | "concept";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  documentIds: string[];
  chunkIds: string[];
  caseId: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  weight: number;
  documentIds: string[];
  caseId: string;
  evidence: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocEntityMap {
  documentId: string;
  caseId: string;
  entityIds: string[];
}

export interface GraphTraversalResult {
  entity: Entity;
  distance: number;
  path: string[];
}

export interface CrossDocumentLink {
  linkedDocumentId: string;
  sharedEntities: Entity[];
  strength: number;
}

// ============================================================================
// GraphStore Class
// ============================================================================

export class GraphStore {
  private dbName = "casemark-graph-store";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("[GraphStore] Failed to open database:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("[GraphStore] Database initialized");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Entities store
        if (!db.objectStoreNames.contains("entities")) {
          const entitiesStore = db.createObjectStore("entities", {
            keyPath: "id",
          });
          entitiesStore.createIndex("name", "name", { unique: false });
          entitiesStore.createIndex("type", "type", { unique: false });
          entitiesStore.createIndex("caseId", "caseId", { unique: false });
          entitiesStore.createIndex("documentIds", "documentIds", {
            unique: false,
            multiEntry: true,
          });
        }

        // Relationships store
        if (!db.objectStoreNames.contains("relationships")) {
          const relStore = db.createObjectStore("relationships", {
            keyPath: "id",
          });
          relStore.createIndex("sourceEntityId", "sourceEntityId", {
            unique: false,
          });
          relStore.createIndex("targetEntityId", "targetEntityId", {
            unique: false,
          });
          relStore.createIndex("type", "type", { unique: false });
          relStore.createIndex("caseId", "caseId", { unique: false });
        }

        // Document-Entity mapping
        if (!db.objectStoreNames.contains("docEntityMap")) {
          const mapStore = db.createObjectStore("docEntityMap", {
            keyPath: "documentId",
          });
          mapStore.createIndex("caseId", "caseId", { unique: false });
          mapStore.createIndex("entityIds", "entityIds", {
            unique: false,
            multiEntry: true,
          });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureDb(): Promise<IDBDatabase> {
    await this.initialize();
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  // ==========================================================================
  // Entity Operations
  // ==========================================================================

  /**
   * Upsert an entity (merge if exists by ID or name+type+caseId)
   */
  async upsertEntity(entity: Omit<Entity, "createdAt" | "updatedAt">): Promise<Entity> {
    const db = await this.ensureDb();

    // First check by ID (for re-processing same document)
    let existing = await this.getEntity(entity.id);

    // If not found by ID, check by name+type+caseId (for cross-document entities)
    if (!existing) {
      existing = await this.getEntityByNameAndType(
        entity.name,
        entity.type,
        entity.caseId
      );
    }

    const now = new Date();

    if (existing) {
      // Merge document/chunk references
      const merged: Entity = {
        ...existing,
        // Use existing ID to avoid duplicates
        id: existing.id,
        documentIds: [...new Set([...existing.documentIds, ...entity.documentIds])],
        chunkIds: [...new Set([...existing.chunkIds, ...entity.chunkIds])],
        aliases: [...new Set([...existing.aliases, ...entity.aliases])],
        metadata: { ...existing.metadata, ...entity.metadata },
        updatedAt: now,
      };

      await this.promisifyRequest(
        db
          .transaction(["entities"], "readwrite")
          .objectStore("entities")
          .put(merged)
      );

      return merged;
    } else {
      const newEntity: Entity = {
        ...entity,
        createdAt: now,
        updatedAt: now,
      };

      // Use put instead of add to handle edge cases
      await this.promisifyRequest(
        db
          .transaction(["entities"], "readwrite")
          .objectStore("entities")
          .put(newEntity)
      );

      return newEntity;
    }
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<Entity | null> {
    const db = await this.ensureDb();
    return (await this.promisifyRequest(
      db.transaction(["entities"], "readonly").objectStore("entities").get(id)
    )) as Entity | null;
  }

  /**
   * Get entity by name and type within a case
   */
  async getEntityByNameAndType(
    name: string,
    type: EntityType,
    caseId: string
  ): Promise<Entity | null> {
    const db = await this.ensureDb();
    const entities = (await this.promisifyRequest(
      db
        .transaction(["entities"], "readonly")
        .objectStore("entities")
        .index("name")
        .getAll(name)
    )) as Entity[];

    return entities.find((e) => e.type === type && e.caseId === caseId) || null;
  }

  /**
   * Get all entities for a case
   */
  async getEntitiesByCase(caseId: string): Promise<Entity[]> {
    const db = await this.ensureDb();
    return (await this.promisifyRequest(
      db
        .transaction(["entities"], "readonly")
        .objectStore("entities")
        .index("caseId")
        .getAll(caseId)
    )) as Entity[];
  }

  /**
   * Get all entities for a document
   */
  async getEntitiesByDocument(documentId: string): Promise<Entity[]> {
    const db = await this.ensureDb();
    const allEntities = (await this.promisifyRequest(
      db.transaction(["entities"], "readonly").objectStore("entities").getAll()
    )) as Entity[];

    return allEntities.filter((e) => e.documentIds.includes(documentId));
  }

  /**
   * Search entities by name (partial match)
   */
  async searchEntities(query: string, caseId: string): Promise<Entity[]> {
    const entities = await this.getEntitiesByCase(caseId);
    const lowerQuery = query.toLowerCase();

    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(lowerQuery) ||
        e.aliases.some((a) => a.toLowerCase().includes(lowerQuery))
    );
  }

  // ==========================================================================
  // Relationship Operations
  // ==========================================================================

  /**
   * Upsert a relationship (increment weight if exists)
   */
  async upsertRelationship(
    rel: Omit<Relationship, "createdAt" | "updatedAt">
  ): Promise<Relationship> {
    const db = await this.ensureDb();

    const existing = await this.getRelationship(
      rel.sourceEntityId,
      rel.targetEntityId,
      rel.type,
      rel.caseId
    );

    const now = new Date();

    if (existing) {
      const merged: Relationship = {
        ...existing,
        weight: existing.weight + rel.weight,
        documentIds: [...new Set([...existing.documentIds, ...rel.documentIds])],
        evidence: [...existing.evidence, ...rel.evidence].slice(0, 10),
        updatedAt: now,
      };

      await this.promisifyRequest(
        db
          .transaction(["relationships"], "readwrite")
          .objectStore("relationships")
          .put(merged)
      );

      return merged;
    } else {
      const newRel: Relationship = {
        ...rel,
        createdAt: now,
        updatedAt: now,
      };

      // Use put instead of add to handle edge cases
      await this.promisifyRequest(
        db
          .transaction(["relationships"], "readwrite")
          .objectStore("relationships")
          .put(newRel)
      );

      return newRel;
    }
  }

  /**
   * Get a specific relationship
   */
  async getRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    caseId: string
  ): Promise<Relationship | null> {
    const db = await this.ensureDb();
    const relationships = (await this.promisifyRequest(
      db
        .transaction(["relationships"], "readonly")
        .objectStore("relationships")
        .index("sourceEntityId")
        .getAll(sourceId)
    )) as Relationship[];

    return (
      relationships.find(
        (r) =>
          r.targetEntityId === targetId && r.type === type && r.caseId === caseId
      ) || null
    );
  }

  /**
   * Get all entities connected to a given entity (1-hop)
   */
  async getConnectedEntities(
    entityId: string
  ): Promise<{ entity: Entity; relationship: Relationship }[]> {
    const db = await this.ensureDb();

    const tx = db.transaction(["relationships", "entities"], "readonly");
    const relStore = tx.objectStore("relationships");
    const entityStore = tx.objectStore("entities");

    // Get outgoing relationships
    const outgoing = (await this.promisifyRequest(
      relStore.index("sourceEntityId").getAll(entityId)
    )) as Relationship[];

    // Get incoming relationships
    const incoming = (await this.promisifyRequest(
      relStore.index("targetEntityId").getAll(entityId)
    )) as Relationship[];

    const results: { entity: Entity; relationship: Relationship }[] = [];

    for (const rel of outgoing) {
      const entity = (await this.promisifyRequest(
        entityStore.get(rel.targetEntityId)
      )) as Entity | null;
      if (entity) results.push({ entity, relationship: rel });
    }

    for (const rel of incoming) {
      const entity = (await this.promisifyRequest(
        entityStore.get(rel.sourceEntityId)
      )) as Entity | null;
      if (entity) results.push({ entity, relationship: rel });
    }

    return results;
  }

  /**
   * Get all relationships for a case
   */
  async getRelationshipsByCase(caseId: string): Promise<Relationship[]> {
    const db = await this.ensureDb();
    return (await this.promisifyRequest(
      db
        .transaction(["relationships"], "readonly")
        .objectStore("relationships")
        .index("caseId")
        .getAll(caseId)
    )) as Relationship[];
  }

  // ==========================================================================
  // Graph Traversal
  // ==========================================================================

  /**
   * Multi-hop traversal: find entities within N hops using BFS
   */
  async traverseGraph(
    startEntityId: string,
    maxHops: number = 2
  ): Promise<Map<string, GraphTraversalResult>> {
    const visited = new Map<string, GraphTraversalResult>();
    const queue: { entityId: string; distance: number; path: string[] }[] = [
      { entityId: startEntityId, distance: 0, path: [startEntityId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.entityId) || current.distance > maxHops) continue;

      const entity = await this.getEntity(current.entityId);
      if (!entity) continue;

      visited.set(current.entityId, {
        entity,
        distance: current.distance,
        path: current.path,
      });

      if (current.distance < maxHops) {
        const connected = await this.getConnectedEntities(current.entityId);
        for (const { entity: connectedEntity } of connected) {
          if (!visited.has(connectedEntity.id)) {
            queue.push({
              entityId: connectedEntity.id,
              distance: current.distance + 1,
              path: [...current.path, connectedEntity.id],
            });
          }
        }
      }
    }

    return visited;
  }

  /**
   * Find cross-document connections through shared entities
   */
  async findCrossDocumentLinks(documentId: string): Promise<CrossDocumentLink[]> {
    const entities = await this.getEntitiesByDocument(documentId);

    const documentLinks = new Map<
      string,
      { entities: Entity[]; strength: number }
    >();

    for (const entity of entities) {
      for (const otherDocId of entity.documentIds) {
        if (otherDocId === documentId) continue;

        const existing = documentLinks.get(otherDocId) || {
          entities: [],
          strength: 0,
        };
        existing.entities.push(entity);
        existing.strength += 1;
        documentLinks.set(otherDocId, existing);
      }
    }

    return Array.from(documentLinks.entries())
      .map(([docId, data]) => ({
        linkedDocumentId: docId,
        sharedEntities: data.entities,
        strength: data.strength,
      }))
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Find paths between two entities
   */
  async findPathBetweenEntities(
    sourceId: string,
    targetId: string,
    maxHops: number = 3
  ): Promise<string[][] | null> {
    const paths: string[][] = [];
    const queue: { entityId: string; path: string[] }[] = [
      { entityId: sourceId, path: [sourceId] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.path.length > maxHops + 1) continue;
      if (visited.has(current.entityId)) continue;
      visited.add(current.entityId);

      if (current.entityId === targetId) {
        paths.push(current.path);
        continue;
      }

      const connected = await this.getConnectedEntities(current.entityId);
      for (const { entity } of connected) {
        if (!visited.has(entity.id)) {
          queue.push({
            entityId: entity.id,
            path: [...current.path, entity.id],
          });
        }
      }
    }

    return paths.length > 0 ? paths : null;
  }

  // ==========================================================================
  // Document-Entity Mapping
  // ==========================================================================

  /**
   * Update document-entity mapping
   */
  async updateDocEntityMap(
    documentId: string,
    caseId: string,
    entityIds: string[]
  ): Promise<void> {
    const db = await this.ensureDb();

    const mapping: DocEntityMap = {
      documentId,
      caseId,
      entityIds,
    };

    await this.promisifyRequest(
      db
        .transaction(["docEntityMap"], "readwrite")
        .objectStore("docEntityMap")
        .put(mapping)
    );
  }

  /**
   * Get entity IDs for a document
   */
  async getDocEntityMap(documentId: string): Promise<DocEntityMap | null> {
    const db = await this.ensureDb();
    return (await this.promisifyRequest(
      db
        .transaction(["docEntityMap"], "readonly")
        .objectStore("docEntityMap")
        .get(documentId)
    )) as DocEntityMap | null;
  }

  // ==========================================================================
  // Cleanup Operations
  // ==========================================================================

  /**
   * Delete all data for a case
   */
  async deleteCase(caseId: string): Promise<void> {
    const db = await this.ensureDb();

    const entities = await this.getEntitiesByCase(caseId);
    const relationships = await this.getRelationshipsByCase(caseId);

    const tx = db.transaction(
      ["entities", "relationships", "docEntityMap"],
      "readwrite"
    );

    const entityStore = tx.objectStore("entities");
    const relStore = tx.objectStore("relationships");
    const mapStore = tx.objectStore("docEntityMap");

    for (const entity of entities) {
      await this.promisifyRequest(entityStore.delete(entity.id));
    }

    for (const rel of relationships) {
      await this.promisifyRequest(relStore.delete(rel.id));
    }

    // Delete doc-entity mappings for this case
    const allMaps = (await this.promisifyRequest(
      mapStore.index("caseId").getAll(caseId)
    )) as DocEntityMap[];

    for (const map of allMaps) {
      await this.promisifyRequest(mapStore.delete(map.documentId));
    }

    console.log(`[GraphStore] Deleted case ${caseId} graph data`);
  }

  /**
   * Delete all data for a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const db = await this.ensureDb();

    // Remove document from all entities
    const entities = await this.getEntitiesByDocument(documentId);
    const entityStore = db
      .transaction(["entities"], "readwrite")
      .objectStore("entities");

    for (const entity of entities) {
      entity.documentIds = entity.documentIds.filter((id) => id !== documentId);
      entity.updatedAt = new Date();

      if (entity.documentIds.length === 0) {
        await this.promisifyRequest(entityStore.delete(entity.id));
      } else {
        await this.promisifyRequest(entityStore.put(entity));
      }
    }

    // Delete doc-entity mapping
    await this.promisifyRequest(
      db
        .transaction(["docEntityMap"], "readwrite")
        .objectStore("docEntityMap")
        .delete(documentId)
    );

    console.log(`[GraphStore] Deleted document ${documentId} graph data`);
  }

  /**
   * Get graph statistics for a case
   */
  async getStats(caseId: string): Promise<{
    entityCount: number;
    relationshipCount: number;
    entitiesByType: Record<EntityType, number>;
  }> {
    const entities = await this.getEntitiesByCase(caseId);
    const relationships = await this.getRelationshipsByCase(caseId);

    const entitiesByType: Record<EntityType, number> = {
      person: 0,
      organization: 0,
      location: 0,
      date: 0,
      money: 0,
      case: 0,
      concept: 0,
    };

    for (const entity of entities) {
      entitiesByType[entity.type]++;
    }

    return {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      entitiesByType,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const graphStore = new GraphStore();
