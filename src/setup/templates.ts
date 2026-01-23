/**
 * File templates for convex-versioned-assets setup.
 */

/**
 * authz.ts - Authorization utilities with admin key support.
 * Includes DB lookup for email when not in JWT (works with convex-auth).
 */
export const authzTemplate = `/**
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
`;

/**
 * functions.ts - Custom function builders with auth support.
 */
export const functionsTemplate = `/**
 * Custom function builders.
 *
 * Use these instead of importing directly from _generated/server:
 * - publicQuery: For queries that don't require auth
 * - publicMutation: For mutations that don't require auth (use sparingly)
 * - authedQuery/Mutation/Action: For logged-in users
 * - adminQuery/Mutation/Action: For admin-only operations
 */
import { v } from "convex/values";
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
  internalMutation as baseInternalMutation,
  internalAction as baseInternalAction,
  internalQuery as baseInternalQuery,
} from "./_generated/server";
import { customMutation, customAction, customQuery } from "convex-helpers/server/customFunctions";
import { requireIdentity, requireAdmin, principalId, isAdmin } from "./authz";

// ============================================================================
// Public functions (no auth required)
// ============================================================================

/**
 * Public query - no authentication required.
 * Accepts _adminKey for compatibility but ignores it.
 */
export const publicQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

/**
 * Public mutation - no authentication required.
 * Use sparingly - only for truly public operations.
 */
export const publicMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

/**
 * Public action - no authentication required.
 */
export const publicAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

// ============================================================================
// Internal functions (re-exported unchanged)
// ============================================================================

export const internalMutation = baseInternalMutation;
export const internalAction = baseInternalAction;
export const internalQuery = baseInternalQuery;

// ============================================================================
// Authed functions (require login)
// ============================================================================

/**
 * Authed query - requires user to be logged in.
 */
export const authedQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Authed mutation - requires user to be logged in.
 */
export const authedMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Authed action - requires user to be logged in.
 */
export const authedAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Context available in authed function handlers.
 */
export interface AuthedCtx {
  principalId: string;
  isAdmin: boolean;
}

// ============================================================================
// Admin functions (require admin role)
// ============================================================================

/**
 * Admin query - requires user to be an admin.
 */
export const adminQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Admin mutation - requires user to be an admin.
 */
export const adminMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Admin action - requires user to be an admin.
 */
export const adminAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Context available in admin function handlers.
 */
export interface AdminCtx {
  principalId: string;
}
`;

/**
 * versionedAssets.ts - Wrapper functions for the component.
 */
export const versionedAssetsTemplate = `/**
 * Versioned Assets API wrappers.
 *
 * These functions wrap the convex-versioned-assets component
 * with proper authentication and authorization.
 */
import { v } from "convex/values";
import { components } from "./_generated/api";
import { adminQuery, adminMutation, adminAction, authedMutation, publicQuery } from "./functions";

// ============================================================================
// Folder Operations
// ============================================================================

export const listFolders = adminQuery({
  args: { parentPath: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.listFolders, args);
  },
});

export const listAllFolders = adminQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.listAllFolders, {});
  },
});

export const getFolder = adminQuery({
  args: { path: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getFolder, args);
  },
});

export const createFolderByName = adminMutation({
  args: { parentPath: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.createFolderByName, args);
  },
});

export const createFolderByPath = adminMutation({
  args: { path: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.createFolderByPath, args);
  },
});

export const updateFolder = adminMutation({
  args: { path: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.updateFolder, args);
  },
});

// ============================================================================
// Asset Operations
// ============================================================================

export const listAssets = adminQuery({
  args: { folderPath: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.listAssets, args);
  },
});

export const getAsset = adminQuery({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getAsset, args);
  },
});

export const createAsset = adminMutation({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.createAsset, args);
  },
});

export const renameAsset = adminMutation({
  args: { folderPath: v.string(), basename: v.string(), newBasename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.renameAsset, args);
  },
});

// ============================================================================
// Version Operations
// ============================================================================

export const getAssetVersions = publicQuery({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getAssetVersions, args);
  },
});

export const getPublishedFile = publicQuery({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getPublishedFile, args);
  },
});

export const listPublishedFilesInFolder = publicQuery({
  args: { folderPath: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.versionedAssets.assetManager.listPublishedFilesInFolder,
      args,
    );
  },
});

export const restoreVersion = authedMutation({
  args: { versionId: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.restoreVersion, args);
  },
});

// ============================================================================
// Preview & Content Operations
// ============================================================================

export const getVersionPreviewUrl = publicQuery({
  args: { versionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetFsHttp.getVersionPreviewUrl, args);
  },
});

export const getTextContent = adminAction({
  args: { versionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runAction(components.versionedAssets.assetFsHttp.getTextContent, {
      versionId: args.versionId,
    });
  },
});

// ============================================================================
// Changelog Operations (for real-time sync)
// ============================================================================

/**
 * Watch changelog for changes since a cursor.
 * Uses compound cursor (createdAt + id) for reliable pagination.
 * For initial fetch, use cursorCreatedAt: 0, cursorId: ""
 */
export const watchChangelog = adminQuery({
  args: { cursorCreatedAt: v.number(), cursorId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cursor = { createdAt: args.cursorCreatedAt, id: args.cursorId };
    return await ctx.runQuery(components.versionedAssets.changelog.listSince, {
      cursor,
      limit: args.limit,
    });
  },
});

/**
 * Watch changes within a specific folder.
 */
export const watchFolderChanges = adminQuery({
  args: {
    folderPath: v.string(),
    cursorCreatedAt: v.number(),
    cursorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cursor = { createdAt: args.cursorCreatedAt, id: args.cursorId };
    return await ctx.runQuery(components.versionedAssets.changelog.listForFolder, {
      folderPath: args.folderPath,
      cursor,
      limit: args.limit,
    });
  },
});


export const migrateAllToR2 = adminAction({
  args: {},
  handler: async (ctx) => {
    const r2Config = {
      R2_BUCKET: process.env.R2_BUCKET!,
      R2_ENDPOINT: process.env.R2_ENDPOINT!,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL!,
      R2_KEY_PREFIX: process.env.R2_KEY_PREFIX
    };

    const { versions } = await ctx.runQuery(
      components.versionedAssets.migration.listVersionsToMigrate,
      {}
    );

    for (const v of versions) {
      const result = await ctx.runAction(
        components.versionedAssets.migration.migrateVersionToR2Action,
        { versionId: v.versionId, r2Config }
      );
      console.log("Migrated", v.versionId, "->", result.r2Key);
    }

    return { migrated: versions.length };
  }
});
`;

