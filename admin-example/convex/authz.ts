/**
 * Authorization utilities - admin checks by email.
 *
 * Looks up email from users table since JWT may not include it.
 * Supports admin key bypass for scripts and CLI.
 */
import type { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx | ActionCtx;
type DbCtx = MutationCtx | QueryCtx; // Contexts that have db access
type Identity = NonNullable<Awaited<ReturnType<Ctx["auth"]["getUserIdentity"]>>>;

/**
 * Get admin emails from ADMIN_EMAILS env var.
 * Format: "email1@example.com,email2@example.com"
 * Must be called at runtime, not module load time.
 */
function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Validate admin key for script/CLI authentication.
 * Returns true if key matches CONVEX_ADMIN_KEY env var.
 */
export function isValidAdminKey(key: string | undefined): boolean {
  const adminKey = process.env.CONVEX_ADMIN_KEY;
  return !!adminKey && !!key && key === adminKey;
}

/**
 * Create a synthetic admin identity for admin key authentication.
 * Uses first admin email as the identity email.
 */
function createAdminKeyIdentity(): Identity {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "admin@system";
  return { tokenIdentifier: "admin-key", email: adminEmail } as Identity;
}

/**
 * Get the authenticated user's identity.
 * Throws if not authenticated.
 * @param adminKey - Optional admin key for script/CLI bypass
 */
export async function requireIdentity(ctx: Ctx, adminKey?: string): Promise<Identity> {
  // Admin key bypass for scripts/CLI
  if (isValidAdminKey(adminKey)) {
    return createAdminKeyIdentity();
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}

/**
 * Check if a user is an admin based on their email.
 * Email is extracted from JWT - no API call needed.
 */
export function isAdmin(identity: Identity): boolean {
  const email = identity.email?.toLowerCase();
  return !!email && getAdminEmails().has(email);
}

/**
 * Look up user's email from the users table.
 * Returns the email if found, undefined otherwise.
 */
async function getUserEmail(ctx: DbCtx, identity: Identity): Promise<string | undefined> {
  // First check if email is in the identity (JWT claims)
  if (identity.email) {
    return identity.email.toLowerCase();
  }

  // The subject in Convex Auth is formatted as "userId|sessionId"
  // Extract the userId part
  if (identity.subject) {
    const userId = identity.subject.split("|")[0];
    try {
      const user = await ctx.db.get(userId as any);
      if (user && "email" in user && typeof user.email === "string") {
        return user.email.toLowerCase();
      }
    } catch {
      // User not found or invalid ID format
    }
  }

  return undefined;
}

/**
 * Check if a user is an admin by looking up their email.
 * Checks JWT first, then falls back to users table.
 */
async function isAdminWithDbLookup(ctx: DbCtx, identity: Identity): Promise<boolean> {
  const email = await getUserEmail(ctx, identity);
  return !!email && getAdminEmails().has(email);
}

/**
 * Require the user to be an admin.
 * Throws if not authenticated or not an admin.
 * @param adminKey - Optional admin key for script/CLI bypass
 */
export async function requireAdmin(ctx: Ctx, adminKey?: string): Promise<Identity> {
  // Admin key bypass for scripts/CLI
  if (isValidAdminKey(adminKey)) {
    return createAdminKeyIdentity();
  }

  const identity = await requireIdentity(ctx);

  // For contexts with db access, do a full lookup
  if ("db" in ctx) {
    const isAdminUser = await isAdminWithDbLookup(ctx as DbCtx, identity);
    if (!isAdminUser) {
      throw new Error("Forbidden: admin required");
    }
  } else {
    // For actions without db access, only check JWT email
    if (!isAdmin(identity)) {
      throw new Error("Forbidden: admin required");
    }
  }

  return identity;
}

/**
 * Get the stable user identifier for storage.
 * Uses tokenIdentifier which is stable across dev/prod instances.
 */
export function principalId(identity: Identity): string {
  return identity.tokenIdentifier;
}
