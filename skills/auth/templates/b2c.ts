/**
 * B2C Auth Schema Template
 * 
 * Use this template for consumer-facing applications where individual users
 * sign up and use the app independently. No organization or team structure.
 * 
 * Examples:
 * - Will generators and estate planning tools
 * - LLC formation wizards
 * - Solo practitioner client intake forms
 * - Self-service legal document generators
 * - Pro se litigation helpers
 * 
 * Features:
 * - User accounts with email/password
 * - Session management
 * - OAuth support (Google, Microsoft)
 * - Email verification
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Run: bun drizzle-kit generate
 * 3. Run: bun drizzle-kit migrate
 * 
 * @license MIT
 * @see https://better-auth.com/docs
 */

import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

// =============================================================================
// CORE TABLES (Required by better-auth)
// =============================================================================

/**
 * Users table - stores basic user information
 * 
 * This is the core identity table. Every authenticated user has exactly one
 * row here. OAuth users will have their profile synced from the provider.
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
 * Each row represents a logged-in session. Users can have multiple sessions
 * (e.g., logged in on phone and laptop). Sessions expire after a configurable
 * period (default: 7 days in better-auth).
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
 * 
 * For email/password users: stores the hashed password
 * For OAuth users: stores provider tokens (Google, Microsoft, etc.)
 * 
 * A user can have multiple accounts (e.g., password + Google linked)
 */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(), // "credential", "google", "microsoft", etc.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"), // Only for "credential" provider (hashed)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Verification table - email verification and password reset tokens
 * 
 * Stores temporary tokens for:
 * - Email verification links
 * - Password reset links
 * - Magic link authentication
 * 
 * Tokens are single-use and expire after a short period.
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // Usually the email address
  value: text("value").notNull(), // The token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
