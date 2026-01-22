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
import { adminQuery, adminMutation, adminAction, publicQuery } from "./functions";

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

export const getAssetVersions = adminQuery({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getAssetVersions, args);
  },
});

export const getPublishedFile = adminQuery({
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

export const restoreVersion = adminMutation({
  args: { versionId: v.string(), label: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.versionedAssets.assetManager.restoreVersion, args);
  },
});

// ============================================================================
// Preview & Content Operations
// ============================================================================

export const getVersionPreviewUrl = adminQuery({
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
`;

/**
 * generateUploadUrl.ts - Upload functions with R2 support.
 */
export const generateUploadUrlTemplate = `import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { adminMutation, publicQuery, publicAction } from "./functions";

/**
 * Get R2 config from env vars. Returns undefined if not configured.
 * Called once per request, passed to component functions.
 */
function getR2Config() {
  if (!process.env.R2_BUCKET) return undefined;
  return {
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ENDPOINT: process.env.R2_ENDPOINT!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
  };
}

// =============================================================================
// Storage Backend Configuration
// =============================================================================

const storageBackendValidator = v.union(v.literal("convex"), v.literal("r2"));

/**
 * Configure which storage backend to use for new uploads - ADMIN ONLY.
 * Default is "convex". Call with "r2" to use Cloudflare R2.
 */
export const configureStorageBackend = adminMutation({
  args: {
    backend: storageBackendValidator,
    r2PublicUrl: v.optional(v.string()),
    r2KeyPrefix: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.versionedAssets.assetManager.configureStorageBackend,
      args,
    );
  },
});

/**
 * Get the current storage backend configuration.
 */
export const getStorageBackendConfig = publicQuery({
  args: {},
  returns: storageBackendValidator,
  handler: async (ctx) => {
    return await ctx.runQuery(components.versionedAssets.assetManager.getStorageBackendConfig, {});
  },
});

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
export const startUpload = adminMutation({
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
export const finishUpload = adminMutation({
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
