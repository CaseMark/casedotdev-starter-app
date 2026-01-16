# Authentication Skill

## Purpose

This skill covers authentication, authorization, and access control using Better Auth in Next.js 15+ legal applications. It includes a discovery framework for understanding user requirements before implementation, communication guidelines for non-technical users, and implementation patterns for common legal tech scenarios.

---

## STOP: What Already Exists

**The starter app ships with auth fully pre-configured. DO NOT recreate these files:**

### Pre-configured files (already exist - use them):
- `lib/auth/index.ts` - Server auth config (Better Auth)
- `lib/auth/client.ts` - Client auth hooks (`useSession`, `signIn`, `signOut`)
- `lib/auth/permissions.ts` - Role and permission definitions
- `lib/auth/roles.ts` - Legal role hierarchy
- `app/api/auth/[...all]/route.ts` - Auth API handler
- `app/(auth)/login/page.tsx` - Login page (route group)
- `app/(auth)/signup/page.tsx` - Signup page (route group)
- `components/auth/login-form.tsx` - Login form component
- `components/auth/signup-form.tsx` - Signup form component
- `middleware.ts` - Route protection (public-by-default)

### CRITICAL: Route Groups
Auth pages use Next.js route groups: `app/(auth)/login/page.tsx`
- The `(auth)` folder is a route group - it provides layout without affecting the URL
- The URL is `/login`, NOT `/(auth)/login`
- **NEVER create `app/login/page.tsx`** - it will conflict with the existing route group

---

## Quick Start (Simple Auth)

For simple email/password auth without roles or multi-tenancy:

### 1. Protect routes (edit `middleware.ts`)

```typescript
// Add routes that require login to this array:
const protectedRoutes = [
  "/",           // Protect home page
  "/dashboard",
  "/settings",
];
```

### 2. Check auth state in components

```typescript
"use client";
import { useSession } from "@/lib/auth/client";

export function MyComponent() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;
  
  return <div>Hello, {session.user.name}!</div>;
}
```

### 3. Add sign out button

