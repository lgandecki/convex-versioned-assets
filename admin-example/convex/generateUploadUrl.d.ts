/**
 * Configure which storage backend to use for new uploads - ADMIN ONLY.
 * Default is "convex". Call with "r2" to use Cloudflare R2.
 *
 * For R2, you must provide:
 * - Env vars: R2_BUCKET, R2_TOKEN, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT
 * - r2PublicUrl: The public URL for your R2 bucket (requires custom domain setup in Cloudflare)
 * - r2KeyPrefix (optional): Prefix for R2 keys to avoid collisions when sharing a bucket
 */
export declare const configureStorageBackend: import("convex/server").RegisteredMutation<"public", {
    r2PublicUrl?: string | undefined;
    r2KeyPrefix?: string | undefined;
    backend: "convex" | "r2";
    _adminKey?: string | undefined;
}, Promise<null>>;
/**
 * Get the current storage backend configuration.
 */
export declare const getStorageBackendConfig: import("convex/server").RegisteredQuery<"public", {
    _adminKey?: string | undefined;
}, Promise<"convex" | "r2">>;
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
 *
 * Pass the raw JSON response from the upload POST. The backend extracts what
 * it needs based on the storage backend (Convex or R2).
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
 *
 * NOTE: This is public - for private files, implement your own auth wrapper.
 *
 * For audio/video files, use longer expiration (e.g., 3600 = 1 hour)
 * to handle seeking and buffering during playback.
 */
export declare const getSignedUrl: import("convex/server").RegisteredAction<"public", {
    expiresIn?: number | undefined;
    versionId: string;
    _adminKey?: string | undefined;
}, Promise<string | null>>;
//# sourceMappingURL=generateUploadUrl.d.ts.map