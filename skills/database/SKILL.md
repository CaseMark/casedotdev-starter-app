# Database Skill

## Purpose

This skill covers client-side data persistence using **IndexedDB** (via Dexie.js) for the Discovery Desktop application. This is a fully client-side, serverless approach where all data is stored in the user's browser.

## Key Concepts

- **IndexedDB (Dexie.js)**: Client-side database for large data storage (documents, chunks, embeddings)
- **localStorage**: Small state data (session references, preferences, UI state)
- **Browser-Scoped**: Data persists per browser, not synced across devices
- **User Isolation**: Data scoped by `createdBy`/`uploadedBy` and `organizationId`
- **Offline-Capable**: No network required for data operations

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   localStorage  │    │         IndexedDB             │   │
│  │                 │    │                               │   │
│  │ session refs    │    │ cases                        │   │
│  │ preferences     │◄──►│ documents                    │   │
│  │ UI state        │    │ chunks, embeddings           │   │
│  │                 │    │ processingJobs               │   │
│  └─────────────────┘    │ users, sessions              │   │
│                         └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## When to Use This Pattern

| Use Case | Recommendation |
|----------|----------------|
| Demo/MVP without database setup | **Yes** - no infrastructure needed |
| Offline-capable application | **Yes** - data persists without network |
| Privacy-first (data stays local) | **Yes** - nothing leaves the browser |
| Multi-device sync required | **No** - use server database |
| Large-scale production | **No** - use Neon/PostgreSQL |
| Compliance requiring audit logs | **No** - use server database |

---

## Project Structure

```
lib/
├── storage/
│   └── discovery-db.ts         # IndexedDB schema & CRUD operations
├── auth/
│   ├── auth-context.tsx        # React context & hooks
│   └── local-auth.ts           # Client-side auth operations
types/
└── discovery.ts                # Data type definitions
```

---

## Setup

### Installation

```bash
bun add dexie
```

Dexie.js provides a cleaner API over raw IndexedDB with full TypeScript support.

### No Environment Variables Required

Unlike server databases, IndexedDB requires no configuration. Data is stored in the user's browser automatically. The only environment variable needed for the app is:

```env
CASEDEV_API_KEY=your-api-key
```

---

## Database Schema

### Database Class Definition

```typescript
// lib/storage/discovery-db.ts
import Dexie, { type EntityTable } from "dexie";
import type {
  Case,
  Document,
  DocumentChunk,
  ChunkEmbedding,
  ProcessingJob,
} from "@/types/discovery";

// Auth types stored in IndexedDB
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

class DiscoveryDatabase extends Dexie {
  cases!: EntityTable<Case, "id">;
  documents!: EntityTable<Document, "id">;
  chunks!: EntityTable<DocumentChunk, "id">;
  embeddings!: EntityTable<ChunkEmbedding, "id">;
  processingJobs!: EntityTable<ProcessingJob, "id">;
  users!: EntityTable<User, "id">;
  sessions!: EntityTable<Session, "id">;

  constructor() {
    super("DiscoveryDesktop");

    this.version(2).stores({
      // Cases: indexed by user and organization for filtering
      cases: "id, createdBy, organizationId, status, createdAt",

      // Documents: indexed by case for listing, status for filtering
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",

      // Chunks: indexed by document and case for retrieval
      chunks: "id, documentId, caseId, chunkIndex, contentHash",

      // Embeddings: indexed for vector search operations
      embeddings: "id, chunkId, documentId, caseId, model",

      // Processing jobs: indexed for status tracking
      processingJobs: "id, documentId, caseId, type, status, createdAt",

      // Auth: users and sessions for client-side authentication
      users: "id, email",
      sessions: "id, userId, token, expiresAt",
    });
  }
}

// Singleton database instance
export const db = new DiscoveryDatabase();
```

### Schema Design Principles

1. **Primary Key First**: The first field in the store definition is the primary key
2. **Index Frequently Queried Fields**: Add fields you'll filter/sort by to the index
3. **User Scoping**: Always include `createdBy`/`uploadedBy` and `organizationId` for multi-user support
4. **Versioning**: Increment version when changing schema

```typescript
// Schema syntax: 'primaryKey, index1, index2, ...'
this.version(2).stores({
  cases: 'id, createdBy, organizationId, status, createdAt',
  //      ↑    ↑          ↑              ↑       ↑
  //      PK   User scope Org scope      Filter  Sort
});
```

---

## Data Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `cases` | Legal cases/matters | `createdBy`, `organizationId`, `status` |
| `documents` | Uploaded documents | `caseId`, `uploadedBy`, `status` |
| `chunks` | Document text chunks | `documentId`, `caseId`, `chunkIndex` |
| `embeddings` | Vector embeddings | `chunkId`, `documentId`, `caseId` |
| `processingJobs` | Background job tracking | `documentId`, `caseId`, `status` |
| `users` | User accounts | `email` |
| `sessions` | Auth sessions | `userId`, `token` |

