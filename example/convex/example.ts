import { mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { v } from "convex/values";

// Demo asset path - a single image we'll version
const DEMO_FOLDER = "demo";
const DEMO_ASSET = "hero-image";

/**
 * Get the current published image for the demo.
 */
export const getCurrentImage = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(
      components.versionedAssets.assetManager.getPublishedFile,
      { folderPath: DEMO_FOLDER, basename: DEMO_ASSET },
    );
  },
});

/**
 * Get all versions of the demo image.
 */
export const getVersionHistory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(
      components.versionedAssets.assetManager.getAssetVersions,
      { folderPath: DEMO_FOLDER, basename: DEMO_ASSET },
    );
  },
});

/**
 * Start an upload for a new version of the demo image.
 */
export const startImageUpload = mutation({
  args: { filename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.versionedAssets.assetManager.startUpload,
      {
        folderPath: DEMO_FOLDER,
        basename: DEMO_ASSET,
        filename: args.filename,
      },
    );
  },
});

/**
 * Finish the upload after file has been uploaded to presigned URL.
 * For Convex storage, we need to pass the storageId from the upload response.
 */
export const finishImageUpload = mutation({
  args: {
    intentId: v.string(),
    storageId: v.string(),
    size: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.versionedAssets.assetManager.finishUpload,
      {
        intentId: args.intentId as never,
        uploadResponse: { storageId: args.storageId },
        size: args.size,
        contentType: args.contentType,
      },
    );
  },
});

/**
 * Restore a previous version as the current published version.
 */
export const restoreVersion = mutation({
  args: { versionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.versionedAssets.assetManager.restoreVersion,
      { versionId: args.versionId as never },
    );
  },
});

/**
 * Get preview URL for any version (including archived).
 */
export const getVersionPreview = query({
  args: { versionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.versionedAssets.assetFsHttp.getVersionPreviewUrl,
      { versionId: args.versionId as never },
    );
  },
});
