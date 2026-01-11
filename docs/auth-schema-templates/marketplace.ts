/**
 * Marketplace Auth Schema Template
 * 
 * Use this template for two-sided platforms where fundamentally different
 * user types interact. Each user type has distinct profiles, capabilities,
 * and verification requirements.
 * 
 * Examples:
 * - Expert witness marketplaces (experts + attorneys)
 * - Court reporter booking platforms (reporters + law firms)
 * - Legal freelancer marketplaces (freelancers + clients)
 * - Mediation platforms (mediators + parties)
 * - Legal tech vendor directories (vendors + buyers)
 * 
 * Features:
 * - Everything in b2c.ts PLUS:
 * - Distinct user types with type-specific profiles
 * - Type-specific verification/onboarding
 * - Optional: Organizations for one or both sides
 * 
 * To use:
 * 1. Copy this file to lib/db/schema/auth.ts
 * 2. Customize user types and profile fields for your marketplace
 * 3. Run: bun drizzle-kit generate
 * 4. Run: bun drizzle-kit migrate
 * 
 * @license MIT
 * @see https://better-auth.com/docs
 */

import { pgTable, text, timestamp, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * User types in the marketplace
 * 
 * Customize these for your two-sided platform:
 * - provider: The supply side (experts, reporters, freelancers)
 * - client: The demand side (attorneys, law firms, buyers)
 * - admin: Platform administrators
 * 
 * Examples by marketplace type:
 * - Expert witness: "expert" | "attorney" | "admin"
 * - Court reporter: "reporter" | "firm" | "admin"
 * - Legal freelancer: "freelancer" | "client" | "admin"
 */
export const userTypeEnum = pgEnum("user_type", [
  "provider",
  "client",
  "admin",
]);

/**
 * Verification status for providers
 * 
 * Providers often need verification before they can be listed/booked.
 */
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",      // Just signed up, not yet reviewed
  "in_review",    // Documents submitted, under review
  "verified",     // Approved to operate on platform
  "rejected",     // Did not pass verification
  "suspended",    // Was verified, now suspended
]);

/**
 * Member roles within organizations (if using orgs)
 */
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
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
 * Users table - stores basic user information with type designation
 * 
 * Extended to include:
 * - userType: Which side of the marketplace they're on
 * - verificationStatus: For providers requiring verification
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  
  // Marketplace-specific fields
  userType: userTypeEnum("user_type").notNull(),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  
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
  
  // If using organizations
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
// USER TYPE PROFILES
// Each user type gets their own profile table with type-specific fields
// =============================================================================

/**
 * Provider profiles - extended info for supply-side users
 * 
 * Customize fields for your provider type:
 * - Expert witness: specialties, credentials, hourlyRate, depositionExperience
 * - Court reporter: certifications, equipment, travelRadius, realtimeCapable
 * - Legal freelancer: skills, portfolio, availability, rates
 */
export const providerProfile = pgTable("provider_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Professional info - customize these fields
  headline: text("headline"), // Brief professional description
  bio: text("bio"), // Detailed background
  
  // Specializations - store as JSON array
  // e.g., ["medical malpractice", "product liability"]
  specialties: jsonb("specialties").$type<string[]>().default([]),
  
  // Credentials - store as JSON array of objects
  // e.g., [{ "type": "MD", "issuer": "...", "year": 2010 }]
  credentials: jsonb("credentials").$type<Array<{
    type: string;
    issuer?: string;
    year?: number;
  }>>().default([]),
  
  // Availability and rates
  hourlyRate: text("hourly_rate"), // Store as string to avoid precision issues
  currency: text("currency").default("USD"),
  availability: text("availability"), // "available", "busy", "unavailable"
  
  // Location
  city: text("city"),
  state: text("state"),
  country: text("country"),
  timezone: text("timezone"),
  
  // Platform metrics (updated by system)
  totalBookings: text("total_bookings").default("0"),
  averageRating: text("average_rating"), // Store as string "4.8"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Client profiles - extended info for demand-side users
 * 
 * Customize fields for your client type:
 * - Attorney: barNumber, firm, practiceAreas
 * - Law firm: firmSize, offices, practiceAreas
 */
export const clientProfile = pgTable("client_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Professional info
  title: text("title"), // "Partner", "Associate", "In-House Counsel"
  company: text("company"), // Firm or company name
  
  // For attorneys
  barNumber: text("bar_number"),
  barState: text("bar_state"),
  
  // Practice areas - store as JSON array
  practiceAreas: jsonb("practice_areas").$type<string[]>().default([]),
  
  // Contact preferences
  phone: text("phone"),
  preferredContact: text("preferred_contact"), // "email", "phone"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// =============================================================================
// ORGANIZATION TABLES (Optional - for firm-side of marketplace)
// Include if clients can have team members
// =============================================================================

/**
 * Organizations - for client-side teams (e.g., law firms)
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
 * Members - links users to organizations
 */
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Invitations - pending invites to join an organization
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
  role: memberRoleEnum("role").notNull().default("member"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// HELPER TYPES
// =============================================================================

export type UserType = "provider" | "client" | "admin";
export type VerificationStatus = "pending" | "in_review" | "verified" | "rejected" | "suspended";
export type MemberRole = "owner" | "admin" | "member";
