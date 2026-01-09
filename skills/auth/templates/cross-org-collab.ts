/**
 * Cross-Organization Collaboration Auth Schema Template
 * 
 * Use this template when users from different organizations need to
 * collaborate in shared spaces. Builds on multi-org-saas with the
 * concept of "workspaces" that span organizational boundaries.
 * 
 * Examples:
 * - Deal rooms (multiple firms working on a transaction)
 * - Client portals (law firm + client company collaboration)
 * - Multi-party discovery platforms
 * - Joint venture collaboration spaces
 * - Litigation war rooms with multiple parties
 * 
 * Features:
 * - Everything in multi-org-saas.ts PLUS:
 * - Workspaces that can include members from multiple orgs
 * - Workspace-level permissions separate from org roles
 * - Flexible access control for cross-org collaboration
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Run: bun drizzle-kit generate
 * 3. Run: bun drizzle-kit migrate
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
 * Roles within a shared workspace
 * 
 * These are separate from org roles because cross-org collaboration
 * requires its own permission model:
 * - admin: Can manage workspace, invite others, control access
 * - editor: Can create and modify content
 * - commenter: Can view and comment, but not edit
 * - viewer: Read-only access
 */
export const workspaceRoleEnum = pgEnum("workspace_role", [
  "admin",
  "editor", 
  "commenter",
  "viewer",
]);

/**
 * Workspace types for different collaboration patterns
 */
export const workspaceTypeEnum = pgEnum("workspace_type", [
  "deal_room",      // M&A, financing transactions
  "discovery",      // E-discovery, document review
  "client_portal",  // Firm-client collaboration
  "matter",         // General matter workspace
  "project",        // Internal project space
]);

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
 * Users table
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
 * Sessions table
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
  activeOrganizationId: text("active_organization_id").references(
    () => organization.id,
    { onDelete: "set null" }
  ),
  // Track active workspace for quick context switching
  activeWorkspaceId: text("active_workspace_id").references(
    () => workspace.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Accounts table
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
 * Verification table
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
// ORGANIZATION TABLES
// =============================================================================

/**
 * Organizations - each law firm, company, or entity
 */
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Members - user membership in organizations
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
 * Invitations - org-level invitations
 */
export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("staff"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// WORKSPACE TABLES (Cross-Org Collaboration)
// =============================================================================

/**
 * Workspaces - shared collaboration spaces
 * 
 * A workspace can include members from multiple organizations.
 * It has an "owning" organization but grants access to external parties.
 * 
 * Example: A deal room for an M&A transaction might include:
 * - Seller's counsel (org A)
 * - Buyer's counsel (org B)  
 * - Investment bank (org C)
 * - The companies themselves (orgs D & E)
 */
export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  
  // The organization that created/owns this workspace
  // They have ultimate control and pay for it
  ownerOrganizationId: text("owner_organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // Type of workspace for UI/feature customization
  type: workspaceTypeEnum("type").notNull().default("matter"),
  
  // Workspace-level settings as JSON
  // e.g., { "watermarkEnabled": true, "downloadRestricted": true }
  settings: text("settings"),
  
  // Lifecycle
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Workspace Members - who has access to a workspace
 * 
 * This is the key table for cross-org collaboration:
 * - Links users to workspaces with specific roles
 * - Tracks which org they're representing in this workspace
 * - Enables fine-grained access control per workspace
 */
export const workspaceMember = pgTable("workspace_member", {
  id: text("id").primaryKey(),
  
  // The user
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // The workspace they're a member of
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  
  // Which organization this user represents in this workspace
  // This is important for conflict checks and access logs
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // Their role in THIS workspace (separate from org role)
  role: workspaceRoleEnum("role").notNull().default("viewer"),
  
  // Track who added them
  invitedById: text("invited_by_id").references(() => user.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Workspace Invitations - pending invites to join a workspace
 * 
 * Invitations can be sent to:
 * - Specific email addresses (external parties)
 * - Existing users by userId
 * - Entire organizations (bulk invite)
 */
export const workspaceInvitation = pgTable("workspace_invitation", {
  id: text("id").primaryKey(),
  
  // Target of invitation
  email: text("email").notNull(),
  
  // The workspace
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  
  // Who sent it
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // What role they'll have when they accept
  role: workspaceRoleEnum("role").notNull().default("viewer"),
  
  // Optional: Pre-assign to an organization
  // (useful when inviting known external counsel)
  targetOrganizationId: text("target_organization_id").references(
    () => organization.id
  ),
  
  // Invitation lifecycle
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Optional message to include in invitation
  message: text("message"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Organization Workspace Access - bulk org access to workspaces
 * 
 * Instead of inviting individuals, grant an entire organization
 * access to a workspace with a default role.
 */
export const organizationWorkspaceAccess = pgTable("organization_workspace_access", {
  id: text("id").primaryKey(),
  
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  
  // Default role for org members accessing this workspace
  defaultRole: workspaceRoleEnum("default_role").notNull().default("viewer"),
  
  // Who granted this access
  grantedById: text("granted_by_id")
    .notNull()
    .references(() => user.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// HELPER TYPES
// =============================================================================

export type MemberRole = "owner" | "partner" | "associate" | "paralegal" | "staff" | "client";
export type WorkspaceRole = "admin" | "editor" | "commenter" | "viewer";
export type WorkspaceType = "deal_room" | "discovery" | "client_portal" | "matter" | "project";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

/**
 * Workspace role hierarchy
 */
export const WORKSPACE_ROLE_HIERARCHY: WorkspaceRole[] = [
  "viewer",
  "commenter",
  "editor",
  "admin",
];