/**
 * generateUploadUrl.ts - Upload functions with R2 support.
 */
export const generateUploadUrlTemplate = `import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { authedMutation, publicAction } from "./functions";

/**
 * Get R2 config from env vars. Returns undefined if not configured.
 * Called once per request, passed to component functions.
 *
 * When R2 is configured (R2_BUCKET env var is set), uploads go to R2.
 * Otherwise, uploads use Convex storage.
 *
 * R2_PUBLIC_URL is required and stored with each file version at upload time,
 * enabling URL changes without breaking existing file links.
 */
function getR2Config() {
  if (!process.env.R2_BUCKET) return undefined;
  return {
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ENDPOINT: process.env.R2_ENDPOINT!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL!,
    R2_KEY_PREFIX: process.env.R2_KEY_PREFIX,
  };
}

const storageBackendValidator = v.union(v.literal("convex"), v.literal("r2"));

// =============================================================================
// Upload Flow
// =============================================================================

/**
 * Start an upload. Creates an upload intent and returns the upload URL.
 *
 * Flow:
 * 1. Call startUpload() to get intentId + uploadUrl
 * 2. Upload file to the URL
 * 3. Call finishUpload() with intentId (+ storageId for Convex backend)
 */
export const startUpload = authedMutation({
  args: {
    folderPath: v.string(),
    basename: v.string(),
    filename: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  returns: v.object({
    intentId: v.string(),
    backend: storageBackendValidator,
    uploadUrl: v.string(),
    r2Key: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(components.versionedAssets.assetManager.startUpload, {
      ...args,
      r2Config: getR2Config(),
    });
    return result;
  },
});

// Internal version for scheduled actions (no auth required)
export const startUploadInternal = internalMutation({
  args: {
    folderPath: v.string(),
    basename: v.string(),
    filename: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  returns: v.object({
    intentId: v.string(),
    backend: storageBackendValidator,
    uploadUrl: v.string(),
    r2Key: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.startUpload, {
      ...args,
      r2Config: getR2Config(),
    });
  },
});

/**
 * Finish an upload. Creates the asset version from a completed upload intent.
 */
export const finishUpload = authedMutation({
  args: {
    intentId: v.string(),
    uploadResponse: v.optional(v.any()),
    size: v.optional(v.number()),
    contentType: v.optional(v.string()),
    folderPath: v.optional(v.string()),
    basename: v.optional(v.string()),
  },
  returns: v.object({ assetId: v.string(), versionId: v.string(), version: v.number() }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(components.versionedAssets.assetManager.finishUpload, {
      intentId: args.intentId,
      uploadResponse: args.uploadResponse,
      r2Config: getR2Config(),
      size: args.size,
      contentType: args.contentType,
    });
    return result;
  },
});

// Internal version for scheduled actions (no auth required)
export const finishUploadInternal = internalMutation({
  args: {
    intentId: v.string(),
    uploadResponse: v.optional(v.any()),
    size: v.optional(v.number()),
    contentType: v.optional(v.string()),
    folderPath: v.optional(v.string()),
    basename: v.optional(v.string()),
  },
  returns: v.object({ assetId: v.string(), versionId: v.string(), version: v.number() }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(components.versionedAssets.assetManager.finishUpload, {
      intentId: args.intentId,
      uploadResponse: args.uploadResponse,
      r2Config: getR2Config(),
      size: args.size,
      contentType: args.contentType,
    });
    return result;
  },
});

// =============================================================================
// Signed URL Generation (for private file access)
// =============================================================================

/**
 * Generate a signed URL for private file access.
 * Works with both Convex storage and R2.
 */
export const getSignedUrl = publicAction({
  args: {
    versionId: v.string(),
    expiresIn: v.optional(v.number()), // seconds, default 300 (5 min)
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { versionId, expiresIn }) => {
    return await ctx.runAction(components.versionedAssets.signedUrl.getSignedUrl, {
      versionId,
      expiresIn,
      r2Config: getR2Config(),
    });
  },
});
`;

