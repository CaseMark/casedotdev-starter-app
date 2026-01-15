# Client-Side Authentication Architecture

This document explains how authentication and authorization work in the Contract Clause Comparator, how data is stored and secured, and how to manage/clear auth data across different environments.

---

## Overview

This application uses a **fully client-side authentication system** that stores all auth data in the browser using IndexedDB and localStorage. This approach mirrors the Better Auth API surface but runs entirely in the browser, making it ideal for demos and local development.

**⚠️ Security Note**: This is designed for demos and local use. For production, use Better Auth with a real database (see `skills/auth/SKILL.md`).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐   ┌─────────────────────────────────────────────┐ │
│  │     localStorage    │   │              IndexedDB                      │ │
│  │                     │   │         (ContractComparator DB)             │ │
│  │  ccc:session        │   │                                             │ │
│  │  {                  │   │  ┌─────────────────────────────────────┐   │ │
│  │    sessionId,       │◄──┼──┤ users                                │   │ │
│  │    token,           │   │  │  • id (primary key)                 │   │ │
│  │    activeOrgId      │   │  │  • email (indexed, unique)          │   │ │
│  │  }                  │   │  │  • name                             │   │ │
│  │                     │   │  │  • passwordHash (SHA-256)           │   │ │
│  └─────────────────────┘   │  │  • createdAt, updatedAt             │   │ │
│                            │  └─────────────────────────────────────┘   │ │
│  ┌─────────────────────┐   │                                             │ │
│  │      Cookie         │   │  ┌─────────────────────────────────────┐   │ │
│  │                     │   │  │ sessions                             │   │ │
│  │  ccc:local-session  │◄──┼──┤  • id (primary key)                 │   │ │
│  │  (signals auth to   │   │  │  • userId (indexed)                 │   │ │
│  │   middleware)       │   │  │  • token                            │   │ │
│  └─────────────────────┘   │  │  • expiresAt                        │   │ │
│                            │  └─────────────────────────────────────┘   │ │
│                            │                                             │ │
│                            │  ┌─────────────────────────────────────┐   │ │
│                            │  │ organizations                        │   │ │
│                            │  │  • id, name, slug, logo             │   │ │
│                            │  └─────────────────────────────────────┘   │ │
│                            │                                             │ │
│                            │  ┌─────────────────────────────────────┐   │ │
│                            │  │ members                              │   │ │
│                            │  │  • id, userId, organizationId, role │   │ │
│                            │  └─────────────────────────────────────┘   │ │
│                            └─────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    React Auth Context                                 │  │
│  │                                                                       │  │
│  │  Hooks:                    Methods:                                  │  │
│  │  • useSession()            • signIn.email({ email, password })       │  │
│  │  • useActiveOrganization() • signUp.email({ email, password, name }) │  │
│  │  • useListOrganizations()  • signOut()                               │  │
│  │                            • organization.create()                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                           │                                 │
└───────────────────────────────────────────┼─────────────────────────────────┘
                                            │
                                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Next.js)                                 │
