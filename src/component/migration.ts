import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createR2Client } from "./r2Client";
import { r2ConfigValidator } from "./validators";

// Default retention period for soft-deleted files (30 days)
const DELETION_RETENTION_DAYS = 30;

// =============================================================================
// Migration Action
// =============================================================================

/**
 * Migrate a single asset version from Convex storage to R2.
 *
 * This action:
 * 1. Reads the file blob from Convex storage
 * 2. Uploads it to R2 with a structured key: {prefix/}{versionId}/{filename}
 * 3. Updates the version record with the new r2Key and r2PublicUrl
 * 4. Keeps the original storageId for rollback safety
 *
 * Prerequisites:
 * - Version must exist and have a storageId (Convex-stored file)
 * - Version must not already have an r2Key
 *
 * @returns The r2Key of the migrated file
 */
export const migrateVersionToR2Action = action({
  args: {
    versionId: v.id("assetVersions"),
    r2Config: r2ConfigValidator,
  },
  returns: v.object({
    r2Key: v.string(),
    versionId: v.id("assetVersions"),
  }),
  handler: async (ctx, args) => {
    // 1. Get version metadata via internal query
    const versionData = await ctx.runQuery(
      internal.internalQueries.getVersionForMigration,
      { versionId: args.versionId },
    );

    if (!versionData) {
      throw new Error("Version not found");
    }
    if (!versionData.storageId) {
      throw new Error("No Convex file to migrate - version has no storageId");
    }
    if (versionData.r2Key) {
      throw new Error(
        `Version already has an R2 key: ${versionData.r2Key}. Use cleanupMigratedVersion to remove the Convex copy.`,
      );
    }

    // 2. Read blob from Convex storage
    const blob = await ctx.storage.get(versionData.storageId);
    if (!blob) {
      throw new Error(
        `File not found in Convex storage for storageId: ${versionData.storageId}`,
      );
    }

    // 3. Construct R2 key using prefix from r2Config
    const prefix = args.r2Config.R2_KEY_PREFIX
      ? `${args.r2Config.R2_KEY_PREFIX}/`
      : "";
    const filename = versionData.originalFilename ?? args.versionId;
    const targetR2Key = `${prefix}${args.versionId}/${filename}`;

    // 4. Upload to R2 using @convex-dev/r2's store() method
    const r2Client = createR2Client(args.r2Config);
    const r2Key = await r2Client.store(ctx, blob, {
      key: targetR2Key,
      type: versionData.contentType,
    });

    // 5. Update version record with r2Key and r2PublicUrl (keep storageId for rollback)
    await ctx.runMutation(internal.internalMutations.setVersionR2Key, {
      versionId: args.versionId,
      r2Key,
      r2PublicUrl: args.r2Config.R2_PUBLIC_URL,
    });

    return { r2Key, versionId: args.versionId };
  },
});

// =============================================================================
// Query: List Versions to Migrate
// =============================================================================

/**
 * List asset versions that need migration from Convex storage to R2.
 * Returns versions that have a storageId but no r2Key.
 *
 * Supports pagination for large migrations.
 */
export const listVersionsToMigrate = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("assetVersions")),
  },
  returns: v.object({
    versions: v.array(
      v.object({
        versionId: v.id("assetVersions"),
        assetPath: v.string(),
        size: v.optional(v.number()),
        contentType: v.optional(v.string()),
        version: v.number(),
      }),
    ),
    nextCursor: v.optional(v.id("assetVersions")),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Query versions with storageId but no r2Key
    // Unfortunately Convex doesn't support filtering on undefined directly in indexes,
    // so we need to collect and filter
    const allVersions = await ctx.db.query("assetVersions").collect();

    // Filter to versions that need migration: have storageId, don't have r2Key
    const needsMigration = allVersions.filter(
      (v) => v.storageId !== undefined && v.r2Key === undefined,
    );

    // Apply cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = needsMigration.findIndex(
        (v) => v._id === args.cursor,
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const page = needsMigration.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const results = hasMore ? page.slice(0, limit) : page;

    // Get asset paths for display
    const versionsWithPaths = await Promise.all(
      results.map(async (version) => {
        const asset = await ctx.db.get(version.assetId);
        const assetPath = asset
          ? `${asset.folderPath}/${asset.basename}`
          : "unknown";

        return {
          versionId: version._id,
          assetPath,
          size: version.size,
          contentType: version.contentType,
          version: version.version,
        };
      }),
    );

    return {
      versions: versionsWithPaths,
      nextCursor: hasMore ? results[results.length - 1]._id : undefined,
      total: needsMigration.length,
    };
  },
});

// =============================================================================
// Query: Get Migration Stats
// =============================================================================

/**
 * Get statistics about migration progress.
 * Useful for monitoring migration progress in dashboards.
 */
export const getMigrationStats = query({
  args: {},
  returns: v.object({
    totalVersions: v.number(),
    onConvexOnly: v.number(),
    onR2Only: v.number(),
    onBoth: v.number(),
    noStorage: v.number(),
  }),
  handler: async (ctx) => {
    const allVersions = await ctx.db.query("assetVersions").collect();

    let onConvexOnly = 0;
    let onR2Only = 0;
    let onBoth = 0;
    let noStorage = 0;

    for (const version of allVersions) {
      const hasConvex = version.storageId !== undefined;
      const hasR2 = version.r2Key !== undefined;

      if (hasConvex && hasR2) {
        onBoth++;
      } else if (hasConvex) {
        onConvexOnly++;
      } else if (hasR2) {
        onR2Only++;
      } else {
        noStorage++;
      }
    }

    return {
      totalVersions: allVersions.length,
      onConvexOnly,
      onR2Only,
      onBoth,
      noStorage,
    };
  },
});