/**
 * convex.config.ts template (new file)
 */
export const convexConfigTemplate = `import { defineApp } from "convex/server";
import versionedAssets from "convex-versioned-assets/convex.config.js";

const app = defineApp();
app.use(versionedAssets);

export default app;
`;

/**
 * Template for agents-instructions.md when manual steps are needed
 */
export function generateAgentsInstructions(options: {
  needsHttpUpdate: boolean;
  needsConfigUpdate: boolean;
  existingHttpContent?: string;
  existingConfigContent?: string;
}): string {
  const sections: string[] = [
    `# Manual Setup Steps for convex-versioned-assets

The setup script couldn't automatically complete these steps.
Copy this file content and paste to your AI assistant to complete setup.
`,
  ];

  if (options.needsHttpUpdate) {
    sections.push(`## convex/http.ts

Add these imports and routes to your existing http.ts:

\`\`\`typescript
import { registerAssetFsRoutes } from "convex-versioned-assets";
import { components } from "./_generated/api";

// Add after your httpRouter() creation:
registerAssetFsRoutes(http, components.versionedAssets);
\`\`\`

Your current http.ts:
\`\`\`typescript
${options.existingHttpContent || "// Could not read file"}
\`\`\`
`);
  }

  if (options.needsConfigUpdate) {
    sections.push(`## convex/convex.config.ts

Add the component import:

\`\`\`typescript
import versionedAssets from "convex-versioned-assets/convex.config.js";

// Add inside defineApp():
app.use(versionedAssets);
\`\`\`

Your current convex.config.ts:
\`\`\`typescript
${options.existingConfigContent || "// Could not read file"}
\`\`\`
`);
  }

  return sections.join("\n");
}

/**
 * CSS design system to inject into index.css.
 * This provides the theming variables and utility classes for the admin UI.
 */
