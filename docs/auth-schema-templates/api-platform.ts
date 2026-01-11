/**
 * API Platform Auth Schema Template
 * 
 * Use this template for API-first products where the primary interface
 * is programmatic access via API keys, not browser sessions. Includes
 * comprehensive API key management with scopes and usage tracking.
 * 
 * Examples:
 * - Legal AI APIs (document analysis, contract review)
 * - Court data APIs (case lookup, docket monitoring)
 * - E-filing integration APIs
 * - Legal research APIs
 * - Document automation APIs
 * 
 * Features:
 * - Everything in multi-org-saas.ts PLUS:
 * - API key generation and management
 * - Scoped permissions per API key
 * - Usage tracking for billing/rate limiting
 * - Key rotation support
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Customize API scopes for your product
 * 3. Run: bun drizzle-kit generate
 * 4. Run: bun drizzle-kit migrate
 * 
 * @license MIT
 * @see https://better-auth.com/docs
 */

import { pgTable, text, timestamp, boolean, pgEnum, bigint, jsonb } from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Member roles within an organization
 */
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "developer",
  "billing",
  "viewer",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

/**
 * API key status
 */
export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "revoked",
  "expired",
]);

/**
 * API key environment
 * 
 * Separate keys for test vs production to prevent accidents
 */
export const apiKeyEnvironmentEnum = pgEnum("api_key_environment", [
  "test",       // For development, hits sandbox
  "production", // For live usage, hits production
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
 * Sessions table - for dashboard access
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
 * Organizations - API customers (companies using your API)
 */
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  
  // Billing and subscription info
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  
  // API usage limits based on tier
  monthlyRequestLimit: bigint("monthly_request_limit", { mode: "number" }),
  
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Members - organization team members
 */
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("developer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Invitations
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
  role: memberRoleEnum("role").notNull().default("developer"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// API KEY TABLES
// =============================================================================

/**
 * API Keys - the primary auth mechanism for API access
 * 
 * Key format recommendation: prefix_base64random
 * - Test keys: sk_test_xxxxx
 * - Production keys: sk_live_xxxxx
 * 
 * IMPORTANT: Only store the HASH of the key, not the key itself.
 * The full key is shown once at creation, then only the prefix is visible.
 */
export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  
  // The organization this key belongs to
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // Human-readable name for the key
  name: text("name").notNull(), // e.g., "Production Server", "CI Pipeline"
  
  // Key identification
  // Store only first 8 chars for display: "sk_live_abc..."
  keyPrefix: text("key_prefix").notNull(),
  // SHA-256 hash of the full key for validation
  keyHash: text("key_hash").notNull().unique(),
  
  // Environment separation
  environment: apiKeyEnvironmentEnum("environment").notNull().default("test"),
  
  // Scoped permissions - what this key can do
  // Store as JSON array: ["documents:read", "documents:write", "analyze"]
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  
  // Lifecycle
  status: apiKeyStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"), // null = never expires
  lastUsedAt: timestamp("last_used_at"),
  
  // Who created this key
  createdById: text("created_by_id")
    .notNull()
    .references(() => user.id),
  
  // If revoked, who revoked it and why
  revokedAt: timestamp("revoked_at"),
  revokedById: text("revoked_by_id").references(() => user.id),
  revokeReason: text("revoke_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * API Key Usage - track requests per key for billing and rate limiting
 * 
 * Aggregate usage by hour/day for efficient querying.
 * For real-time rate limiting, use Redis or similar.
 */
export const apiKeyUsage = pgTable("api_key_usage", {
  id: text("id").primaryKey(),
  
  apiKeyId: text("api_key_id")
    .notNull()
    .references(() => apiKey.id, { onDelete: "cascade" }),
  
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // Time bucket for aggregation
  // Store as start of hour: 2024-01-15T14:00:00Z
  periodStart: timestamp("period_start").notNull(),
  
  // Request counts
  requestCount: bigint("request_count", { mode: "number" }).notNull().default(0),
  errorCount: bigint("error_count", { mode: "number" }).notNull().default(0),
  
  // Breakdown by endpoint (optional, for detailed analytics)
  // { "/v1/documents": 150, "/v1/analyze": 75 }
  endpointCounts: jsonb("endpoint_counts").$type<Record<string, number>>().default({}),
  
  // Cost tracking for usage-based billing
  // Store in smallest currency unit (cents)
  computedCostCents: bigint("computed_cost_cents", { mode: "number" }).default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * API Scopes - define available permission scopes
 * 
 * This table documents the available scopes for your API.
 * Alternatively, define scopes in code and use this for UI display only.
 */
export const apiScope = pgTable("api_scope", {
  id: text("id").primaryKey(),
  
  // Scope identifier: "documents:read", "analyze:*", etc.
  name: text("name").notNull().unique(),
  
  // Human-readable description for docs/UI
  displayName: text("display_name").notNull(),
  description: text("description"),
  
  // Group related scopes: "documents", "analyze", "billing"
  category: text("category"),
  
  // Is this a sensitive scope requiring extra confirmation?
  isSensitive: boolean("is_sensitive").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Webhook Endpoints - for event notifications
 * 
 * Organizations can register webhooks to receive events
 * about their API usage, billing, etc.
 */
export const webhookEndpoint = pgTable("webhook_endpoint", {
  id: text("id").primaryKey(),
  
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  
  // Webhook URL (must be HTTPS)
  url: text("url").notNull(),
  
  // Events to subscribe to
  // ["document.processed", "usage.threshold", "billing.invoice"]
  events: jsonb("events").$type<string[]>().notNull().default([]),
  
  // Secret for signature verification (HMAC)
  // Generate: crypto.randomBytes(32).toString('hex')
  secret: text("secret").notNull(),
  
  // Status
  isEnabled: boolean("is_enabled").notNull().default(true),
  
  // Track delivery failures
  failureCount: bigint("failure_count", { mode: "number" }).notNull().default(0),
  lastFailureAt: timestamp("last_failure_at"),
  lastSuccessAt: timestamp("last_success_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// =============================================================================
// HELPER TYPES
// =============================================================================

export type MemberRole = "owner" | "admin" | "developer" | "billing" | "viewer";
export type ApiKeyStatus = "active" | "revoked" | "expired";
export type ApiKeyEnvironment = "test" | "production";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

/**
 * Common API scopes for legal tech APIs
 * 
 * Customize for your specific API:
 */
export const COMMON_API_SCOPES = [
  // Document operations
  "documents:read",
  "documents:write",
  "documents:delete",
  
  // Analysis operations  
  "analyze:basic",
  "analyze:advanced",
  
  // Search operations
  "search:read",
  
  // Billing/usage
  "usage:read",
  "billing:read",
  
  // Admin operations
  "admin:*",
] as const;

export type ApiScope = typeof COMMON_API_SCOPES[number];