```typescript
"use client";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

**That's it.** The login/signup pages, API routes, and session management are already configured.

### When to read further

Skip to the Discovery Framework below only if you need:
- Multiple user roles (partner, associate, client, etc.)
- Multi-tenant/organization support
- OAuth providers (Google, Microsoft)
- 2FA requirements
- Custom auth flows

---

## Important: Discovery First

**Do not implement COMPLEX auth without understanding the user's needs.** Auth requirements vary dramatically based on the type of application being built. For anything beyond simple email/password auth, run through the discovery phase before writing any code.

---

## Part 1: Discovery Framework

### Required Questions (Ask Before Implementation)

Before implementing any authentication, gather this information from the user. Explain *why* you're asking in plain language.

#### 1. App Type

> "First, help me understand what you're building. This determines how we set up user accounts."

| App Type | Description | Auth Implications |
|----------|-------------|-------------------|
| **Client Portal** | External users (clients) accessing their matters | Simple auth, possibly invite-only |
| **Internal Tool** | Firm staff only | OAuth with firm's Google/Microsoft, or email/password |
| **Multi-Firm SaaS** | Multiple law firms, each with their own users | Full multi-tenant with organizations |
| **Hybrid** | Both internal staff and external clients | Multiple user types, role separation |

#### 2. User Types

> "Who will be logging into this app? Will everyone have the same access, or do different people need different permissions?"

**If single user type:**
- Simple auth, no roles needed
- Example: "Just our clients viewing their documents"

**If multiple user types, identify them:**
- Use the user's language (they might say "attorneys and clients" not "admin and member")
- Map their terms to roles later
- Example: "Partners who manage everything, associates who work on cases, and clients who can only see their own matters"

#### 3. Organization Structure

> "Is this for one firm, or will multiple separate firms use it? This affects how we keep data separate."

| Structure | Implementation |
|-----------|----------------|
| Single organization | Skip org plugin, simpler setup |
| Multiple organizations | Enable org plugin, each firm is isolated |
| User belongs to multiple orgs | Full org plugin with org switcher |

#### 4. Access Scoping

> "When someone logs in, what should they be able to see? Everything, or only certain things?"

| Scope | Example | Implementation |
|-------|---------|----------------|
| Everything | Internal dashboard - all staff see all data | No ACLs needed |
| By organization | Each firm sees only their data | Org-scoped queries |
| By role | Partners see all, associates see assigned matters | Role-based access |
| By relationship | Clients see only matters they're party to | Matter-level ACLs |

#### 5. Security Requirements

> "Any special security needs? Some legal apps require extra verification steps for compliance."

| Requirement | When Needed | Implementation |
|-------------|-------------|----------------|
| Standard login | Most apps | Email/password or OAuth |
| 2FA required | Sensitive data, compliance | Enable 2FA plugin |
| 2FA for certain roles | Admins only need extra security | Conditional 2FA |
| SSO/SAML | Enterprise clients | Additional config |

---

## Part 1.5: Template Selection

After discovery, select the appropriate schema template based on the user's answers. Templates are located in `lib/auth/templates/`.

### Decision Tree

Ask in order, stop at first "yes":

1. **Do users from different companies need to collaborate in shared spaces?**
   → Use `cross-org-collab.ts`

2. **Is API access the primary interface (not browser sessions)?**
   → Use `api-platform.ts`

3. **Are there fundamentally different user types (e.g., experts + attorneys)?**
   → Use `marketplace.ts`

4. **Will multiple separate companies/firms use this as tenants?**
   → Use `multi-org-saas.ts`

5. **Is this an internal tool for one company with different access levels?**
   → Use `single-org.ts`

6. **None of the above?**
   → Use `b2c.ts`

### Template Summary

| Template | Use Case | Examples |
|----------|----------|----------|
| `b2c.ts` | Consumer apps, no orgs | Will generators, LLC formation, solo tools |
| `single-org.ts` | Internal tools, one company | Practice management, doc management, KM |
| `multi-org-saas.ts` | B2B SaaS with tenant isolation | Clio-style products, CLM, e-discovery |
| `marketplace.ts` | Two-sided platforms | Expert witness marketplaces, court reporter booking |
| `cross-org-collab.ts` | Shared spaces across orgs | Deal rooms, client portals, multi-party discovery |
| `api-platform.ts` | API-first products | Legal AI APIs, court data APIs, e-filing |

### Using a Template

1. Copy the template to your project:
   ```bash
   cp lib/auth/templates/<template>.ts lib/db/schema/auth.ts
   ```

2. Customize for your app:
   - **Roles:** Edit `roleEnum` or `memberRoleEnum` to match your hierarchy
   - **User types:** For marketplace, rename provider/client to your terms
   - **Scopes:** For API platform, define your API permission scopes

3. Generate and run migrations:
   ```bash
   bun drizzle-kit generate
   bun drizzle-kit migrate
   ```

4. Continue to Part 4 (Complete Setup Guide) for better-auth configuration.

See `templates/README.md` for detailed documentation on each template.

---

## Part 2: Communication Guide

### Explaining Auth Concepts

When implementing auth, explain what you're doing in plain language. Legal professionals understand concepts like "access control" and "permissions" - use analogies to their domain.

| Technical Term | Say This Instead | Legal Analogy |
|----------------|------------------|---------------|
| Authentication | "Verifying who someone is" | "Like checking ID at the courthouse door" |
| Authorization | "Controlling what they can access" | "Like case assignment - you work on your matters" |
| Session | "Staying logged in" | "Like being checked in for the day" |
| OAuth/SSO | "Log in with Google/Microsoft" | "Using your firm email to sign in" |
| 2FA/MFA | "Extra security step" | "Like needing both a keycard and PIN" |
| Roles | "Access levels" | "Like Partner vs. Associate vs. Paralegal" |
| Organizations | "Separate workspaces" | "Like different firms or practice groups" |
| ACL | "Access rules" | "Who can see/edit which documents" |

### Example Communication During Implementation

**Starting implementation:**
> "I'm setting up authentication for your app. Here's what that means:
> 
> **Who can access**: Only people with accounts. They'll log in with email and password.
> 
> **What they'll see**: A login page when they first arrive. Once logged in, they stay signed in for a day.
> 
> **Your control**: You'll be able to see who has accounts and revoke access anytime.
> 
> Does this match what you need?"

**After implementation:**
> "Done. Here's what I set up:
> 
> - **Login page** at `/login` - where users sign in
> - **Sign up page** at `/signup` - where new users create accounts
> - **Protected pages** - everything in `/dashboard` requires login
> 
> Want me to show you how to add someone, or how to require different access levels?"

---

## Part 3: Legal Role Definitions

### Standard Legal Roles

When the user describes their access needs, map to these standard legal roles:

```typescript
// lib/auth/roles.ts
export const LegalRoles = {
  OWNER: 'owner',           // Firm owner / Managing partner - full control
  PARTNER: 'partner',       // Equity partner - high access, can manage staff
  ASSOCIATE: 'associate',   // Associate attorney - work on assigned matters
  PARALEGAL: 'paralegal',   // Paralegal - support staff, limited edit access
  STAFF: 'staff',           // Admin/support - operational access
  CLIENT: 'client',         // External client - read-only, own matters only
} as const;

