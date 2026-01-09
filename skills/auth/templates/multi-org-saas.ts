/**
 * Multi-Organization SaaS Auth Schema Template
 * 
 * Use this template for B2B SaaS products where multiple law firms or
 * companies sign up as separate tenants with complete data isolation.
 * 
 * Examples:
 * - Practice management SaaS (like Clio)
 * - Contract lifecycle management (CLM) platforms
 * - E-discovery platforms
 * - Legal billing software
 * - Case management systems
 * 
 * Features:
 * - Everything in b2c.ts PLUS:
 * - Organizations (tenants) with complete isolation
 * - Organization membership with roles
 * - Invitation system for adding team members
 * - Users can belong to multiple organizations
 * 
 * Compatible with: better-auth organization plugin
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Run: bun drizzle-kit generate
 * 3. Run: bun drizzle-kit migrate
 * 4. Enable organization plugin in better-auth config
 * 
 * @license MIT
 * @see https://better-auth.com/docs/plugins/organization
 */

import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Member roles within an organization
 * 
 * These map to better-auth's organization plugin role system.
 * Customize to match your legal app's hierarchy:
 * - owner: Firm admin, billing, can delete org
 * - partner: Senior attorney, can manage members
 * - associate: Attorney with standard access
 * - paralegal: Support staff, limited permissions
 * - staff: Administrative, operational access
 * - client: External client with read-only access (optional)
 */
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "partner",
  "associate",
  "paralegal",
  "staff",
  "client",
]);

/**
 * Invitation status tracking
 */
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

// =============================================================================
// CORE TABLES (Required by better-auth)
// =============================================================================

/**
 * Users table - stores basic user information
 * 
 * Note: Role is NOT on user directly. Users have roles PER ORGANIZATION
 * via the member table. A user can be an owner in one org and associate
 * in another.
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Sessions table - tracks active login sessions
 * 
 * Extended to track the active organization for the session.
 * This enables org-scoped queries without constant org switching.
 */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Active organization for this session
  // Set via organization.setActive() in better-auth
  activeOrganizationId: text("active_organization_id").references(
    () => organization.id,
    { onDelete: "set null" }
  ),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Accounts table - links users to auth providers
 */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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

/**
 * Verification table - email verification and password reset tokens
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// =============================================================================
// ORGANIZATION TABLES (Required by better-auth organization plugin)
// =============================================================================

/**
 * Organizations table - represents a tenant (law firm, company, etc.)
 * 
 * Each organization is a completely isolated workspace. All business data
 * (matters, documents, etc.) should reference organizationId for isolation.
 */
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  logo: text("logo"),
  
  // Store additional org settings as JSON
  // e.g., { "timezone": "America/New_York", "billingEmail": "..." }
  metadata: text("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Members table - links users to organizations with roles
 * 
 * This is the join table that implements multi-tenancy:
 * - A user can belong to multiple organizations
 * - Each membership has a specific role
 * - Deleting a user cascades to remove all memberships
 * - Deleting an org cascades to remove all memberships
 */
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Invitations table - pending invites to join an organization
 * 
 * Workflow:
 * 1. Owner/admin creates invitation with email and role
 * 2. System sends email with invite link
 * 3. User clicks link, creates account (or logs in if existing)
 * 4. Invitation is marked accepted, member record created
 */
export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  
  // Who sent the invite
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Which org they're being invited to
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // What role they'll have when they accept
  role: memberRoleEnum("role").notNull().default("staff"),
  
  // Invitation lifecycle
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// HELPER TYPES
// =============================================================================

export type MemberRole = "owner" | "partner" | "associate" | "paralegal" | "staff" | "client";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

/**
 * Role hierarchy for permission checks
 */
export const ROLE_HIERARCHY: MemberRole[] = [
  "client",
  "staff",
  "paralegal",
  "associate",
  "partner",
  "owner",
];
