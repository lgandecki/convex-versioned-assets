// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";

describe("Convex soft-delete management", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  describe("listPendingConvexDeletions", () => {
    it("returns empty array when no deletions pending", async () => {
      const result = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(result).toEqual([]);
    });

    it("returns pending deletions with correct shape", async () => {
      // Insert a pending deletion directly (simulating what happens when deleteFile is called)
      const storageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );

      await t.run(async (ctx) => {
        await ctx.db.insert("pendingConvexDeletions", {
          storageId,
          originalPath: "folder/file.png",
          deletedAt: Date.now(),
          deleteAfter: Date.now() + 1000 * 60 * 60 * 24 * 30,
          deletedBy: "test-user",
        });
      });

      const result = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        storageId,
        originalPath: "folder/file.png",
        deletedBy: "test-user",
      });
      expect(result[0]._id).toBeDefined();
      expect(result[0]._creationTime).toBeDefined();
      expect(result[0].deletedAt).toBeGreaterThan(0);
      expect(result[0].deleteAfter).toBeGreaterThan(result[0].deletedAt);
    });

    it("filters by expiration when onlyExpired is true", async () => {
      const now = Date.now();
      const expiredStorageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );
      const pendingStorageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 200, contentType: "image/png" },
      );

      await t.run(async (ctx) => {
        // Expired deletion
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: expiredStorageId,
          originalPath: "expired.png",
          deletedAt: now - 1000 * 60 * 60 * 24 * 31,
          deleteAfter: now - 1000, // Already passed
        });

        // Not yet expired
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: pendingStorageId,
          originalPath: "pending.png",
          deletedAt: now,
          deleteAfter: now + 1000 * 60 * 60 * 24 * 30,
        });
      });

      const allResults = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(allResults).toHaveLength(2);

      const expiredResults = await t.query(
        api.assetManager.listPendingConvexDeletions,
        { onlyExpired: true },
      );
      expect(expiredResults).toHaveLength(1);
      expect(expiredResults[0].originalPath).toBe("expired.png");
    });

    it("respects limit parameter", async () => {
      const now = Date.now();

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          const storageId = await ctx.storage.store(new Blob(["test"]));
          await ctx.db.insert("pendingConvexDeletions", {
            storageId,
            originalPath: `file${i}.png`,
            deletedAt: now,
            deleteAfter: now + 1000 * 60 * 60 * 24 * 30,
          });
        }
      });

      const result = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {
          limit: 3,
        },
      );
      expect(result).toHaveLength(3);
    });
  });

  describe("processExpiredConvexDeletions", () => {
    it("processes only expired deletions by default", async () => {
      const now = Date.now();
      const expired1 = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );
      const expired2 = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 200, contentType: "image/png" },
      );
      const pending = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 300, contentType: "image/png" },
      );

      await t.run(async (ctx) => {
        // Expired
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: expired1,
          originalPath: "expired1.png",
          deletedAt: now - 1000,
          deleteAfter: now - 1,
        });
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: expired2,
          originalPath: "expired2.png",
          deletedAt: now - 1000,
          deleteAfter: now - 1,
        });
        // Not expired
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: pending,
          originalPath: "pending.png",
          deletedAt: now,
          deleteAfter: now + 1000 * 60 * 60 * 24 * 30,
        });
      });

      const result = await t.mutation(
        api.assetManager.processExpiredConvexDeletions,
        {},
      );

      expect(result.processed).toBe(2);

      // Verify the pending one is still there
      const remaining = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].originalPath).toBe("pending.png");
    });

    it("processes all deletions when forceAll is true", async () => {
      const now = Date.now();

      await t.run(async (ctx) => {
        for (let i = 0; i < 2; i++) {
          const storageId = await ctx.storage.store(new Blob(["test"]));
          await ctx.db.insert("pendingConvexDeletions", {
            storageId,
            originalPath: `pending${i}.png`,
            deletedAt: now,
            deleteAfter: now + 1000 * 60 * 60 * 24 * 30,
          });
        }
      });

      const result = await t.mutation(
        api.assetManager.processExpiredConvexDeletions,
        { forceAll: true },
      );

      expect(result.processed).toBe(2);

      const remaining = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(remaining).toHaveLength(0);
    });

    it("returns hasMore when batch limit reached", async () => {
      const now = Date.now();

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          const storageId = await ctx.storage.store(new Blob(["test"]));
          await ctx.db.insert("pendingConvexDeletions", {
            storageId,
            originalPath: `path${i}.png`,
            deletedAt: now - 1000,
            deleteAfter: now - 1,
          });
        }
      });

      const result = await t.mutation(
        api.assetManager.processExpiredConvexDeletions,
        { batchSize: 3 },
      );

      expect(result.processed).toBe(3);
      expect(result.hasMore).toBe(true);

      const remaining = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(remaining).toHaveLength(2);
    });

    it("returns hasMore: false when all items processed", async () => {
      const now = Date.now();

      await t.run(async (ctx) => {
        const storageId = await ctx.storage.store(new Blob(["test"]));
        await ctx.db.insert("pendingConvexDeletions", {
          storageId,
          originalPath: "single.png",
          deletedAt: now - 1000,
          deleteAfter: now - 1,
        });
      });

      const result = await t.mutation(
        api.assetManager.processExpiredConvexDeletions,
        {},
      );

      expect(result.processed).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("cancelPendingConvexDeletion", () => {
    it("cancels an existing pending deletion", async () => {
      const storageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );

      await t.run(async (ctx) => {
        await ctx.db.insert("pendingConvexDeletions", {
          storageId,
          originalPath: "to-cancel.png",
          deletedAt: Date.now(),
          deleteAfter: Date.now() + 1000 * 60 * 60 * 24 * 30,
        });
      });

      const result = await t.mutation(
        api.assetManager.cancelPendingConvexDeletion,
        { storageId },
      );

      expect(result.cancelled).toBe(true);

      const remaining = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(remaining).toHaveLength(0);
    });

    it("returns cancelled: false for non-existent storage ID", async () => {
      const storageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );

      const result = await t.mutation(
        api.assetManager.cancelPendingConvexDeletion,
        { storageId }, // No pending deletion exists for this
      );

      expect(result.cancelled).toBe(false);
    });

    it("only cancels the specific storage ID, not others", async () => {
      const storageId1 = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100, contentType: "image/png" },
      );
      const storageId2 = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 200, contentType: "image/png" },
      );

      await t.run(async (ctx) => {
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: storageId1,
          originalPath: "keep.png",
          deletedAt: Date.now(),
          deleteAfter: Date.now() + 1000 * 60 * 60 * 24 * 30,
        });
        await ctx.db.insert("pendingConvexDeletions", {
          storageId: storageId2,
          originalPath: "cancel.png",
          deletedAt: Date.now(),
          deleteAfter: Date.now() + 1000 * 60 * 60 * 24 * 30,
        });
      });

      await t.mutation(api.assetManager.cancelPendingConvexDeletion, {
        storageId: storageId2,
      });

      const remaining = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].storageId).toEqual(storageId1);
    });
  });

  describe("integration: deleteFile queues pending deletion", () => {
    it("queues Convex storage deletion when deleting a file", async () => {
      // Create an asset with Convex storage
      const storageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 1000, contentType: "image/png" },
      );

      await t.mutation(api.assetManager.createVersionFromStorageId, {
        folderPath: "test-folder",
        basename: "to-delete.png",
        storageId,
      });

      // Delete the file
      const result = await t.mutation(api.assetManager.deleteFile, {
        folderPath: "test-folder",
        basename: "to-delete.png",
      });

      expect(result.deleted).toBe(true);

      // Check that a pending deletion was queued
      const pending = await t.query(
        api.assetManager.listPendingConvexDeletions,
        {},
      );
      expect(pending).toHaveLength(1);
      expect(pending[0].storageId).toEqual(storageId);
      expect(pending[0].originalPath).toBe("test-folder/to-delete.png");
    });
  });
});
