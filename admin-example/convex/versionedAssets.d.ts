export declare const listFolders: import("convex/server").RegisteredQuery<"public", {
    parentPath?: string | undefined;
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    createdAt: number;
    createdBy?: string;
    name: string;
    path: string;
    updatedAt: number;
    updatedBy?: string;
}[]>>;
export declare const listAllFolders: import("convex/server").RegisteredQuery<"public", {
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    createdAt: number;
    createdBy?: string;
    name: string;
    path: string;
    updatedAt: number;
    updatedBy?: string;
}[]>>;
export declare const getFolder: import("convex/server").RegisteredQuery<"public", {
    path: string;
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    createdAt: number;
    createdBy?: string;
    name: string;
    path: string;
    updatedAt: number;
    updatedBy?: string;
} | null>>;
export declare const createFolderByName: import("convex/server").RegisteredMutation<"public", {
    name: string;
    parentPath: string;
    _adminKey?: string | undefined;
}, Promise<string>>;
export declare const createFolderByPath: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    path: string;
    _adminKey?: string | undefined;
}, Promise<string>>;
export declare const updateFolder: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    path: string;
    _adminKey?: string | undefined;
}, Promise<any>>;
export declare const listAssets: import("convex/server").RegisteredQuery<"public", {
    folderPath: string;
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    basename: string;
    createdAt: number;
    createdBy?: string;
    folderPath: string;
    publishedVersionId?: string;
    updatedAt: number;
    updatedBy?: string;
    versionCounter: number;
}[]>>;
export declare const getAsset: import("convex/server").RegisteredQuery<"public", {
    folderPath: string;
    basename: string;
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    basename: string;
    createdAt: number;
    createdBy?: string;
    folderPath: string;
    publishedVersionId?: string;
    updatedAt: number;
    updatedBy?: string;
    versionCounter: number;
} | null>>;
export declare const createAsset: import("convex/server").RegisteredMutation<"public", {
    folderPath: string;
    basename: string;
    _adminKey?: string | undefined;
}, Promise<string>>;
export declare const renameAsset: import("convex/server").RegisteredMutation<"public", {
    folderPath: string;
    basename: string;
    newBasename: string;
    _adminKey?: string | undefined;
}, Promise<{
    assetId: string;
    newBasename: string;
    oldBasename: string;
}>>;
export declare const getAssetVersions: import("convex/server").RegisteredQuery<"public", {
    folderPath: string;
    basename: string;
    _adminKey?: string | undefined;
}, Promise<{
    _creationTime: number;
    _id: string;
    archivedAt?: number;
    archivedBy?: string;
    assetId: string;
    contentType?: string;
    createdAt: number;
    createdBy?: string;
    label?: string;
    originalFilename?: string;
    publishedAt?: number;
    publishedBy?: string;
    r2Key?: string;
    sha256?: string;
    size?: number;
    state: "published" | "archived";
    storageId?: string;
    updatedBy?: string;
    uploadStatus?: "pending" | "ready";
    version: number;
}[]>>;
export declare const getPublishedFile: import("convex/server").RegisteredQuery<"public", {
    folderPath: string;
    basename: string;
    _adminKey?: string | undefined;
}, Promise<{
    basename: string;
    contentType?: string;
    createdAt: number;
    createdBy?: string;
    folderPath: string;
    publishedAt: number;
    publishedBy?: string;
    r2Key?: string;
    sha256?: string;
    size?: number;
    state: "published";
    storageId?: string;
    url: string;
    version: number;
    versionId: string;
} | null>>;
export declare const listPublishedFilesInFolder: import("convex/server").RegisteredQuery<"public", {
    folderPath: string;
    _adminKey?: string | undefined;
}, Promise<{
    basename: string;
    contentType?: string;
    folderPath: string;
    publishedAt?: number;
    r2Key?: string;
    size?: number;
    storageId?: string;
    url: string;
    version: number;
    versionId: string;
}[]>>;
export declare const restoreVersion: import("convex/server").RegisteredMutation<"public", {
    label?: string | undefined;
    versionId: string;
    _adminKey?: string | undefined;
}, Promise<{
    assetId: string;
    restoredFromVersion: number;
    version: number;
    versionId: string;
}>>;
export declare const getVersionPreviewUrl: import("convex/server").RegisteredQuery<"public", {
    versionId: string;
    _adminKey?: string | undefined;
}, Promise<{
    contentType?: string;
    size?: number;
    url: string;
} | null>>;
export declare const getTextContent: import("convex/server").RegisteredAction<"public", {
    versionId: string;
    _adminKey?: string | undefined;
}, Promise<{
    content: string;
    contentType?: string;
} | null>>;
/**
 * Watch changelog for changes since a cursor.
 * Uses compound cursor (createdAt + id) for reliable pagination.
 * For initial fetch, use cursorCreatedAt: 0, cursorId: ""
 */
export declare const watchChangelog: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursorCreatedAt: number;
    cursorId: string;
    _adminKey?: string | undefined;
}, Promise<any>>;
/**
 * Watch changes within a specific folder.
 */
export declare const watchFolderChanges: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    folderPath: string;
    cursorCreatedAt: number;
    cursorId: string;
    _adminKey?: string | undefined;
}, Promise<any>>;
//# sourceMappingURL=versionedAssets.d.ts.map