│                                                                            │
│  middleware.ts:                                                            │
│  • Checks for cookie: better-auth.session_token (production)              │
│  • Checks for cookie: ccc:local-session (local/demo mode)                 │
│  • Redirects to /login if neither cookie exists                           │
│                                                                            │
│  Protected routes: /dashboard, /compare/*                                  │
│  Public routes: /, /login, /signup, /api/auth/*                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Three-Layer Session Storage

The auth system uses three storage mechanisms that work together:

| Layer | Storage | Purpose | Accessible By |
|-------|---------|---------|---------------|
| **1. Source of Truth** | IndexedDB | Full user & session data | Client-side JavaScript |
| **2. Quick Reference** | localStorage | Session ID & token for fast lookups | Client-side JavaScript |
| **3. Middleware Signal** | Cookie | Tells server a session exists | Server middleware |

### Why Three Layers?

1. **IndexedDB** stores the complete auth data (users, sessions, password hashes) in a structured database that survives browser restarts.

2. **localStorage** holds a lightweight reference to the current session, enabling fast session checks without querying IndexedDB on every page load.

3. **Cookie** is needed because Next.js middleware runs on the server and cannot access localStorage or IndexedDB. The cookie signals "a local session exists" to prevent redirect loops.

---

## Authentication Flows

### Sign Up Flow

```
User → SignupForm → signUp.email() → local-auth.ts
                                          │
                                          ▼
                                   ┌─────────────────┐
                                   │ 1. Check email  │
                                   │    not exists   │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 2. Hash password│
                                   │    (SHA-256)    │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 3. Store user   │
                                   │    in IndexedDB │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 4. Create       │
                                   │    session      │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 5. Set localStorage│
                                   │    + cookie     │
                                   └────────┬────────┘
                                            │
                                            ▼
                                   Navigate to /dashboard
```

### Sign In Flow

```
User → LoginForm → signIn.email() → local-auth.ts
                                          │
                                          ▼
                                   ┌─────────────────┐
                                   │ 1. Find user by │
                                   │    email        │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 2. Hash password│
                                   │    & compare    │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 3. Create new   │
                                   │    session      │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │ 4. Set localStorage│
                                   │    + cookie     │
                                   └────────┬────────┘
                                            │
                                            ▼
                                   Navigate to /dashboard
```

### Session Validation Flow (on page load)

```
Page Load → AuthProvider → getSession()
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 1. Read localStorage │
                    │    (sessionId, token)│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ 2. Fetch session    │
                    │    from IndexedDB   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ 3. Verify:          │
                    │    • Token matches  │
                    │    • Not expired    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ 4. Fetch user from  │
                    │    IndexedDB        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ 5. Refresh cookie   │
                    │    expiry           │
                    └──────────┬──────────┘
                               │
                               ▼
                    Return { user, session }
```

---

## Data Security (Demo Mode)

| Aspect | Implementation | Security Level |
|--------|----------------|----------------|
| **Password Hashing** | SHA-256 via Web Crypto API | ⚠️ Weak (use bcrypt/argon2 in production) |
| **Session Tokens** | 32 random bytes (hex encoded) | ✅ Cryptographically secure |
| **Data Encryption** | None (plain IndexedDB) | ⚠️ Accessible via DevTools |
| **Server Validation** | None (client-side only) | ⚠️ Bypassable |
| **XSS Protection** | React's default escaping | ✅ Good |
| **CSRF Protection** | Same-origin only | ✅ Adequate for demo |

### What This Means

- **Passwords are hashed** before storage, but SHA-256 is fast and vulnerable to brute force. Production should use bcrypt or argon2.
- **All data is visible** in browser DevTools → Application → IndexedDB. Anyone with physical access to the browser can see it.
- **No server validation** means a malicious user could modify localStorage/IndexedDB to bypass auth. This is fine for demos but unacceptable for production.

---

## Clearing IndexedDB and Auth Data

Since all auth data lives in the browser, there are multiple ways to clear it depending on your access level.

### Method 1: In-App Dev Tools (Recommended for Development)

Use the exported functions from `@/lib/auth/client` in your browser console:

```javascript
// Open browser DevTools Console (F12 or Cmd+Option+I)

// 1. See all users stored in IndexedDB
const { listAllUsers } = await import('@/lib/auth/client');
console.table(await listAllUsers());

// 2. Check session sync status
const { validateSessionSync } = await import('@/lib/auth/client');
console.log(await validateSessionSync());

// 3. Delete a specific user (and their sessions)
const { deleteUserByEmail } = await import('@/lib/auth/client');
await deleteUserByEmail('user@example.com');

// 4. Clear all sessions (logs everyone out, keeps user accounts)
const { clearAllSessions } = await import('@/lib/auth/client');
await clearAllSessions();

// 5. NUCLEAR: Clear ALL auth data (users, sessions, orgs, memberships)
const { clearAllAuthData } = await import('@/lib/auth/client');
await clearAllAuthData();
```

### Method 2: Browser DevTools (Manual)

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. Expand **IndexedDB** in the sidebar
4. Find **ContractComparator** database
5. Right-click and select **Delete database**
6. Also clear:
   - **Local Storage** → Remove `ccc:session`
   - **Cookies** → Remove `ccc:local-session`

### Method 3: Browser Settings

**Chrome:**
1. Settings → Privacy and security → Clear browsing data
2. Select "Cookies and other site data"
3. Click "Clear data"

**Firefox:**
1. Settings → Privacy & Security → Cookies and Site Data
2. Click "Clear Data"
3. Check "Cookies and Site Data"

**Safari:**
1. Develop menu → Empty Caches
2. Safari → Clear History (includes website data)

### Method 4: Programmatic Reset (in your code)

```typescript
// In a React component or utility file
import { resetDatabase } from '@/lib/storage/db';
import { clearAllAuthData } from '@/lib/auth/client';

async function fullReset() {
  // Clear all auth data
  await clearAllAuthData();
  
  // Reset the entire database (including contracts, comparisons, etc.)
  await resetDatabase();
  
  // Reload the page
  window.location.href = '/login';
}
```

### Method 5: From Terminal (for automated testing)

IndexedDB is browser-only, so you cannot directly clear it from a terminal. However, you can:

**Option A: Use Playwright/Puppeteer in a script**

```typescript
// scripts/clear-indexeddb.ts
import { chromium } from 'playwright';

async function clearBrowserData() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000');
  
  // Clear IndexedDB
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    localStorage.clear();
  });
  
  await browser.close();
  console.log('Browser data cleared');
}

clearBrowserData();
```

**Option B: Delete browser profile data directory**

```bash
# Chrome (macOS)
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/IndexedDB/*contract*

# Chrome (Linux)
rm -rf ~/.config/google-chrome/Default/IndexedDB/*contract*

# Firefox (macOS)
rm -rf ~/Library/Application\ Support/Firefox/Profiles/*.default*/storage/default/*localhost*
```

⚠️ **Warning**: This affects all sites, not just your app. Use with caution.

**Option C: Use a test-specific browser profile**

```bash
# Start Chrome with a temporary profile
google-chrome --user-data-dir=/tmp/test-chrome-profile http://localhost:3000

# When done, delete the profile
rm -rf /tmp/test-chrome-profile
```

---

## Multi-Tab Synchronization

The auth system supports multi-tab sync via `StorageEvent`:

```typescript
// When auth state changes, dispatch event
window.dispatchEvent(new StorageEvent('storage', {
  key: 'ccc:session',
}));

// All tabs listen for this event
window.addEventListener('storage', (e) => {
  if (e.key === 'ccc:session') {
    // Reload session state
  }
});
```

This means:
- **Sign out in one tab** → All tabs are signed out
- **Sign in in one tab** → Other tabs pick up the session on next focus

---

## Troubleshooting

### "Login redirects back to login page"

**Cause**: Cookie not set or expired.

**Fix**:
```javascript
const { validateSessionSync } = await import('@/lib/auth/client');
const status = await validateSessionSync();
console.log(status);
// Look at status.details for the issue
```

Then run:
```javascript
const { clearAllSessions } = await import('@/lib/auth/client');
await clearAllSessions();
location.reload();
```

### "Email already registered" but you want to use it

**Fix**:
```javascript
const { deleteUserByEmail } = await import('@/lib/auth/client');
await deleteUserByEmail('your@email.com');
```

### Session appears valid but middleware redirects

**Cause**: Cookie expired or not set.

**Fix**: The `getSession()` function now refreshes the cookie automatically. Clear sessions and log in again:

```javascript
const { clearAllSessions } = await import('@/lib/auth/client');
await clearAllSessions();
location.reload();
```

### Need to test with multiple users

1. Use different browsers (Chrome, Firefox, Safari)
2. Use Chrome profiles (each profile has separate IndexedDB)
3. Use incognito/private windows

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/auth/local-auth.ts` | Core auth operations (signIn, signUp, signOut, session management) |
| `lib/auth/auth-context.tsx` | React context and hooks (useSession, useActiveOrganization) |
| `lib/auth/client.ts` | Exports and authClient compatibility object |
| `lib/storage/db.ts` | Dexie.js IndexedDB schema definition |
| `middleware.ts` | Route protection (checks for session cookies) |

---

## Migrating to Production

When ready to deploy with real authentication:

1. **Set up a database** (Neon, Supabase, PlanetScale)
2. **Configure Better Auth** with database adapter
3. **Update middleware** to only check `better-auth.session_token`
4. **Remove** the `ccc:local-session` cookie logic

See `skills/auth/SKILL.md` for complete Better Auth setup instructions.

