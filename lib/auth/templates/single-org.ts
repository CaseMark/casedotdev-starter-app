/**
 * Single Organization Auth Schema Template
 * 
 * Use this template for internal tools where all users belong to one company
 * or firm. Adds role-based access control without multi-tenancy complexity.
 * 
 * Examples:
 * - Law firm practice management (self-hosted)
 * - Internal document management system
 * - Knowledge management portal
 * - Case tracking for a single firm
 * - Internal compliance dashboard
 * 
 * Features:
 * - Everything in b2c.ts PLUS:
 * - Role-based access control (Partner, Associate, Paralegal, Staff)
 * - No organization switching (single org implied)
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Customize the Role enum for your access levels
 * 3. Run: bun drizzle-kit generate
 * 4. Run: bun drizzle-kit migrate
 * 
 * @license MIT
 * @see https://better-auth.com/docs
 */

import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

// =============================================================================
// ROLE ENUM
// Customize these roles to match your organization's structure
// =============================================================================

/**
 * User roles within the organization
 * 
 * Customize these to match your firm's hierarchy:
 * - owner: Full system access, can manage all users and settings
 * - partner: High-level access, can manage cases and staff
 * - associate: Standard attorney access, works on assigned matters
 * - paralegal: Support staff, limited edit access
 * - staff: Administrative staff, operational access
 * 
 * Add or remove roles as needed. Common additions:
 * - 'of_counsel' for contract attorneys
 * - 'intern' for law students
 * - 'it_admin' for technical staff without legal access
 */
export const roleEnum = pgEnum("user_role", [
  "owner",
  "partner",
  "associate",
  "paralegal",
  "staff",
]);

// =============================================================================
// CORE TABLES (Required by better-auth)
// =============================================================================

/**
 * Users table - stores user information with role assignment
 * 
 * Extended from b2c.ts to include:
 * - role: The user's access level in the organization
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  
  // Role-based access control
  role: roleEnum("role").notNull().default("staff"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Sessions table - tracks active login sessions
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
// HELPER TYPES
// Export these for use in your application code
// =============================================================================

/**
 * TypeScript type for user roles
 * Use this in your application code for type safety
 * 
 * Example:
 * ```ts
 * import { UserRole } from "@/lib/db/schema/auth";
 * 
 * function canEditMatter(role: UserRole): boolean {
 *   return ["owner", "partner", "associate"].includes(role);
 * }
 * ```
 */
export type UserRole = "owner" | "partner" | "associate" | "paralegal" | "staff";

/**
 * Role hierarchy for permission checks
 * Higher index = more permissions
 * 
 * Example usage:
 * ```ts
 * function hasAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
 *   return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
 * }
 * ```
 */
export const ROLE_HIERARCHY: UserRole[] = [
  "staff",
  "paralegal",
  "associate",
  "partner",
  "owner",
];
