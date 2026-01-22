# Database Skill

## Purpose

This skill covers database integration using Neon PostgreSQL and Drizzle ORM in the create-legal-app starter kit.

## Key Concepts

- **Neon**: Serverless PostgreSQL database
- **Drizzle ORM**: TypeScript-first ORM
- **Migrations**: Version-controlled schema changes
- **Type Safety**: Fully typed database queries

## Setup

### Installation

```bash
bun add drizzle-orm @neondatabase/serverless
bun add -D drizzle-kit
```

### Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

## Project Structure

```
/
├── lib/
│   ├── db/
│   │   ├── index.ts          # Database client
│   │   ├── schema.ts         # Database schema
│   │   └── migrations/       # Migration files
│   └── ...
├── drizzle.config.ts         # Drizzle configuration
└── package.json
```

## Configuration

### Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Database Client

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

## Schema Definition

**Naming convention:** use **camelCase property names** mapped to **snake_case DB columns**. Example: `createdAt: timestamp("created_at")`.
For Better Auth tables specifically, always copy the templates from `lib/auth/templates/` and keep the property names camelCase.

### Basic Table

```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Table with Relations

```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
}));

export const casesRelations = relations(cases, ({ one }) => ({
  user: one(users, {
    fields: [cases.userId],
    references: [users.id],
  }),
}));
```

### Enums

```typescript
import { pgTable, text, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['pending', 'active', 'closed']);

export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  status: statusEnum('status').default('pending').notNull(),
});
```

## Type Generation

```typescript
// lib/db/types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cases, users } from './schema';

export type Case = InferSelectModel<typeof cases>;
export type NewCase = InferInsertModel<typeof cases>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
```

## Migrations

### Generate Migration

```bash
# Generate migration from schema changes
bun drizzle-kit generate
```

### Run Migrations

```bash
# Apply migrations to database
bun drizzle-kit migrate
```

### Push Schema (Development)

```bash
# Push schema directly without migrations (dev only)
bun drizzle-kit push
```

### Add to package.json

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Querying Data

### Select All

```typescript
import { db } from '@/lib/db';
import { cases } from '@/lib/db/schema';

export async function getAllCases() {
  return await db.select().from(cases);
}
```

### Select with Conditions

```typescript
import { eq, and, or, gt, lt } from 'drizzle-orm';

// Single condition
const activeCases = await db
  .select()
  .from(cases)
  .where(eq(cases.status, 'active'));

// Multiple conditions (AND)
const userActiveCases = await db
  .select()
  .from(cases)
  .where(
    and(
      eq(cases.userId, userId),
      eq(cases.status, 'active')
    )
  );

// OR conditions
const filteredCases = await db
  .select()
  .from(cases)
  .where(
    or(
      eq(cases.status, 'active'),
      eq(cases.status, 'pending')
    )
  );
```

### Select with Relations

```typescript
const casesWithUsers = await db.query.cases.findMany({
  with: {
    user: true,
  },
});

// Access related data
casesWithUsers.forEach((case) => {
  console.log(case.title, case.user.name);
});
```

### Pagination

```typescript
const page = 1;
const pageSize = 10;

const paginatedCases = await db
  .select()
  .from(cases)
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### Ordering

```typescript
import { desc, asc } from 'drizzle-orm';

const sortedCases = await db
  .select()
  .from(cases)
  .orderBy(desc(cases.createdAt));
```

## Inserting Data

### Insert Single

```typescript
const newCase = await db
  .insert(cases)
  .values({
    title: 'New Case',
    description: 'Case description',
    userId: 'user-id',
  })
  .returning();

console.log(newCase[0]);
```

### Insert Multiple

```typescript
const newCases = await db
  .insert(cases)
  .values([
    { title: 'Case 1', userId: 'user-id' },
    { title: 'Case 2', userId: 'user-id' },
  ])
  .returning();
```

## Updating Data

```typescript
const updated = await db
  .update(cases)
  .set({
    status: 'active',
    updatedAt: new Date(),
  })
  .where(eq(cases.id, caseId))
  .returning();
```

## Deleting Data

```typescript
const deleted = await db
  .delete(cases)
  .where(eq(cases.id, caseId))
  .returning();
```

## Transactions

```typescript
import { db } from '@/lib/db';

await db.transaction(async (tx) => {
  // Create user
  const [user] = await tx
    .insert(users)
    .values({ email: 'user@example.com', name: 'User' })
    .returning();
  
  // Create case for user
  await tx
    .insert(cases)
    .values({ title: 'First Case', userId: user.id });
});
```

## Advanced Queries

### Count

```typescript
import { count } from 'drizzle-orm';

const [{ value: total }] = await db
  .select({ value: count() })
  .from(cases);
```

### Aggregations

```typescript
import { count, avg, sum } from 'drizzle-orm';

const stats = await db
  .select({
    total: count(),
    averageValue: avg(cases.value),
    totalValue: sum(cases.value),
  })
  .from(cases);
```

### Joins

```typescript
const result = await db
  .select()
  .from(cases)
  .innerJoin(users, eq(cases.userId, users.id));
```

## Best Practices

1. **Use Transactions**: For related operations that must succeed together
2. **Type Safety**: Use InferSelectModel and InferInsertModel
3. **Migrations**: Always use migrations in production
4. **Indexes**: Add indexes for frequently queried columns
5. **Relations**: Define relations for easy data fetching
6. **Environment Variables**: Keep DATABASE_URL secret
7. **Connection Pooling**: Neon handles this automatically

## Common Patterns

### Create with Validation

```typescript
'use server';

import { db } from '@/lib/db';
import { cases } from '@/lib/db/schema';
import type { NewCase } from '@/lib/db/types';

export async function createCase(data: NewCase) {
  // Validate
  if (!data.title) {
    throw new Error('Title is required');
  }
  
  // Insert
  const [newCase] = await db
    .insert(cases)
    .values(data)
    .returning();
  
  return newCase;
}
```

### Update with Optimistic Locking

```typescript
export async function updateCase(id: string, data: Partial<Case>) {
  const [updated] = await db
    .update(cases)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(cases.id, id))
    .returning();
  
  if (!updated) {
    throw new Error('Case not found');
  }
  
  return updated;
}
```

### Soft Delete

```typescript
export const cases = pgTable('cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  deletedAt: timestamp('deleted_at'),
});

export async function softDelete(id: string) {
  return await db
    .update(cases)
    .set({ deletedAt: new Date() })
    .where(eq(cases.id, id))
    .returning();
}

export async function getActiveCases() {
  return await db
    .select()
    .from(cases)
    .where(eq(cases.deletedAt, null));
}
```

## Gotchas

- **Neon Connection**: Neon uses HTTP, not WebSocket connections
- **Returning**: Always use .returning() to get inserted/updated data
- **Null vs Undefined**: Use null for SQL NULL, undefined is ignored
- **Timestamps**: Use timestamp() for dates, not varchar
- **UUIDs**: Use uuid() for IDs, better than serial for distributed systems
- **Migrations**: Can't undo migrations easily, test thoroughly first

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
