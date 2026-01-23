import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to update a version's r2Key and r2PublicUrl after migration.
 * Used by migrateVersionToR2Action.
 */
export const setVersionR2Key = internalMutation({
  args: {
    versionId: v.id("assetVersions"),
    r2Key: v.string(),
    r2PublicUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, {
      r2Key: args.r2Key,
      r2PublicUrl: args.r2PublicUrl,
    });
    return null;
  },
});

/**
 * Internal mutation to update a version's r2PublicUrl during backfill.
 * Used by backfillR2PublicUrlAction.
 */
export const setVersionR2PublicUrl = internalMutation({
  args: {
    versionId: v.id("assetVersions"),
    r2PublicUrl: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version || !version.r2Key || version.r2PublicUrl) {
      return false; // Skip if not applicable
    }
    await ctx.db.patch(args.versionId, { r2PublicUrl: args.r2PublicUrl });
    return true;
  },
});