export type LegalRole = typeof LegalRoles[keyof typeof LegalRoles];

// Human-readable descriptions for UI
export const RoleDescriptions: Record<LegalRole, string> = {
  owner: 'Full control over the organization',
  partner: 'Can manage staff and all matters',
  associate: 'Can work on assigned matters',
  paralegal: 'Can support on assigned matters',
  staff: 'Administrative access',
  client: 'Can view their own matters',
};
```

### Role-to-Permission Mapping

```typescript
// lib/auth/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  matter: ["create", "read", "update", "delete", "assign"],
  document: ["create", "read", "update", "delete", "share"],
  billing: ["read", "create", "approve"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  matter: ["create", "read", "update", "delete", "assign"],
  document: ["create", "read", "update", "delete", "share"],
  billing: ["read", "create", "approve"],
});

export const partner = ac.newRole({
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  matter: ["create", "read", "update", "delete", "assign"],
  document: ["create", "read", "update", "delete", "share"],
  billing: ["read", "create", "approve"],
});

export const associate = ac.newRole({
  matter: ["read", "update"],  // Assigned matters only (enforced at query level)
  document: ["create", "read", "update", "delete"],
  billing: ["read"],
});

export const paralegal = ac.newRole({
  matter: ["read"],
  document: ["create", "read", "update"],
  billing: ["read"],
});

export const staff = ac.newRole({
  matter: ["read"],
  document: ["read"],
  billing: ["read", "create"],
});

export const client = ac.newRole({
  matter: ["read"],  // Own matters only (enforced at query level)
  document: ["read"],
});
```

---

## Part 4: Complete Setup Guide

This section walks through the ENTIRE auth setup process step by step. Follow this when setting up auth for a new project.

### Step 1: Install Dependencies

```bash
# Install Better Auth
bun add better-auth

# If using database (recommended for production)
bun add drizzle-orm @neondatabase/serverless
bun add -D drizzle-kit
```

**Explain to user:**
> "I'm installing the authentication system. This will let users create accounts and log in to your app."

### Step 2: Set Up Environment Variables

Create or update `.env.local`:

```env
# Authentication (Required)
BETTER_AUTH_SECRET=  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_APP_NAME=Your App Name

# Database (Required for production)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OAuth Providers (Optional - add if users should log in with Google/Microsoft)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

**Explain to user:**
> "I need to set up some configuration. The most important is the secret key - this keeps your users' sessions secure. You'll also need a database connection string if you're deploying this."
>
> "To generate a secret, run this command in your terminal: `openssl rand -base64 32`"

### Step 3: Set Up Database (Required for Production)

Better Auth needs a database to store users, sessions, and accounts.

#### Option A: Use Better Auth CLI (Simplest)

```bash
# Generate schema and apply to database
bunx @better-auth/cli migrate
```

This automatically creates the required tables in your database.

#### Option B: Use Drizzle Kit (If Already Using Drizzle)

First, create the auth schema file:

```typescript
// lib/db/schema/auth.ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

If using organizations, add these tables:

```typescript
// lib/db/schema/auth.ts (continued)

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

