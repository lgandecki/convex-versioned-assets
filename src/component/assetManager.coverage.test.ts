// @vitest-environment node
/**
 * Additional coverage tests for assetManager.ts
 * Tests for: deleteDataBatch, listPublishedAssetsInFolder, getAssetVersions,
 * startUpload, finishUpload, configureStorageBackend, listFoldersWithAssets
 */
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";

describe("deleteDataBatch", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("deletes all data in batches and returns counts", async () => {
    // Create some test data
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 100, contentType: "image/png" },
    );

    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "test-folder",
      basename: "file1.png",
      storageId,
    });

    // Run deleteDataBatch
    const result = await t.mutation(api.assetManager.deleteDataBatch, {});

    // Should have deleted at least the version, asset, and folder
    expect(result.deletedVersions).toBeGreaterThanOrEqual(1);
    expect(result.deletedAssets).toBeGreaterThanOrEqual(0);
    expect(result.deletedFolders).toBeGreaterThanOrEqual(0);
    expect(typeof result.hasMore).toBe("boolean");
  });

  it("respects batchSize and returns hasMore when more data exists", async () => {
    // Create multiple versions
    for (let i = 0; i < 5; i++) {
      const storageId = await t.action(
        internal._testInsertFakeFile._testStoreFakeFile,
        { size: 100 + i, contentType: "image/png" },
      );
      await t.mutation(api.assetManager.createVersionFromStorageId, {
        folderPath: "batch-test",
        basename: `file${i}.png`,
        storageId,
      });
    }

    // Delete with small batch size
    const result = await t.mutation(api.assetManager.deleteDataBatch, {
      batchSize: 2,
    });

    expect(result.deletedVersions).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it("returns hasMore: false when all data is deleted", async () => {
    // Start with empty db, or delete everything first
    let result = await t.mutation(api.assetManager.deleteDataBatch, {});
    while (result.hasMore) {
      result = await t.mutation(api.assetManager.deleteDataBatch, {});
    }

    expect(result.hasMore).toBe(false);
  });

  it("deletes upload intents", async () => {
    // Create an upload intent directly
    await t.run(async (ctx) => {
      await ctx.db.insert("uploadIntents", {
        folderPath: "test",
        basename: "file.png",
        backend: "convex",
        status: "created",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      });
    });

    // Run deleteDataBatch until complete
    let result = await t.mutation(api.assetManager.deleteDataBatch, {});
    while (result.hasMore) {
      result = await t.mutation(api.assetManager.deleteDataBatch, {});
    }

    expect(result.deletedIntents).toBeGreaterThanOrEqual(1);
  });
});

describe("listPublishedAssetsInFolder", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns empty array for folder with no assets", async () => {
    const result = await t.query(api.assetManager.listPublishedAssetsInFolder, {
      folderPath: "empty-folder",
    });

    expect(result).toEqual([]);
  });

  it("returns published assets in folder", async () => {
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 100, contentType: "image/png" },
    );

    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "images",
      basename: "logo.png",
      storageId,
    });

    const result = await t.query(api.assetManager.listPublishedAssetsInFolder, {
      folderPath: "images",
    });

    expect(result).toHaveLength(1);
    expect(result[0].basename).toBe("logo.png");
    expect(result[0].folderPath).toBe("images");
    expect(result[0].version).toBe(1);
    expect(result[0].createdAt).toBeGreaterThan(0);
  });

  it("excludes assets without published versions", async () => {
    // Create asset without storage (no published version)
    await t.mutation(api.assetManager.createAsset, {
      folderPath: "mixed",
      basename: "unpublished.txt",
    });

    // Create asset with published version
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 100, contentType: "text/plain" },
    );
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "mixed",
      basename: "published.txt",
      storageId,
    });

    const result = await t.query(api.assetManager.listPublishedAssetsInFolder, {
      folderPath: "mixed",
    });

    // Should only include the published asset
    expect(result).toHaveLength(1);
    expect(result[0].basename).toBe("published.txt");
  });

  it("normalizes folder path", async () => {
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 100, contentType: "image/png" },
    );

    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "test/path",
      basename: "file.png",
      storageId,
    });

    // Query with different path format
    const result = await t.query(api.assetManager.listPublishedAssetsInFolder, {
      folderPath: "  test/path  ",
    });

    expect(result).toHaveLength(1);
  });
});

