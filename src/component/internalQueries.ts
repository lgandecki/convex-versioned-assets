import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get a version's storage info by ID.
 * Used by getSignedUrl action.
 */
export const getVersionStorageInfo = internalQuery({
  args: { versionId: v.id("assetVersions") },
  returns: v.union(
    v.null(),
    v.object({
      storageId: v.optional(v.id("_storage")),
      r2Key: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { versionId }) => {
    const version = await ctx.db.get(versionId);
    if (!version) return null;
    return { storageId: version.storageId, r2Key: version.r2Key };
  },
});

/**
 * Internal query to get version data needed for migration.
 * Returns storage info plus original filename for R2 key construction.
 * The caller (migration action) is responsible for constructing the full R2 key
 * using the r2KeyPrefix from their r2Config.
 */
export const getVersionForMigration = internalQuery({
  args: { versionId: v.id("assetVersions") },
  returns: v.union(
    v.null(),
    v.object({
      storageId: v.optional(v.id("_storage")),
      r2Key: v.optional(v.string()),
      contentType: v.optional(v.string()),
      originalFilename: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;

    return {
      storageId: version.storageId,
      r2Key: version.r2Key,
      contentType: version.contentType,
      originalFilename: version.originalFilename,
    };
  },
});
