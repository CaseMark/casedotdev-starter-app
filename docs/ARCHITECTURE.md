# Contract Clause Comparator - Architecture Summary

## Overview

This document describes how the [contract-clause-comparator](https://github.com/CaseMark/contract-clause-comparator) was ported to the [casedotdev-starter-app](https://github.com/CaseMark/casedotdev-starter-app) architecture with a **fully client-side, serverless approach** using IndexedDB.

---

## Porting Method

### 1. Storage Layer Replacement

**Original**: Server-side PostgreSQL database
**New**: Client-side IndexedDB + localStorage

| Data Type | Storage | Implementation |
|-----------|---------|----------------|
| Contracts | IndexedDB | `lib/storage/db.ts` → `contracts` table |
| Clauses | IndexedDB | `lib/storage/db.ts` → `clauses` table |
| Comparisons | IndexedDB | `lib/storage/db.ts` → `comparisons` table |
| Clause Matches | IndexedDB | `lib/storage/db.ts` → `clauseMatches` table |
| Users & Sessions | IndexedDB | `lib/storage/db.ts` → `users`, `sessions` tables |
| Active State | localStorage | `lib/storage/local-storage-helpers.ts` |

**Key Files:**
- `lib/storage/db.ts` - Dexie.js IndexedDB schema
- `lib/storage/index.ts` - CRUD operations
- `lib/storage/local-storage-helpers.ts` - localStorage utilities

### 2. Auth System Replacement

**Original**: Better Auth with PostgreSQL
**New**: Client-side auth with IndexedDB

The Better Auth dependency was replaced with a custom client-side implementation that mirrors its API surface:

| Better Auth | IndexedDB Auth | File |
|-------------|----------------|------|
| `useSession()` | `useSession()` | `lib/auth/auth-context.tsx` |
| `signIn.email()` | `signIn.email()` | `lib/auth/local-auth.ts` |
| `signUp.email()` | `signUp.email()` | `lib/auth/local-auth.ts` |
| `signOut()` | `signOut()` | `lib/auth/local-auth.ts` |
| `useActiveOrganization()` | `useActiveOrganization()` | `lib/auth/auth-context.tsx` |

### 3. API Routes Adaptation

**Original**: Server-side session validation via Better Auth
**New**: Client passes userId in request body

```typescript
// Before (Better Auth)
const session = await auth.api.getSession({ headers: await headers() });
const userId = session.user.id;

// After (Client-side auth)
const userId = body.userId || 'anonymous';
```

### 4. Case.dev Integration

The Case.dev SDK was replaced with a direct HTTP client for LLM operations:

**File**: `lib/case-dev/client.ts`

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| `extractClauses()` | `/llm/v1/chat/completions` | Extract clauses from contract text |
| `matchClauses()` | `/llm/v1/chat/completions` | Semantically match clauses |
| `analyzeRisk()` | `/llm/v1/chat/completions` | Assess risk for each match |
| `generateExecutiveSummary()` | `/llm/v1/chat/completions` | Generate summary |

---

## How Auth Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   localStorage  │    │         IndexedDB             │   │
│  │                 │    │                               │   │
│  │ ccc:session     │    │ users (id, email, pwdHash)   │   │
│  │ {sessionId,     │◄──►│ sessions (id, userId, token) │   │
│  │  token,         │    │ organizations (id, name)     │   │
│  │  activeOrgId}   │    │ members (userId, orgId)      │   │
│  └─────────────────┘    └──────────────────────────────┘   │
│           ▲                          ▲                      │
│           │                          │                      │
│  ┌────────┴──────────────────────────┴─────────────────┐   │
│  │              AuthProvider (React Context)            │   │
│  │                                                      │   │
│  │  • useSession() - get current user/session          │   │
│  │  • signIn.email() - validate & create session       │   │
│  │  • signUp.email() - create user & session           │   │
│  │  • signOut() - clear session                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Flow: Sign Up

1. User enters email, password, name
2. `signUp.email()` is called
3. Check if email exists in IndexedDB `users` table
4. Hash password with SHA-256 (browser crypto API)
5. Create user record in IndexedDB
6. Create session record with random token
7. Store session reference in localStorage
8. Return user & session to component

### Flow: Sign In

1. User enters email, password
2. `signIn.email()` is called
3. Find user by email in IndexedDB
4. Hash provided password, compare with stored hash
5. Create new session record
6. Store session reference in localStorage
7. Return user & session to component

### Flow: Session Check

1. `useSession()` hook mounts
2. Read session reference from localStorage
3. Fetch session from IndexedDB by ID
4. Verify token matches and not expired
5. Fetch user from IndexedDB
6. Return user & session (or null if invalid)

### Flow: Sign Out

1. `signOut()` is called
2. Delete session from IndexedDB
3. Clear localStorage session reference
4. Dispatch storage event for multi-tab sync

### User Isolation

All app data queries include user ID:

```typescript
// Contracts scoped by uploadedBy
db.contracts.where('uploadedBy').equals(userId).toArray()

// Comparisons scoped by createdBy
db.comparisons.where('createdBy').equals(userId).toArray()
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

## File Structure

```
lib/
├── auth/
│   ├── client.ts            # Re-exports (API surface)
│   ├── auth-context.tsx     # React context & hooks
│   ├── local-auth.ts        # IndexedDB auth operations
│   ├── permissions.ts       # Role definitions (kept for compatibility)
│   └── roles.ts             # Role types
├── storage/
│   ├── db.ts                # Dexie IndexedDB schema
│   ├── index.ts             # CRUD operations
│   └── local-storage-helpers.ts
├── case-dev/
│   └── client.ts            # Case.dev HTTP client
├── contracts/
│   ├── utils.ts             # Risk scoring, formatting
│   └── validations.ts       # Zod schemas
└── contexts/
    └── comparison-context.tsx

app/
├── layout.tsx               # Root layout with Providers
├── (protected)/
│   ├── layout.tsx           # Auth-protected layout
│   ├── dashboard/page.tsx   # Comparison history
│   └── compare/
│       ├── page.tsx         # New comparison
│       └── [id]/page.tsx    # Comparison results
├── login/page.tsx
├── signup/page.tsx
└── api/contracts/compare/
    ├── route.ts             # POST - create comparison
    └── [id]/route.ts        # GET - status/result

components/
├── providers.tsx            # AuthProvider wrapper
├── auth/
│   ├── login-form.tsx
│   └── signup-form.tsx
└── comparison/
    ├── clause-list.tsx
    ├── clause-item.tsx
    ├── executive-summary.tsx
    └── risk-badge.tsx
```

---

## Key Differences from Original

| Aspect | Original | This Port |
|--------|----------|-----------|
| Database | PostgreSQL | IndexedDB |
| Auth | Better Auth + DB | Client-side IndexedDB |
| Session validation | Server-side | Client-side |
| User isolation | DB queries | IndexedDB queries |
| Data persistence | Server | Browser |
| Cross-device sync | Yes | No |
| Offline support | No | Yes |

---

## Environment Variables

Only one required for comparison functionality:

```env
CASEDEV_API_KEY=your-api-key
```

No database URL needed - everything is stored in the browser.
