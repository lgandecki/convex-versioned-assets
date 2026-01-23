/**
 * Start an upload. Creates an upload intent and returns the upload URL.
 *
 * Flow:
 * 1. Call startUpload() to get intentId + uploadUrl
 * 2. Upload file to the URL
 * 3. Call finishUpload() with intentId (+ storageId for Convex backend)
 */
export declare const startUpload: import("convex/server").RegisteredMutation<"public", {
    filename?: string | undefined;
    label?: string | undefined;
    folderPath: string;
    basename: string;
    _adminKey?: string | undefined;
}, Promise<{
    backend: "convex" | "r2";
    intentId: string;
    r2Key?: string;
    uploadUrl: string;
}>>;
export declare const startUploadInternal: import("convex/server").RegisteredMutation<"internal", {
    filename?: string | undefined;
    label?: string | undefined;
    folderPath: string;
    basename: string;
}, Promise<{
    backend: "convex" | "r2";
    intentId: string;
    r2Key?: string;
    uploadUrl: string;
}>>;
/**
 * Finish an upload. Creates the asset version from a completed upload intent.
 */
export declare const finishUpload: import("convex/server").RegisteredMutation<"public", {
    folderPath?: string | undefined;
    basename?: string | undefined;
    uploadResponse?: any;
    size?: number | undefined;
    contentType?: string | undefined;
    intentId: string;
    _adminKey?: string | undefined;
}, Promise<{
    assetId: string;
    version: number;
    versionId: string;
}>>;
export declare const finishUploadInternal: import("convex/server").RegisteredMutation<"internal", {
    folderPath?: string | undefined;
    basename?: string | undefined;
    uploadResponse?: any;
    size?: number | undefined;
    contentType?: string | undefined;
    intentId: string;
}, Promise<{
    assetId: string;
    version: number;
    versionId: string;
}>>;
/**
 * Generate a signed URL for private file access.
 * Works with both Convex storage and R2.
 */
export declare const getSignedUrl: import("convex/server").RegisteredAction<"public", {
    expiresIn?: number | undefined;
    versionId: string;
    _adminKey?: string | undefined;
}, Promise<string | null>>;
//# sourceMappingURL=generateUploadUrl.d.ts.map