---

## CRUD Operations

### Create

```typescript
export async function createCase(
  data: Omit<Case, "id" | "createdAt" | "updatedAt">
): Promise<Case> {
  const newCase: Case = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.cases.add(newCase);
  return newCase;
}

export async function createDocument(
  data: Omit<Document, "id" | "uploadedAt">
): Promise<Document> {
  const doc: Document = {
    ...data,
    id: crypto.randomUUID(),
    uploadedAt: new Date(),
  };
  await db.documents.add(doc);
  return doc;
}
```

### Read (Single)

```typescript
export async function getCase(id: string): Promise<Case | undefined> {
  return db.cases.get(id);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  return db.documents.get(id);
}
```

### Read (List with User Scoping)

```typescript
// Get cases by user ID
export async function getCasesByUser(userId: string): Promise<Case[]> {
  return db.cases
    .where("createdBy")
    .equals(userId)
    .reverse()
    .sortBy("createdAt");
}

// Get cases by organization
export async function getCasesByOrganization(orgId: string): Promise<Case[]> {
  return db.cases
    .where("organizationId")
    .equals(orgId)
    .reverse()
    .sortBy("createdAt");
}

// Get documents by case
export async function getDocumentsByCase(caseId: string): Promise<Document[]> {
  return db.documents
    .where("caseId")
    .equals(caseId)
    .reverse()
    .sortBy("uploadedAt");
}
```

### Update

```typescript
export async function updateCase(
  id: string,
  updates: Partial<Omit<Case, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  await db.cases.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<Document, "id" | "caseId" | "uploadedBy" | "uploadedAt">>
): Promise<void> {
  await db.documents.update(id, updates);
}
```

### Delete (with Cascade)

```typescript
export async function deleteCase(id: string): Promise<void> {
  // Delete all related data in a transaction
  await db.transaction(
    "rw",
    [db.cases, db.documents, db.chunks, db.embeddings, db.processingJobs],
    async () => {
      // Delete embeddings for this case
      await db.embeddings.where("caseId").equals(id).delete();
      // Delete chunks for this case
      await db.chunks.where("caseId").equals(id).delete();
      // Delete processing jobs for this case
      await db.processingJobs.where("caseId").equals(id).delete();
      // Delete documents for this case
      await db.documents.where("caseId").equals(id).delete();
      // Delete the case
      await db.cases.delete(id);
    }
  );
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.documents, db.chunks, db.embeddings, db.processingJobs],
    async () => {
      await db.embeddings.where("documentId").equals(id).delete();
      await db.chunks.where("documentId").equals(id).delete();
      await db.processingJobs.where("documentId").equals(id).delete();
      await db.documents.delete(id);
    }
  );
}
```

### Bulk Operations

```typescript
// Bulk insert chunks
export async function createChunks(
  chunks: Omit<DocumentChunk, "id">[]
): Promise<DocumentChunk[]> {
  const newChunks = chunks.map((chunk) => ({
    ...chunk,
    id: crypto.randomUUID(),
  }));
  await db.chunks.bulkAdd(newChunks);
  return newChunks;
}

// Bulk insert embeddings
export async function createEmbeddings(
  embeddings: Omit<ChunkEmbedding, "id" | "createdAt">[]
): Promise<ChunkEmbedding[]> {
  const newEmbeddings = embeddings.map((emb) => ({
    ...emb,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  }));
  await db.embeddings.bulkAdd(newEmbeddings);
  return newEmbeddings;
}
```

---

## Transactions

Use transactions for operations that must succeed or fail together:

```typescript
export async function deleteCase(id: string): Promise<void> {
  await db.transaction(
    "rw", // read-write mode
    [db.cases, db.documents, db.chunks, db.embeddings, db.processingJobs],
    async () => {
      // All operations in this block are atomic
      await db.embeddings.where("caseId").equals(id).delete();
      await db.chunks.where("caseId").equals(id).delete();
      await db.processingJobs.where("caseId").equals(id).delete();
      await db.documents.where("caseId").equals(id).delete();
      await db.cases.delete(id);
    }
  );
}
```

---

## User Isolation Pattern

All app data queries include user ID to isolate data between users:

```typescript
// Cases scoped by createdBy
const cases = await db.cases
  .where("createdBy")
  .equals(userId)
  .toArray();

// Documents scoped by uploadedBy
const docs = await db.documents
  .where("uploadedBy")
  .equals(userId)
  .toArray();
```

### Without Auth (Demo Mode)

Without auth, generate a persistent anonymous ID:

```typescript
function getAnonymousUserId(): string {
  const key = 'app:anonymousUserId';
  let id = localStorage.getItem(key);

  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }

  return id;
}

// Use in queries
const userId = session?.user?.id || getAnonymousUserId();
```

---

## Client-Side Authentication

Auth is stored entirely in IndexedDB:

