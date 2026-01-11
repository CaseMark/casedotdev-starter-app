# Auth Schema Templates

MIT-licensed, copy-paste ready Drizzle + better-auth schema templates for legal applications.

**Template files are located at:** `docs/auth-schema-templates/`

## Quick Start

1. **Answer the decision tree questions** below to find your template
2. **Copy the template** to your schema directory: `cp docs/auth-schema-templates/<template>.ts lib/db/schema/auth.ts`
3. **Customize** roles, user types, or scopes as needed
4. **Run migrations**: `bun drizzle-kit generate && bun drizzle-kit migrate`
5. **Configure better-auth** following the main SKILL.md

---

## Decision Tree

Ask these questions in order. Stop at the first "yes":

```
1. Do users from different companies need to collaborate in shared spaces?
   └── YES → cross-org-collab.ts
   └── NO  → continue

2. Is API access the primary interface (not browser sessions)?
   └── YES → api-platform.ts
   └── NO  → continue

3. Are there fundamentally different user types (e.g., experts + attorneys)?
   └── YES → marketplace.ts
   └── NO  → continue

4. Will multiple separate companies/firms use this as tenants?
   └── YES → multi-org-saas.ts
   └── NO  → continue

5. Is this an internal tool for one company with different access levels?
   └── YES → single-org.ts
   └── NO  → continue

6. None of the above
   └── b2c.ts
```

---

## Template Overview

| Template | Use Case | Key Tables |
|----------|----------|------------|
| [`b2c.ts`](./b2c.ts) | Consumer apps, no orgs | user, session, account, verification |
| [`single-org.ts`](./single-org.ts) | Internal tools, one company | + role enum on user |
| [`multi-org-saas.ts`](./multi-org-saas.ts) | B2B SaaS with tenants | + organization, member, invitation |
| [`marketplace.ts`](./marketplace.ts) | Two-sided platforms | + userType, providerProfile, clientProfile |
| [`cross-org-collab.ts`](./cross-org-collab.ts) | Shared workspaces | + workspace, workspaceMember |
| [`api-platform.ts`](./api-platform.ts) | API-first products | + apiKey, apiKeyUsage, webhookEndpoint |

---

## Template Details

### b2c.ts — Consumer Apps

**Best for:** Will generators, LLC formation, solo practitioner tools, self-service legal docs

**Features:**
- Basic user accounts with email/password
- OAuth support (Google, Microsoft)
- Session management
- Email verification

**Tables:** `user`, `session`, `account`, `verification`

---

### single-org.ts — Internal Tools

**Best for:** Practice management (self-hosted), internal doc management, KM portals

**Features:**
- Everything in b2c PLUS
- Role-based access control
- Customizable role hierarchy (owner → partner → associate → paralegal → staff)

**Tables:** Same as b2c, with `role` column on user

**Customization:** Edit the `roleEnum` to match your org structure.

---

### multi-org-saas.ts — B2B SaaS

**Best for:** Clio-style products, CLM, e-discovery platforms, legal billing software

**Features:**
- Everything in b2c PLUS
- Organizations (tenants) with complete isolation
- Users can belong to multiple organizations
- Invitation system for team onboarding
- Role per organization (not global)

**Tables:** + `organization`, `member`, `invitation`

**Key concept:** Role is on `member`, not `user`. A user can be an owner in Org A and an associate in Org B.

---

### marketplace.ts — Two-Sided Platforms

**Best for:** Expert witness marketplaces, court reporter booking, legal freelancer platforms

**Features:**
- Everything in multi-org-saas PLUS
- Distinct user types (provider/client/admin)
- Type-specific profiles with different fields
- Provider verification workflow

**Tables:** + `providerProfile`, `clientProfile`, user has `userType`

**Customization:**
- Rename user types (e.g., "expert"/"attorney" instead of "provider"/"client")
- Customize profile fields for your marketplace

---

### cross-org-collab.ts — Shared Workspaces

**Best for:** Deal rooms, client portals, multi-party discovery, joint venture spaces

**Features:**
- Everything in multi-org-saas PLUS
- Workspaces that span organizational boundaries
- Separate permission model for workspace access
- Bulk organization access grants

**Tables:** + `workspace`, `workspaceMember`, `workspaceInvitation`, `organizationWorkspaceAccess`

**Key concept:** Users have two role contexts:
1. Their role in their organization (`member.role`)
2. Their role in each workspace (`workspaceMember.role`)

---

### api-platform.ts — API Products

**Best for:** Legal AI APIs, court data APIs, e-filing integrations, document automation APIs

**Features:**
- Everything in multi-org-saas PLUS
- API key generation and management
- Scoped permissions per key
- Usage tracking for billing
- Test vs production key separation
- Webhook endpoints

**Tables:** + `apiKey`, `apiKeyUsage`, `apiScope`, `webhookEndpoint`

**Key concept:** Browser sessions are for the dashboard; API keys are for programmatic access.

---

## Composability

Templates build on each other:

```
b2c.ts (base)
  ├── single-org.ts (+ roles)
  └── multi-org-saas.ts (+ orgs)
        ├── marketplace.ts (+ user types)
        ├── cross-org-collab.ts (+ workspaces)
        └── api-platform.ts (+ API keys)
```

You can mix concepts. For example:
- **Marketplace with API access:** Start with `marketplace.ts`, add `apiKey` tables from `api-platform.ts`
- **SaaS with workspaces:** Start with `cross-org-collab.ts` (it includes all of multi-org-saas)

---

## After Copying

1. **Review and customize:**
   - Roles for your org structure
   - User types for your marketplace
   - API scopes for your product
   - Profile fields for your users

2. **Generate migrations:**
   ```bash
   bun drizzle-kit generate
   bun drizzle-kit migrate
   ```

3. **Configure better-auth** (see main SKILL.md Part 4-6)

4. **Set up UI components** (login, signup, org switcher as needed)

---

## License

MIT — Copy, modify, and use freely in your legal tech applications.
