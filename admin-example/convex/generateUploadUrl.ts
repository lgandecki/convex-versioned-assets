import { v } from "convex/values";
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
    // Auto-create folder if it doesn't exist
    await ctx.runMutation(
      components.versionedAssets.assetManager.createFolderByPath,
      { path: args.folderPath },
    );

    const result = await ctx.runMutation(
      components.versionedAssets.assetManager.startUpload,
      {
        ...args,
        r2Config: getR2Config(),
      },
    );
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
    return await ctx.runMutation(
      components.versionedAssets.assetManager.startUpload,
      {
        ...args,
        r2Config: getR2Config(),
      },
    );
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
  returns: v.object({
    assetId: v.string(),
    versionId: v.string(),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(
      components.versionedAssets.assetManager.finishUpload,
      {
        intentId: args.intentId,
        uploadResponse: args.uploadResponse,
        r2Config: getR2Config(),
        size: args.size,
        contentType: args.contentType,
      },
    );
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
  returns: v.object({
    assetId: v.string(),
    versionId: v.string(),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(
      components.versionedAssets.assetManager.finishUpload,
      {
        intentId: args.intentId,
        uploadResponse: args.uploadResponse,
        r2Config: getR2Config(),
        size: args.size,
        contentType: args.contentType,
      },
    );
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
    return await ctx.runAction(
      components.versionedAssets.signedUrl.getSignedUrl,
      {
        versionId,
        expiresIn,
        r2Config: getR2Config(),
      },
    );
  },
});