### User Operations

```typescript
export async function createUser(
  data: Omit<User, "id" | "createdAt">
): Promise<User> {
  const user: User = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.users.add(user);
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.users.where("email").equals(email.toLowerCase()).first();
}
```

### Session Operations

```typescript
export async function createSession(
  data: Omit<Session, "id" | "createdAt">
): Promise<Session> {
  const session: Session = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.sessions.add(session);
  return session;
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  return db.sessions.where("token").equals(token).first();
}

export async function deleteExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.sessions.filter((session) => session.expiresAt < now).delete();
}
```

### Security Notes (Demo Mode)

| Aspect | Status | Note |
|--------|--------|------|
| Password hashing | SHA-256 | Weaker than bcrypt/argon2 |
| Session tokens | Random 32 bytes | Stored in localStorage |
| Server validation | None | Client-side only |
| Data encryption | None | Plain IndexedDB |

**This is designed for demos and local use, not production.**

---

## Aggregations & Statistics

```typescript
export async function getDocumentStats(caseId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  const docs = await db.documents.where("caseId").equals(caseId).toArray();
  const byStatus: Record<string, number> = {};
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
  }
  return { total: docs.length, byStatus };
}

export async function getDatabaseStats(): Promise<{
  cases: number;
  documents: number;
  chunks: number;
  embeddings: number;
  jobs: number;
}> {
  const [cases, documents, chunks, embeddings, jobs] = await Promise.all([
    db.cases.count(),
    db.documents.count(),
    db.chunks.count(),
    db.embeddings.count(),
    db.processingJobs.count(),
  ]);
  return { cases, documents, chunks, embeddings, jobs };
}
```

---

## Schema Versioning

When changing the schema, increment the version number:

```typescript
class DiscoveryDatabase extends Dexie {
  constructor() {
    super("DiscoveryDesktop");

    // Version 1 - initial schema
    this.version(1).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt",
      chunks: "id, documentId, caseId",
    });

    // Version 2 - add indexes
    this.version(2).stores({
      cases: "id, createdBy, organizationId, status, createdAt",
      documents: "id, caseId, uploadedBy, status, uploadedAt, fileName",
      chunks: "id, documentId, caseId, chunkIndex, contentHash",
      embeddings: "id, chunkId, documentId, caseId, model",  // New table
    });
  }
}
```

---

## Utility Functions

### Clear All Data

```typescript
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.cases, db.documents, db.chunks, db.embeddings, db.processingJobs],
    async () => {
      await db.embeddings.clear();
      await db.chunks.clear();
      await db.processingJobs.clear();
      await db.documents.clear();
      await db.cases.clear();
    }
  );
}
```

### Browser Environment Check

```typescript
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Use in operations
export async function getCase(id: string): Promise<Case | undefined> {
  if (!isBrowser()) return undefined;
  return db.cases.get(id);
}
```

---

## Best Practices

1. **Always Check Browser Environment**
   ```typescript
   if (typeof window === 'undefined') return [];
   ```

2. **Use Transactions for Related Operations**
   ```typescript
   await db.transaction("rw", [db.cases, db.documents], async () => {
     // atomic operations
   });
   ```

3. **Scope Queries by User**
   ```typescript
   db.cases.where("createdBy").equals(userId).toArray();
   ```

4. **Handle Errors Gracefully**
   ```typescript
   try {
     return await db.cases.get(id);
   } catch (error) {
     console.error('[Storage] Failed:', error);
     return undefined;
   }
   ```

5. **Use Bulk Operations for Multiple Records**
   ```typescript
   await db.chunks.bulkAdd(chunks);
   await db.embeddings.bulkPut(embeddings);
   ```

6. **Index Fields Used in Queries**
   ```typescript
   // Good - indexed field
   db.documents.where("caseId").equals(id);
   
   // Slow - non-indexed field requires filter
   db.documents.filter(d => d.customField === value);
   ```

---

## Common Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| `window is not defined` | Running on server | Check `typeof window !== 'undefined'` |
| Data disappears | Browser cleared storage | Warn users about browser data clearing |
| Slow queries | Missing index | Add field to Dexie store definition |
| Data not isolated | Missing user filter | Always query with `createdBy`/`uploadedBy` |
| Schema update fails | Version not incremented | Increment version when changing stores |

---

## Differences from Server Database

| Aspect | Server (PostgreSQL) | Client (IndexedDB) |
|--------|---------------------|-------------------|
| Location | Cloud/Server | Browser |
| Auth | Server-side session | Client-side tokens |
| Cross-device sync | Yes | No |
| Offline support | No | Yes |
| Data persistence | Permanent | Browser-dependent |
| Backup | Automated | Manual export |
| Multi-user | Native | User ID filtering |

---

## Resources

- [Dexie.js Documentation](https://dexie.org/docs/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Storage Limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- See also: `skills/local-storage/SKILL.md` for localStorage patterns