export const cssDesignSystemTemplate = `@import "tailwindcss";

@theme {
  --color-light: #ffffff;
  --color-dark: #171717;

  /* Design system colors */
  --color-background: hsl(222 20% 8%);
  --color-foreground: hsl(210 20% 95%);
  --color-card: hsl(222 18% 11%);
  --color-card-foreground: hsl(210 20% 95%);
  --color-popover: hsl(222 18% 11%);
  --color-popover-foreground: hsl(210 20% 95%);
  --color-primary: hsl(174 72% 50%);
  --color-primary-foreground: hsl(222 20% 8%);
  --color-secondary: hsl(220 16% 18%);
  --color-secondary-foreground: hsl(210 20% 85%);
  --color-muted: hsl(220 14% 15%);
  --color-muted-foreground: hsl(215 14% 55%);
  --color-accent: hsl(220 16% 20%);
  --color-accent-foreground: hsl(210 20% 95%);
  --color-destructive: hsl(0 72% 55%);
  --color-destructive-foreground: hsl(210 20% 95%);
  --color-success: hsl(152 72% 45%);
  --color-success-foreground: hsl(210 20% 95%);
  --color-warning: hsl(38 92% 55%);
  --color-warning-foreground: hsl(222 20% 8%);
  --color-info: hsl(210 72% 55%);
  --color-info-foreground: hsl(210 20% 95%);
  --color-border: hsl(220 14% 18%);
  --color-input: hsl(220 14% 18%);
  --color-ring: hsl(174 72% 50%);

  /* Surface layers */
  --color-surface-1: hsl(222 18% 11%);
  --color-surface-2: hsl(220 16% 14%);
  --color-surface-3: hsl(220 14% 18%);

  /* Sidebar colors */
  --color-sidebar: hsl(222 20% 7%);
  --color-sidebar-foreground: hsl(210 20% 85%);
  --color-sidebar-primary: hsl(174 72% 50%);
  --color-sidebar-accent: hsl(220 16% 14%);
  --color-sidebar-accent-foreground: hsl(210 20% 95%);
  --color-sidebar-border: hsl(220 14% 15%);

  /* Border radius */
  --radius: 0.625rem;
  --radius-lg: 0.625rem;
  --radius-md: calc(0.625rem - 2px);
  --radius-sm: calc(0.625rem - 4px);

  /* Shadows */
  --shadow-glow: 0 0 20px -5px hsl(174 72% 50% / 0.3);
  --shadow-glow-sm: 0 0 10px -3px hsl(174 72% 50% / 0.2);
  --shadow-soft: 0 4px 20px -4px hsl(0 0% 0% / 0.3);
  --shadow-soft-lg: 0 8px 32px -8px hsl(0 0% 0% / 0.4);
}

/* Dark mode is the default */
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Light mode override */
@media (prefers-color-scheme: light) {
  :root {
    --color-background: hsl(0 0% 100%);
    --color-foreground: hsl(222 20% 8%);
    --color-card: hsl(0 0% 98%);
    --color-card-foreground: hsl(222 20% 8%);
    --color-popover: hsl(0 0% 100%);
    --color-popover-foreground: hsl(222 20% 8%);
    --color-primary: hsl(174 72% 40%);
    --color-primary-foreground: hsl(0 0% 100%);
    --color-secondary: hsl(220 14% 96%);
    --color-secondary-foreground: hsl(222 20% 8%);
    --color-muted: hsl(220 14% 96%);
    --color-muted-foreground: hsl(215 14% 45%);
    --color-accent: hsl(220 14% 96%);
    --color-accent-foreground: hsl(222 20% 8%);
    --color-border: hsl(220 14% 90%);
    --color-input: hsl(220 14% 90%);
    --color-surface-1: hsl(0 0% 98%);
    --color-surface-2: hsl(220 14% 96%);
    --color-surface-3: hsl(220 14% 94%);
    --color-sidebar: hsl(220 14% 98%);
    --color-sidebar-foreground: hsl(222 20% 8%);
    --color-sidebar-accent: hsl(220 14% 94%);
    --color-sidebar-border: hsl(220 14% 90%);
  }

  body {
    color: var(--color-foreground);
    background: var(--color-background);
  }
}

/* Utility classes */
.glass {
  background: hsl(222 18% 12% / 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(220 14% 25% / 0.3);
}

.surface-1 {
  background-color: var(--color-surface-1);
}

.surface-2 {
  background-color: var(--color-surface-2);
}

.surface-3 {
  background-color: var(--color-surface-3);
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-muted) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-muted);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted-foreground);
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

.animate-fade-out {
  animation: fade-out 0.3s ease-out forwards;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out forwards;
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out forwards;
}

.animate-slide-in-left {
  animation: slide-in-left 0.3s ease-out forwards;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-muted) 0%,
    var(--color-surface-3) 50%,
    var(--color-muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Staggered animations */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }
.stagger-6 { animation-delay: 0.3s; }
`;

/**
 * App.tsx template for the admin panel.
 * This replaces the default App.tsx with the admin panel setup.
 * Uses the library import pattern - no file copying needed.
 */
export const appTsxTemplate = `import { Authenticated, Unauthenticated } from "convex/react";
import { AdminPanel, AdminUIProvider, LoginModal } from "convex-versioned-assets/admin-ui";
import "convex-versioned-assets/admin-ui/styles";
import { api } from "../convex/_generated/api";

export default function App() {
  return (
    <AdminUIProvider api={api}>
      <Authenticated>
        <AdminPanel />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </AdminUIProvider>
  );
}
`;

// =============================================================================
// TanStack Router Templates
// =============================================================================

/**
 * TanStack Router dependencies needed for routing setup.
 */
export const TANSTACK_ROUTER_DEPS = [
  "@tanstack/react-router",
  "@tanstack/router-plugin",
];

/**
 * Root route template for TanStack Router.
 * This is the parent route for all other routes.
 */
export const rootRouteTemplate = `import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => <Outlet />,
});
`;

/**
 * Index route template for TanStack Router.
 * This is the default route at "/" that renders the AssetDemo.
 */
export const indexRouteTemplate = `import { createFileRoute } from "@tanstack/react-router";
import { AssetDemo } from "../components/AssetDemo";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return <AssetDemo />;
}
`;

/**
 * Admin route template for TanStack Router file-based routing.
 * This creates the /admin route with authentication.
 */
export const adminFileRouteTemplate = `import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  AdminPanel,
  AdminUIProvider,
  LoginModal,
} from "convex-versioned-assets/admin-ui";
import "convex-versioned-assets/admin-ui/styles";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AdminUIProvider api={api}>
      <Authenticated>
        <AdminPanel />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </AdminUIProvider>
  );
}
`;

/**
 * Main.tsx template with TanStack Router and React Query.
 * Includes ConvexQueryClient for React Query integration.
 */
export const mainTsxWithRouterTemplate = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

const router = createRouter({ routeTree });

