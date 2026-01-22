/**
 * Authorization utilities - admin checks by email.
 *
 * Looks up email from users table since JWT may not include it.
 * Supports admin key bypass for scripts and CLI.
 */
import type { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server";
type Ctx = MutationCtx | QueryCtx | ActionCtx;
type Identity = NonNullable<Awaited<ReturnType<Ctx["auth"]["getUserIdentity"]>>>;
/**
 * Validate admin key for script/CLI authentication.
 * Returns true if key matches CONVEX_ADMIN_KEY env var.
 */
export declare function isValidAdminKey(key: string | undefined): boolean;
/**
 * Get the authenticated user's identity.
 * Throws if not authenticated.
 * @param adminKey - Optional admin key for script/CLI bypass
 */
export declare function requireIdentity(ctx: Ctx, adminKey?: string): Promise<Identity>;
/**
 * Check if a user is an admin based on their email.
 * Email is extracted from JWT - no API call needed.
 */
export declare function isAdmin(identity: Identity): boolean;
/**
 * Require the user to be an admin.
 * Throws if not authenticated or not an admin.
 * @param adminKey - Optional admin key for script/CLI bypass
 */
export declare function requireAdmin(ctx: Ctx, adminKey?: string): Promise<Identity>;
/**
 * Get the stable user identifier for storage.
 * Uses tokenIdentifier which is stable across dev/prod instances.
 */
export declare function principalId(identity: Identity): string;
export {};
//# sourceMappingURL=authz.d.ts.map