// =============================================================================
// Mutation: Cleanup Migrated Version
// =============================================================================

/**
 * Remove the Convex storage copy after migration is verified.
 *
 * This mutation:
 * 1. Verifies the version has been migrated to R2
 * 2. Queues the Convex file for soft-delete (30-day retention)
 * 3. Clears the storageId from the version record
 *
 * The file remains recoverable for 30 days via the pendingConvexDeletions table.
 * Call processExpiredConvexDeletions to permanently delete after retention period.
 */
export const cleanupMigratedVersion = mutation({
  args: { versionId: v.id("assetVersions") },
  returns: v.object({
    cleaned: v.boolean(),
    storageId: v.optional(v.id("_storage")),
  }),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);

    if (!version) {
      throw new Error("Version not found");
    }
    if (!version.r2Key) {
      throw new Error(
        "Version not migrated to R2 yet - cannot cleanup Convex storage",
      );
    }
    if (!version.storageId) {
      throw new Error("Version has no Convex storageId to cleanup");
    }

    // Get asset for path info
    const asset = await ctx.db.get(version.assetId);
    const originalPath = asset
      ? `${asset.folderPath}/${asset.basename}`
      : `version:${args.versionId}`;

    // Queue the Convex file for deferred deletion
    const now = Date.now();
    await ctx.db.insert("pendingConvexDeletions", {
      storageId: version.storageId,
      originalPath,
      deletedAt: now,
      deleteAfter: now + DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      deletedBy: "migration-cleanup",
    });

    const storageId = version.storageId;

    // Clear the storageId from the version
    await ctx.db.patch(args.versionId, { storageId: undefined });

    return { cleaned: true, storageId };
  },
});

// =============================================================================
// Mutation: Batch Cleanup Migrated Versions
// =============================================================================

/**
 * Cleanup multiple migrated versions in a single mutation.
 * Useful for cleaning up after batch migrations.
 *
 * Skips versions that aren't ready for cleanup (no r2Key or no storageId).
 * Returns counts of cleaned vs skipped versions.
 */
export const batchCleanupMigratedVersions = mutation({
  args: {
    versionIds: v.array(v.id("assetVersions")),
  },
  returns: v.object({
    cleaned: v.number(),
    skipped: v.number(),
    errors: v.array(
      v.object({
        versionId: v.id("assetVersions"),
        reason: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    let cleaned = 0;
    let skipped = 0;
    const errors: {
      versionId: (typeof args.versionIds)[number];
      reason: string;
    }[] = [];
    const now = Date.now();

    for (const versionId of args.versionIds) {
      const version = await ctx.db.get(versionId);

      if (!version) {
        errors.push({ versionId, reason: "Version not found" });
        skipped++;
        continue;
      }

      if (!version.r2Key) {
        errors.push({ versionId, reason: "Not migrated to R2 yet" });
        skipped++;
        continue;
      }

      if (!version.storageId) {
        // Already cleaned up, skip silently
        skipped++;
        continue;
      }

      // Get asset for path info
      const asset = await ctx.db.get(version.assetId);
      const originalPath = asset
        ? `${asset.folderPath}/${asset.basename}`
        : `version:${versionId}`;

      // Queue the Convex file for deferred deletion
      await ctx.db.insert("pendingConvexDeletions", {
        storageId: version.storageId,
        originalPath,
        deletedAt: now,
        deleteAfter: now + DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        deletedBy: "migration-cleanup-batch",
      });

      // Clear the storageId from the version
      await ctx.db.patch(versionId, { storageId: undefined });
      cleaned++;
    }

    return { cleaned, skipped, errors };
  },
});

// =============================================================================
// R2 Public URL Backfill Migration
// =============================================================================

/**
 * Query: Find versions that need r2PublicUrl backfilled.
 * Returns IDs only (lightweight) with pagination.
 *
 * These are versions that have an r2Key but no stored r2PublicUrl.
 * After running the backfill action, all R2 versions will have their
 * public URL stored directly on the version record.
 */
export const listVersionsNeedingR2PublicUrl = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("assetVersions")),
  },
  returns: v.object({
    versionIds: v.array(v.id("assetVersions")),
    nextCursor: v.optional(v.id("assetVersions")),
    hasMore: v.boolean(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all versions and filter
    // (No index on r2Key+r2PublicUrl, so we filter in memory)
    const allVersions = await ctx.db.query("assetVersions").collect();

    // Filter to versions that have r2Key but no r2PublicUrl
    const needsUpdate = allVersions.filter(
      (v) => v.r2Key !== undefined && v.r2PublicUrl === undefined,
    );

    // Apply cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = needsUpdate.findIndex((v) => v._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const page = needsUpdate.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const results = hasMore ? page.slice(0, limit) : page;

    return {
      versionIds: results.map((v) => v._id),
      nextCursor: hasMore ? results[results.length - 1]._id : undefined,
      hasMore,
      total: needsUpdate.length,
    };
  },
});

/**
 * Mutation: Update a single version with r2PublicUrl.
 * Called in a loop from the backfill action.
 */
export const setVersionR2PublicUrl = mutation({
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

// Note: backfillR2PublicUrlAction was removed to avoid circular type references.
// Users can implement backfill in their app layer using:
// - listVersionsNeedingR2PublicUrl (query)
// - setVersionR2PublicUrl (mutation)