// Register router for type-safe navigation (Link, useNavigate, useParams)
// https://tanstack.com/router/latest/docs/framework/react/guide/type-safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConvexAuthProvider>
  </StrictMode>,
);
`;

// =============================================================================
// Admin Route Component Templates (for existing apps)
// =============================================================================

/**
 * AdminRoute component template for apps with existing routing.
 * Users import this component and add it to their router at /admin.
 */
export const adminRouteComponentTemplate = `import { Authenticated, Unauthenticated } from "convex/react";
import {
  AdminPanel,
  AdminUIProvider,
  LoginModal,
} from "convex-versioned-assets/admin-ui";
import "convex-versioned-assets/admin-ui/styles";
import { api } from "../../convex/_generated/api";

export function AdminRoute() {
  return (
    <AdminUIProvider api={api}>
      <Authenticated>
        <AdminPanel />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </AdminUIProvider>
  );
}
`;

/**
 * Generate admin route instructions for apps with existing routing.
 * Provides examples for different routers.
 */
export function generateAdminRouteInstructions(): string {
  return `# Adding Admin Panel to Your App

We've created \`src/components/AdminRoute.tsx\` for you.
Add it to your router at the \`/admin\` path.

## 1. Configure Tailwind CSS (Required)

The admin panel requires Tailwind CSS to be configured to scan the admin-ui styles.

**Tailwind v4** (uses \`@import "tailwindcss"\`):
Add this line after your tailwindcss import in your main CSS file (e.g., \`index.css\`):

\`\`\`css
@import "tailwindcss";

/* Include convex-versioned-assets admin-ui classes */
@source "../node_modules/convex-versioned-assets/dist/admin-ui/**/*.js";
\`\`\`

**Tailwind v3** (uses \`tailwind.config.js\`):
Add to the \`content\` array in your \`tailwind.config.js\`:

\`\`\`js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/convex-versioned-assets/dist/admin-ui/**/*.js",
  ],
  // ...
};
\`\`\`

## 2. Add Route to Your Router

### React Router

\`\`\`tsx
import { AdminRoute } from "./components/AdminRoute";

<Routes>
  <Route path="/admin" element={<AdminRoute />} />
  {/* your other routes */}
</Routes>
\`\`\`

### Wouter

\`\`\`tsx
import { AdminRoute } from "./components/AdminRoute";

<Switch>
  <Route path="/admin" component={AdminRoute} />
  {/* your other routes */}
</Switch>
\`\`\`

### TanStack Router (code-based)

\`\`\`tsx
import { AdminRoute } from "./components/AdminRoute";

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminRoute,
});
\`\`\`

### No Router (manual)

\`\`\`tsx
import { AdminRoute } from "./components/AdminRoute";

function App() {
  const isAdmin = window.location.pathname === '/admin';
  return isAdmin ? <AdminRoute /> : <YourMainApp />;
}
\`\`\`
`;
}

// =============================================================================
// Asset Demo Templates
// =============================================================================

/**
 * AssetDemo component template for the demo route at "/".
 * Shows upload, version history, and live preview.
 */