If using 2FA, add:

```typescript
// lib/db/schema/auth.ts (continued)

// Add to user table
export const user = pgTable("user", {
  // ... existing fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
});

export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Then run migrations:

```bash
# Generate migration files from schema
bun drizzle-kit generate

# Apply migrations to database
bun drizzle-kit migrate
```

**Explain to user:**
> "I'm setting up the database tables that store user accounts. This is where login information, sessions, and organization memberships are kept."
>
> "You'll need a PostgreSQL database - I recommend Neon (neon.tech) for a free serverless option. Once you have a database URL, add it to your `.env.local` file."

### Step 4: Create Database Client

```typescript
// lib/db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

### Step 5: Create Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema/*",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Step 6: Verify Setup

After completing steps 1-5, verify everything works:

```bash
# Check database connection and run migrations
bun drizzle-kit migrate

# Start dev server
bun dev
```

Then visit `http://localhost:3000/signup` and create a test account.

**Explain to user:**
> "Let's test that everything is working. I'll start the app and you can try creating an account. If you see the signup page and can create an account, we're all set!"

---

## Part 5: Implementation Patterns

### Environment Variables

```env
# .env.local
BETTER_AUTH_SECRET=  # Generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Project Structure

```
/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts      # Better Auth route handler
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Auth pages layout (no nav)
│   └── (protected)/
│       ├── dashboard/
│       │   └── page.tsx
│       └── layout.tsx            # Protected layout with auth check
├── lib/
│   └── auth/
│       ├── index.ts              # Better Auth server config
│       ├── client.ts             # Better Auth client
│       ├── roles.ts              # Legal role definitions
│       └── permissions.ts        # Access control definitions
├── components/
│   └── auth/
│       ├── login-form.tsx
│       ├── signup-form.tsx
│       ├── sign-out-button.tsx
│       └── org-switcher.tsx
└── middleware.ts                 # Route protection
```

---

## Part 6: Implementation Patterns

### Pattern A: Simple Auth (Single Org, No Roles)

**Use when:** Client portal, internal tool for one firm, simple access needs.

### Server Configuration

```typescript
// lib/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // Refresh every hour
  },
});
```

### Client Configuration

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Database Schema (Drizzle)

```typescript
// lib/db/schema/auth.ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
```

---

## Pattern B: Multi-Tenant with Organizations

**Use when:** SaaS for multiple law firms, each firm needs isolated data.

### Server Configuration

```typescript
// lib/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ac, owner, partner, associate, paralegal, staff, client } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner,
        partner,
        associate,
        paralegal,
        staff,
        client,
      },
      async sendInvitationEmail(data) {
        // TODO: Integrate with case.dev Email API
        const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invite/${data.id}`;
        console.log(`Invite ${data.email} to ${data.organization.name}: ${inviteLink}`);
      },
    }),
  ],
});
```

### Client Configuration

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, owner, partner, associate, paralegal, staff, client } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient({
      ac,
      roles: {
        owner,
        partner,
        associate,
        paralegal,
        staff,
        client,
      },
    }),
  ],
});

export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
  useActiveOrganization,
  useListOrganizations,
} = authClient;
```

### Organization Switcher Component

```typescript
// components/auth/org-switcher.tsx
"use client";

import { authClient } from "@/lib/auth/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrgSwitcher() {
  const { data: orgs } = authClient.useListOrganizations();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const handleOrgChange = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId });
  };

  if (!orgs || orgs.length <= 1) return null;

  return (
    <Select value={activeOrg?.id} onValueChange={handleOrgChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Pattern C: With Two-Factor Authentication

**Use when:** Sensitive data, compliance requirements, handling confidential client information.

### Server Configuration

```typescript
// lib/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  appName: "Your Legal App",  // Shows in authenticator apps
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      // ... org config
    }),
    twoFactor({
      issuer: "Your Legal App",
      otpOptions: {
        async sendOTP({ user, otp }) {
          // TODO: Send via case.dev Email API
          console.log(`2FA code for ${user.email}: ${otp}`);
        },
      },
    }),
  ],
});
```

### Client Configuration

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient({ /* ... */ }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/verify-2fa";
      },
    }),
  ],
});
```

### 2FA Setup Component

```typescript
// components/auth/two-factor-setup.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRCode from "react-qr-code";

