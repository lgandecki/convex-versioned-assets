/**
 * Versioned Assets API wrappers.
 *
 * These functions wrap the convex-versioned-assets component
 * with proper authentication and authorization.
 */
import { v } from "convex/values";
import { components } from "./_generated/api";
import { adminQuery, adminMutation, adminAction, authedMutation, publicQuery, } from "./functions";
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
    args: {
        folderPath: v.string(),
        basename: v.string(),
        newBasename: v.string(),
    },
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
        return await ctx.runQuery(components.versionedAssets.assetManager.listPublishedFilesInFolder, args);
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
    args: {
        cursorCreatedAt: v.number(),
        cursorId: v.string(),
        limit: v.optional(v.number()),
    },
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
//# sourceMappingURL=versionedAssets.js.map