export const assetDemoComponentTemplate = `import "./AssetDemo.css";
import {
  useMutation,
  useQuery,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { LoginModal } from "convex-versioned-assets/admin-ui";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback } from "react";

interface AssetDemoProps {
  folderPath: string;
  basename: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={\`asset-demo-skeleton \${className || ""}\`} />;
}

function ControlPanel({ folderPath, basename }: AssetDemoProps) {
  const versions = useQuery(api.versionedAssets.getAssetVersions, {
    folderPath,
    basename,
  });
  const startUpload = useMutation(api.generateUploadUrl.startUpload);
  const finishUpload = useMutation(api.generateUploadUrl.finishUpload);
  const restoreVersion = useMutation(api.versionedAssets.restoreVersion);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const isLoading = versions === undefined;

  // Default expand the newest version (first in list)
  const activeVersion = expandedVersion ?? versions?.[0]?._id ?? null;

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) {
        alert("Please drop an image file");
        return;
      }

      setIsUploading(true);
      try {
        const { intentId, uploadUrl, backend } = await startUpload({
          folderPath,
          basename,
          filename: file.name,
        });

        if (backend === "r2") {
          // R2: PUT file directly to presigned URL
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          // For R2, no storageId needed
          await finishUpload({
            intentId,
            size: file.size,
            contentType: file.type,
          });
        } else {
          // Convex: POST file, get storageId from response
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: file,
            headers: { "Content-Type": file.type },
          });
          const { storageId } = await uploadResponse.json();

          await finishUpload({
            intentId,
            uploadResponse: { storageId },
            size: file.size,
            contentType: file.type,
          });
        }
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed: " + (err as Error).message);
      } finally {
        setIsUploading(false);
      }
    },
    [startUpload, finishUpload, folderPath, basename],
  );

  const handleRestore = async (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    await restoreVersion({ versionId });
  };

  const toggleExpand = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="asset-demo-panel">
      <div className="asset-demo-panel-header">
        <svg
          className="asset-demo-panel-icon-svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span className="asset-demo-panel-title">Asset Manager</span>
      </div>

      <Authenticated>
        <div
          className={\`asset-demo-drop-zone \${isDragging ? "dragging" : ""}\`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => void handleDrop(e)}
        >
          {isUploading ? (
            <div className="asset-demo-upload-progress">
              <div className="asset-demo-upload-spinner" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Drop image to upload new version</span>
            </>
          )}
        </div>
      </Authenticated>

      <Unauthenticated>
        <LoginPrompt />
      </Unauthenticated>

      <div className="asset-demo-section asset-demo-versions-section">
        <div className="asset-demo-section-label">Versions</div>
        <div className="asset-demo-version-list">
          {isLoading ? (
            <>
              <Skeleton className="asset-demo-skeleton-row" />
              <Skeleton className="asset-demo-skeleton-row" />
              <Skeleton className="asset-demo-skeleton-row" />
            </>
          ) : versions && versions.length > 0 ? (
            versions.map((v) => (
              <VersionItem
                key={v._id}
                version={v}
                isExpanded={activeVersion === v._id}
                onToggle={() => toggleExpand(v._id)}
                onRestore={(e) => void handleRestore(e, v._id)}
                formatTime={formatTime}
              />
            ))
          ) : (
            <div className="asset-demo-empty-card">No versions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginPrompt() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div className="asset-demo-drop-zone">
        <div className="asset-demo-login-prompt">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" fill="none" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Sign in to upload new versions</p>
          <button
            className="asset-demo-login-btn"
            onClick={() => setShowLogin(true)}
          >
            Sign in
          </button>
        </div>
      </div>
      <LoginModal open={showLogin} />
    </>
  );
}

function VersionItem({
  version,
  isExpanded,
  onToggle,
  onRestore,
  formatTime,
}: {
  version: { _id: string; version: number; state: string; createdAt: number };
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: (e: React.MouseEvent) => void;
  formatTime: (t: number) => string;
}) {
  const previewData = useQuery(
    api.versionedAssets.getVersionPreviewUrl,
    isExpanded ? { versionId: version._id } : "skip",
  );

  return (
    <div
      className={\`asset-demo-version-item \${version.state} \${isExpanded ? "expanded" : ""}\`}
      onClick={onToggle}
    >
      <div className="asset-demo-version-item-header">
        <div className="asset-demo-version-info">
          <span className="asset-demo-version-number">v{version.version}</span>
          <span className={\`asset-demo-version-state \${version.state}\`}>
            {version.state}
          </span>
        </div>
        <div className="asset-demo-version-actions">
          <span className="asset-demo-version-date">
            {formatTime(version.createdAt)}
          </span>
          <Authenticated>
            {version.state === "archived" && (
              <button className="asset-demo-restore-btn" onClick={onRestore}>
                Restore
              </button>
            )}
          </Authenticated>
        </div>
      </div>
      <div className="asset-demo-version-item-preview">
        {isExpanded && previewData?.url && (
          <img src={previewData.url} alt={\`Version \${version.version}\`} />
        )}
        {isExpanded && !previewData?.url && (
          <Skeleton className="asset-demo-skeleton-image" />
        )}
      </div>
    </div>
  );
}

function ViewerPanel({ folderPath, basename }: AssetDemoProps) {
  const currentImage = useQuery(api.versionedAssets.getPublishedFile, {
    folderPath,
    basename,
  });
  const isLoading = currentImage === undefined;

  // Convex HTTP routes are served from .convex.site (not .convex.cloud)
  const siteUrl =
    (import.meta.env.VITE_CONVEX_URL as string)?.replace(".cloud", ".site") ||
    "";
  const stableUrl = \`\${siteUrl}/assets/\${folderPath}/\${basename}\`;
  const versionUrl = currentImage?.versionId
    ? \`\${siteUrl}/assets/v/\${currentImage.versionId}\`
    : null;

  return (
    <div className="asset-demo-panel">
      <div className="asset-demo-panel-header">
        <svg
          className="asset-demo-panel-icon-svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="asset-demo-panel-title">Live Preview</span>
        <span className="asset-demo-live-badge">
          <span className="asset-demo-live-dot" />
          LIVE
        </span>
      </div>

      <div className="asset-demo-viewer-display">
        {isLoading ? (
          <Skeleton className="asset-demo-skeleton-viewer" />
        ) : currentImage ? (
          <div className="asset-demo-viewer-content">
            <img
              src={currentImage.url}
              alt="Published"
              className="asset-demo-viewer-image"
            />
          </div>
        ) : (
          <div className="asset-demo-viewer-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Drop an image to get started</span>
          </div>
        )}
      </div>

      <div className="asset-demo-url-section">
        <div className="asset-demo-url-item">
          <div className="asset-demo-url-label">
            <strong>Stable URL</strong>
            <span>Always latest version</span>
          </div>
          <a
            href={stableUrl}
            target="_blank"
            rel="noopener"
            className="asset-demo-url-value"
          >
            {stableUrl}
          </a>
        </div>
        {versionUrl && (
          <div className="asset-demo-url-item">
            <div className="asset-demo-url-label">
              <strong>Version URL</strong>
              <span>Immutable v{currentImage?.version}</span>
            </div>
            <a
              href={versionUrl}
              target="_blank"
              rel="noopener"
              className="asset-demo-url-value"
            >
              {versionUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LogoutButton() {
  const { signOut } = useAuthActions();

  return (
    <button
      className="asset-demo-logout-btn"
      onClick={() => void signOut()}
      title="Sign out"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" fill="none" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}

export function AssetDemo() {
  const folderPath = "/";
  const basename = "hero-image";
  return (
    <div className="asset-demo-container">
      <Authenticated>
        <LogoutButton />
      </Authenticated>
      <header className="asset-demo-header">
        <h1>Versioned Assets Demo</h1>
        <p>Version history - Instant rollback - Direct CDN delivery</p>
      </header>
      <main className="asset-demo-main">
        <ControlPanel folderPath={folderPath} basename={basename} />
        <ViewerPanel folderPath={folderPath} basename={basename} />
      </main>
    </div>
  );
}
`;