export function TwoFactorSetup() {
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");

  const enableTwoFactor = async (password: string) => {
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (data) {
      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes);
    }
  };

  const verifyAndComplete = async () => {
    const { data, error } = await authClient.twoFactor.verifyTotp({
      code: verifyCode,
    });
    if (data) {
      // 2FA is now fully enabled
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account. You'll need an 
          authenticator app like Google Authenticator or 1Password.
        </p>
      </div>

      {totpUri && (
        <>
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode value={totpUri} size={200} />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Scan this code with your authenticator app
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter the 6-digit code from your app
            </label>
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
            />
            <Button onClick={verifyAndComplete}>Verify and Enable</Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Backup Codes</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Save these codes somewhere safe. You can use them to access your 
              account if you lose your phone.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i}>{code}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Pattern D: OAuth Only (Firm Google/Microsoft)

**Use when:** Internal tool where everyone has firm email, simpler than password management.

### Server Configuration

```typescript
// lib/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // No emailAndPassword - OAuth only
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    },
  },
});
```

### OAuth Login Page

```typescript
// app/(auth)/login/page.tsx
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-muted-foreground mt-2">
            Use your firm email to continue
          </p>
        </div>
        
        <form
          action={async () => {
            "use server";
            // Redirect to Google OAuth
          }}
        >
          <Button type="submit" className="w-full" variant="outline">
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
        </form>

        <form
          action={async () => {
            "use server";
            // Redirect to Microsoft OAuth
          }}
        >
          <Button type="submit" className="w-full" variant="outline">
            <MicrosoftIcon className="mr-2 h-4 w-4" />
            Continue with Microsoft
          </Button>
        </form>
      </div>
    </div>
  );
}
```

---

## UI Components

### Login Form

```typescript
// components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Check if 2FA is required
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/verify-2fa");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
```

### Sign Out Button

```typescript
// components/auth/sign-out-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign Out
    </Button>
  );
}
```

### Protected Layout

```typescript
// app/(protected)/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

### Middleware Protection

```typescript
// middleware.ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Vault ACL Integration

When using auth with case.dev Vault, map authenticated users and roles to document access:

```typescript
// lib/vault/with-auth.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAuthenticatedVaultContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated");
  }

  // Get active organization if using orgs
  const activeOrg = session.session.activeOrganizationId;
  
  // Get user's role in the org
  const member = activeOrg 
    ? await auth.api.getActiveMember({ headers: await headers() })
    : null;

  return {
    userId: session.user.id,
    organizationId: activeOrg,
    role: member?.role || "member",
  };
}

// Example: Setting ACLs on document upload
export async function uploadDocumentWithACL(file: File, matterId: string) {
  const { userId, organizationId, role } = await getAuthenticatedVaultContext();

  // Upload to Vault with role-based ACL
  const document = await vault.upload(file, {
    metadata: {
      matterId,
      uploadedBy: userId,
      organizationId,
    },
    acl: {
      // Organization members can read
      [`org:${organizationId}:partner`]: ["read", "write", "delete"],
      [`org:${organizationId}:associate`]: ["read", "write"],
      [`org:${organizationId}:paralegal`]: ["read"],
      // Matter client can read their documents
      [`matter:${matterId}:client`]: ["read"],
    },
  });

  return document;
}
```

---

## Database Migrations

After configuring Better Auth, generate and run migrations:

```bash
# Generate migration files
bunx @better-auth/cli generate

# Apply migrations
bunx @better-auth/cli migrate

# Or if using Drizzle Kit
bun drizzle-kit generate
bun drizzle-kit migrate
```

---

## Common Gotchas

1. **Cookie Domain**: In production, ensure `BETTER_AUTH_URL` matches your domain exactly

2. **Session Not Persisting**: Check that cookies are being set (look in browser dev tools)

3. **OAuth Redirects**: Configure callback URLs in provider dashboards:
   - Google: `https://yourdomain.com/api/auth/callback/google`
   - Microsoft: `https://yourdomain.com/api/auth/callback/microsoft`

4. **Organization Not Active**: After login, call `setActive` to set the user's organization

5. **2FA Not Completing**: User must verify TOTP code after enabling for it to be fully active

6. **Role Permissions Not Working**: Ensure the same `ac` and `roles` are passed to both server and client

---

## Best Practices

1. **Use Environment Variables**: Never hardcode secrets
2. **Database Sessions**: Use database adapter for production (not JWT-only)
3. **Middleware Protection**: Protect routes at middleware level for performance
4. **Type Safety**: Use Better Auth's type exports for full type coverage
5. **Explain as You Go**: Always tell non-technical users what you're building and why
6. **Discovery First**: Don't assume auth requirements - ask the right questions

---

## Troubleshooting

### "BETTER_AUTH_SECRET is not set"

This error means the secret key isn't configured.

**Fix:**
1. Generate a secret: `openssl rand -base64 32`
2. Add to `.env.local`: `BETTER_AUTH_SECRET=your-generated-secret`
3. Restart the dev server

### "Database connection failed"

**Fix:**
1. Check `DATABASE_URL` is set correctly in `.env.local`
2. Verify the database exists and is accessible
3. For Neon, ensure SSL is enabled (`?sslmode=require`)

### "Session not persisting / keeps logging out"

**Causes and fixes:**
1. **Cookie domain mismatch**: Ensure `BETTER_AUTH_URL` matches your actual domain
2. **Missing database adapter**: Sessions need a database to persist
3. **Browser blocking cookies**: Check browser settings or try incognito

### "OAuth redirect error"

**Fix:**
1. Add correct callback URL in OAuth provider dashboard:
   - Google: `https://yourdomain.com/api/auth/callback/google`
   - Microsoft: `https://yourdomain.com/api/auth/callback/microsoft`
2. Ensure client ID and secret are correct
3. Check the domain matches exactly

### "Cannot read organization / role is undefined"

**Fix:**
1. Ensure organization plugin is enabled on both server and client
2. After login, call `setActive` to set the user's organization
3. Check the user is a member of the organization

### "2FA not working"

**Causes and fixes:**
1. **Not verified**: User must scan QR code and enter TOTP code to complete setup
2. **Time sync issue**: TOTP is time-based; ensure device clock is accurate
3. **Missing secret**: Check database has the `two_factor` table with data

### Migrations not running

```bash
# If using Better Auth CLI
bunx @better-auth/cli migrate

# If using Drizzle Kit
bun drizzle-kit migrate

# Check for errors
bun drizzle-kit push --verbose
```

---

## Quick Reference

### Commands

| Command | Purpose |
|---------|---------|
| `bun add better-auth` | Install Better Auth |
| `openssl rand -base64 32` | Generate auth secret |
| `bunx @better-auth/cli migrate` | Create/update auth tables |
| `bunx @better-auth/cli generate` | Generate schema file |
| `bun drizzle-kit generate` | Generate Drizzle migration |
| `bun drizzle-kit migrate` | Apply Drizzle migration |
| `bun drizzle-kit studio` | Open Drizzle Studio (view database) |

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Encryption key (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | App URL (e.g., http://localhost:3000) |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `BETTER_AUTH_APP_NAME` | No | Shows in 2FA authenticator apps |

### Files to Create

| File | Purpose |
|------|---------|
| `lib/auth/index.ts` | Server auth configuration |
| `lib/auth/client.ts` | Client auth hooks and methods |
| `lib/auth/roles.ts` | Legal role definitions |
| `lib/auth/permissions.ts` | Access control rules |
| `app/api/auth/[...all]/route.ts` | Auth API handler |
| `middleware.ts` | Route protection |
| `lib/db/schema/auth.ts` | Database schema (if using Drizzle) |

---

## Resources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Better Auth Organization Plugin](https://better-auth.com/docs/plugins/organization)
- [Better Auth 2FA Plugin](https://better-auth.com/docs/plugins/2fa)
- [Drizzle ORM](https://orm.drizzle.team)
- [Neon Database](https://neon.tech)
