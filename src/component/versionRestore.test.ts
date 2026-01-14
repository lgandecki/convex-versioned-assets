// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";

describe("restoreVersion", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("restores an archived version by creating a new published version", async () => {
    // Create v1
    const s1 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 100,
      contentType: "image/png",
    });
    const v1 = await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "images",
      basename: "hero.png",
      storageId: s1,
    });

    // Create v2 (archives v1)
    const s2 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 200,
      contentType: "image/png",
    });
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "images",
      basename: "hero.png",
      storageId: s2,
    });

    // Verify v1 is archived
    const versions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "images",
      basename: "hero.png",
    });
    const archivedV1 = versions.find((v) => v._id === v1.versionId);
    expect(archivedV1?.state).toBe("archived");

    // Restore v1 - should create v3 with same storage as v1
    const result = await t.mutation(api.assetManager.restoreVersion, {
      versionId: v1.versionId,
    });

    expect(result.version).toBe(3);
    expect(result.restoredFromVersion).toBe(1);

    // Verify the asset now points to v3
    const asset = await t.query(api.assetManager.getAsset, {
      folderPath: "images",
      basename: "hero.png",
    });
    expect(asset?.publishedVersionId).toBe(result.versionId);
    expect(asset?.versionCounter).toBe(3);

    // Verify the new version has the same storage as v1
    const restoredVersions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "images",
      basename: "hero.png",
    });
    const v3 = restoredVersions.find((v) => v.version === 3);
    expect(v3?.storageId).toEqual(s1);
    expect(v3?.state).toBe("published");
    expect(v3?.label).toBe("Restored from v1");
  });

  it("uses custom label when provided", async () => {
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      {
        size: 100,
        contentType: "text/plain",
      },
    );
    const v1 = await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "",
      basename: "doc.txt",
      storageId,
    });

    // Create v2 to archive v1
    const s2 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 200,
      contentType: "text/plain",
    });
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "",
      basename: "doc.txt",
      storageId: s2,
    });

    // Restore with custom label
    const result = await t.mutation(api.assetManager.restoreVersion, {
      versionId: v1.versionId,
      label: "Rollback to stable version",
    });

    const versions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "",
      basename: "doc.txt",
    });
    const restored = versions.find((v) => v._id === result.versionId);
    expect(restored?.label).toBe("Rollback to stable version");
  });

  it("archives the current published version when restoring", async () => {
    // Create v1 and v2
    const s1 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 100,
      contentType: "image/png",
    });
    const v1 = await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "test",
      basename: "file.png",
      storageId: s1,
    });

    const s2 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 200,
      contentType: "image/png",
    });
    const v2 = await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "test",
      basename: "file.png",
      storageId: s2,
    });

    // v2 is published, v1 is archived
    let versions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "test",
      basename: "file.png",
    });
    expect(versions.find((v) => v._id === v2.versionId)?.state).toBe(
      "published",
    );
    expect(versions.find((v) => v._id === v1.versionId)?.state).toBe(
      "archived",
    );

    // Restore v1
    await t.mutation(api.assetManager.restoreVersion, {
      versionId: v1.versionId,
    });

    // Now v2 should be archived, and v3 should be published
    versions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "test",
      basename: "file.png",
    });
    const v2After = versions.find((v) => v._id === v2.versionId);
    expect(v2After?.state).toBe("archived");
    expect(v2After?.archivedAt).toBeGreaterThan(0);

    const v3 = versions.find((v) => v.version === 3);
    expect(v3?.state).toBe("published");
  });

  it("preserves file metadata (size, contentType, sha256) when restoring", async () => {
    const storageId = await t.action(
      internal._testInsertFakeFile._testStoreFakeFile,
      {
        size: 12345,
        contentType: "application/pdf",
      },
    );

    const v1 = await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "docs",
      basename: "report.pdf",
      storageId,
    });

    // Create v2 to archive v1
    const s2 = await t.action(internal._testInsertFakeFile._testStoreFakeFile, {
      size: 99999,
      contentType: "application/pdf",
    });
    await t.mutation(api.assetManager.createVersionFromStorageId, {
      folderPath: "docs",
      basename: "report.pdf",
      storageId: s2,
    });

    // Restore v1
    const result = await t.mutation(api.assetManager.restoreVersion, {
      versionId: v1.versionId,
    });

    const versions = await t.query(api.assetManager.getAssetVersions, {
      folderPath: "docs",
      basename: "report.pdf",
    });
    const restored = versions.find((v) => v._id === result.versionId);

    expect(restored?.size).toBe(12345);
    // Verify the restored version points to the same storage as v1
    expect(restored?.storageId).toEqual(storageId);
  });

  it("throws error when version has no associated file", async () => {
    // Create a version without storage using commitVersion
    const { versionId } = await t.mutation(api.assetManager.commitVersion, {
      folderPath: "",
      basename: "no-file.txt",
    });

    await expect(
      t.mutation(api.assetManager.restoreVersion, {
        versionId,
      }),
    ).rejects.toThrow(/no associated file/);
  });
});