/**
 * AssetDemo CSS template for the demo styles.
 */
export const assetDemoCssTemplate = `/* Asset Demo - scoped styles (prefixed with asset-demo-) */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");

/* Container scopes all CSS variables */
.asset-demo-container {
  --asset-demo-bg: #0a0a0b;
  --asset-demo-surface: #141416;
  --asset-demo-surface-2: #1c1c1f;
  --asset-demo-border: rgba(255, 255, 255, 0.08);
  --asset-demo-border-hover: rgba(255, 255, 255, 0.15);
  --asset-demo-text: #fafafa;
  --asset-demo-text-dim: #888;
  --asset-demo-text-muted: #555;
  --asset-demo-accent: #10b981;
  --asset-demo-accent-dim: rgba(16, 185, 129, 0.15);
  --asset-demo-warning: #f59e0b;
  --asset-demo-warning-dim: rgba(245, 158, 11, 0.12);
  --asset-demo-radius: 8px;

  font-family:
    "Inter",
    -apple-system,
    system-ui,
    sans-serif;
  font-size: 14px;
  background: var(--asset-demo-bg);
  color: var(--asset-demo-text);
  line-height: 1.5;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 24px 32px;
  gap: 20px;
  position: relative;
}

/* Logout button */
.asset-demo-logout-btn {
  position: absolute;
  top: 24px;
  right: 32px;
  background: transparent;
  border: 1px solid var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
  padding: 8px;
  cursor: pointer;
  color: var(--asset-demo-text-dim);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-demo-logout-btn:hover {
  border-color: var(--asset-demo-border-hover);
  color: var(--asset-demo-text);
  background: var(--asset-demo-surface);
}

/* Header */
.asset-demo-header {
  text-align: center;
  flex-shrink: 0;
}

.asset-demo-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  background: linear-gradient(
    135deg,
    var(--asset-demo-text) 0%,
    var(--asset-demo-accent) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.asset-demo-header p {
  color: var(--asset-demo-text-dim);
  font-size: 0.875rem;
  margin-top: 4px;
}

/* Main grid */
.asset-demo-main {
  flex: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 0;
}

@media (max-width: 900px) {
  .asset-demo-main {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}

/* Panel */
.asset-demo-panel {
  width: 100%;
  background: var(--asset-demo-surface);
  border: 1px solid var(--asset-demo-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.asset-demo-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.asset-demo-panel-icon-svg {
  color: var(--asset-demo-accent);
  flex-shrink: 0;
}

.asset-demo-panel-title {
  font-weight: 600;
  font-size: 1rem;
}

/* Live badge */
.asset-demo-live-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--asset-demo-accent);
  background: var(--asset-demo-accent-dim);
  padding: 4px 10px;
  border-radius: 20px;
}

.asset-demo-live-dot {
  width: 6px;
  height: 6px;
  background: var(--asset-demo-accent);
  border-radius: 50%;
  animation: asset-demo-pulse 2s ease-in-out infinite;
}

/* Drop zone */
.asset-demo-drop-zone {
  border: 2px dashed var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--asset-demo-text-dim);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.asset-demo-drop-zone:hover {
  border-color: var(--asset-demo-border-hover);
  background: rgba(255, 255, 255, 0.02);
}

.asset-demo-drop-zone.dragging {
  border-color: var(--asset-demo-accent);
  background: var(--asset-demo-accent-dim);
  color: var(--asset-demo-accent);
}

.asset-demo-drop-zone svg {
  opacity: 0.6;
}

.asset-demo-drop-zone span {
  font-size: 0.875rem;
}

/* Login prompt in drop zone */
.asset-demo-login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.asset-demo-login-prompt p {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
}

.asset-demo-login-btn {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 8px 16px;
  background: var(--asset-demo-accent);
  color: var(--asset-demo-bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.asset-demo-login-btn:hover {
  opacity: 0.9;
}

/* Upload progress */
.asset-demo-upload-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-demo-upload-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--asset-demo-border);
  border-top-color: var(--asset-demo-accent);
  border-radius: 50%;
  animation: asset-demo-spin 0.8s linear infinite;
}

/* Sections */
.asset-demo-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.asset-demo-section:last-child,
.asset-demo-versions-section {
  flex: 1;
  min-height: 0;
}

.asset-demo-section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--asset-demo-text-muted);
  margin-bottom: 8px;
  flex-shrink: 0;
}

/* Version list */
.asset-demo-version-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.asset-demo-version-list::-webkit-scrollbar {
  width: 4px;
}

.asset-demo-version-list::-webkit-scrollbar-thumb {
  background: var(--asset-demo-border);
  border-radius: 2px;
}

.asset-demo-version-item {
  background: var(--asset-demo-surface-2);
  border: 1px solid var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.asset-demo-version-item:hover {
  border-color: var(--asset-demo-border-hover);
}

.asset-demo-version-item.published {
  border-color: var(--asset-demo-accent);
  background: var(--asset-demo-accent-dim);
}

.asset-demo-version-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
}

.asset-demo-version-item-preview {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease-out;
}

.asset-demo-version-item.expanded .asset-demo-version-item-preview {
  max-height: 300px;
}

.asset-demo-version-item-preview img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: contain;
  background: var(--asset-demo-bg);
  border-top: 1px solid var(--asset-demo-border);
}

.asset-demo-version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.asset-demo-version-number {
  font-weight: 600;
  font-family: monospace;
}

.asset-demo-version-state {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--asset-demo-surface);
  color: var(--asset-demo-text-muted);
}

.asset-demo-version-state.published {
  background: var(--asset-demo-accent-dim);
  color: var(--asset-demo-accent);
}

.asset-demo-version-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-demo-version-date {
  font-size: 0.75rem;
  color: var(--asset-demo-text-muted);
  font-family: monospace;
}

.asset-demo-restore-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 4px 10px;
  background: var(--asset-demo-warning-dim);
  color: var(--asset-demo-warning);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.asset-demo-restore-btn:hover {
  background: var(--asset-demo-warning);
  color: var(--asset-demo-bg);
}

/* Empty state */
.asset-demo-empty-card {
  padding: 20px;
  text-align: center;
  color: var(--asset-demo-text-muted);
  background: var(--asset-demo-surface-2);
  border: 1px solid var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
}

/* Viewer panel */
.asset-demo-viewer-display {
  flex: 1;
  background: var(--asset-demo-surface-2);
  border: 1px solid var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  overflow: hidden;
}

.asset-demo-viewer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  width: 100%;
  height: 100%;
}

.asset-demo-viewer-image {
  max-width: 100%;
  max-height: calc(100% - 40px);
  object-fit: contain;
  border-radius: 6px;
}

.asset-demo-viewer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--asset-demo-text-muted);
}

.asset-demo-viewer-empty svg {
  opacity: 0.3;
}

/* URL section */
.asset-demo-url-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  flex-shrink: 0;
}

.asset-demo-url-item {
  background: var(--asset-demo-surface-2);
  border: 1px solid var(--asset-demo-border);
  border-radius: var(--asset-demo-radius);
  padding: 12px;
}

.asset-demo-url-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.asset-demo-url-label strong {
  font-size: 0.8rem;
  font-weight: 600;
}

.asset-demo-url-label span {
  font-size: 0.7rem;
  color: var(--asset-demo-text-muted);
}

.asset-demo-url-value {
  display: block;
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--asset-demo-accent);
  text-decoration: none;
  background: var(--asset-demo-bg);
  padding: 8px 10px;
  border-radius: 4px;
  word-break: break-all;
  transition: background 0.15s;
}

.asset-demo-url-value:hover {
  background: var(--asset-demo-surface);
  text-decoration: underline;
}

/* Skeletons */
.asset-demo-skeleton {
  background: linear-gradient(
    90deg,
    var(--asset-demo-surface-2) 25%,
    var(--asset-demo-surface) 50%,
    var(--asset-demo-surface-2) 75%
  );
  background-size: 200% 100%;
  animation: asset-demo-shimmer 1.5s infinite;
  border-radius: var(--asset-demo-radius);
}

.asset-demo-skeleton-image {
  width: 100%;
  aspect-ratio: 16/9;
}

.asset-demo-skeleton-row {
  height: 44px;
  margin-bottom: 6px;
}

.asset-demo-skeleton-row:last-child {
  margin-bottom: 0;
}

.asset-demo-skeleton-viewer {
  width: 80%;
  height: 80%;
  max-height: 300px;
}

/* Animations */
@keyframes asset-demo-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes asset-demo-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes asset-demo-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive */
@media (max-width: 600px) {
  .asset-demo-container {
    padding: 16px;
    gap: 16px;
  }

  .asset-demo-header h1 {
    font-size: 1.5rem;
  }

  .asset-demo-version-date {
    display: none;
  }
}
`;