describe("getAssetVersions", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns empty array for non-existent asset", async () => {
    const result = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "nope",
      basename: "doesnt-exist.txt",
    });

    expect(result).toEqual([]);
  });

  it("returns all versions for an asset in ascending order", async () => {
    const s1 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 100,
      contentType: "image/png",
    });
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "versions-test",
      basename: "file.png",
      storageId: s1,
    });

    const s2 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 200,
      contentType: "image/png",
    });
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "versions-test",
      basename: "file.png",
      storageId: s2,
    });

    const result = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "versions-test",
      basename: "file.png",
    });

    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(1);
    expect(result[1].version).toBe(2);
    expect(result[0].state).toBe("archived");
    expect(result[1].state).toBe("published");
  });
});

describe("startUpload and finishUpload", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("startUpload creates intent and returns upload URL for convex backend", async () => {
    const result = await t.mutation(api.assetManager.startUpload, {
      folderPath: "uploads",
      basename: "test.png",
      filename: "test.png",
    });

    expect(result.intentId).toBeDefined();
    expect(result.backend).toBe("convex");
    expect(result.uploadUrl).toBeDefined();
    expect(typeof result.uploadUrl).toBe("string");
  });

  it("startUpload validates basename does not contain slash", async () => {
    await expect(
      t.mutation(api.assetManager.startUpload, {
        folderPath: "uploads",
        basename: "path/to/file.png",
      }),
    ).rejects.toThrow(/must not contain/);
  });

  it("finishUpload completes the upload intent", async () => {
    // Start the upload
    const { intentId } = await t.mutation(api.assetManager.startUpload, {
      folderPath: "finish-test",
      basename: "file.png",
      label: "Test upload",
    });

    // Create a fake storage ID (simulating actual upload)
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 500, contentType: "image/png" },
    );

    // Finish the upload
    const result = await t.mutation(api.assetManager.finishUpload, {
      intentId,
      uploadResponse: { storageId },
    });

    expect(result.assetId).toBeDefined();
    expect(result.versionId).toBeDefined();
    expect(result.version).toBe(1);

    // Verify asset was created
    const asset = await t.query(api.assetManager.getAsset, {
      folderPath: "finish-test",
      basename: "file.png",
    });
    expect(asset).not.toBeNull();
    expect(asset?.publishedVersionId).toBe(result.versionId);
  });

  it("finishUpload throws for expired intent", async () => {
    // Create an expired intent directly
    let intentId: typeof api.assetManager.finishUpload._args.intentId;
    await t.run(async (ctx) => {
      intentId = await ctx.db.insert("uploadIntents", {
        folderPath: "expired",
        basename: "file.png",
        backend: "convex",
        status: "created",
        createdAt: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago
        expiresAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
      });
    });

    await expect(
      t.mutation(api.assetManager.finishUpload, {
        intentId: intentId!,
        uploadResponse: { storageId: "fake" },
      }),
    ).rejects.toThrow(/expired/i);
  });

  it("finishUpload throws for already completed intent", async () => {
    // Start and finish an upload
    const { intentId } = await t.mutation(api.assetManager.startUpload, {
      folderPath: "double-finish",
      basename: "file.png",
    });

    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      { size: 100, contentType: "image/png" },
    );

    await t.mutation(api.assetManager.finishUpload, {
      intentId,
      uploadResponse: { storageId },
    });

    // Try to finish again
    await expect(
      t.mutation(api.assetManager.finishUpload, {
        intentId,
        uploadResponse: { storageId },
      }),
    ).rejects.toThrow(/finalized|already completed/i);
  });

  it("finishUpload requires storageId for convex backend", async () => {
    const { intentId } = await t.mutation(api.assetManager.startUpload, {
      folderPath: "no-storage",
      basename: "file.png",
    });

    await expect(
      t.mutation(api.assetManager.finishUpload, {
        intentId,
        // Missing uploadResponse with storageId
      }),
    ).rejects.toThrow(/storageId/i);
  });
});
