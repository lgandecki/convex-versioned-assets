/**
 * Client wrapper for convex-versioned-assets component.
 *
 * This module provides helper functions and types for interacting with
 * the versioned assets component from your Convex backend.
 */

import { httpActionGeneric } from "convex/server";
import type { HttpRouter } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

// Re-export the component API type for consumers
export type { ComponentApi };

// CORS headers for cross-origin requests (e.g., fetching assets from a different origin)
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Extract version ID from a URL pathname.
 * Expected format: /{prefix}/v/{versionId} or /{prefix}/v/{versionId}/{filename}
 * The filename after versionId is optional and ignored (used for human-readable URLs).
 */
export function parseVersionId(pathname: string): string | null {
  const parts = pathname.split("/v/");
  if (parts.length < 2) return null;

  const afterV = parts[1];
  if (!afterV) return null;

  // Extract just the versionId (first segment after /v/)
  const versionId = afterV.split("/")[0];
  return versionId || null;
}

/**
 * Extract folder path and basename from a URL pathname.
 * Expected format: /{prefix}/{folderPath}/{basename} or /{prefix}/{basename}
 */
export function parseAssetPath(
  pathname: string,
  prefix: string,
): { folderPath: string; basename: string } | null {
  const pathAfterPrefix = pathname.slice(prefix.length + 1);
  const segments = pathAfterPrefix.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const basename = segments.pop()!;
  const folderPath = segments.join("/");

  return { folderPath, basename };
}

/**
 * Register HTTP routes for serving assets.
 *
 * This mounts the asset serving endpoints at the specified path prefix.
 * Files are served via 302 redirects to CDN URLs for optimal performance.
 *
 * @example
 * ```typescript
 * // In your convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { registerAssetRoutes } from "convex-versioned-assets";
 * import { components } from "./_generated/api";
 *
 * const http = httpRouter();
 * registerAssetRoutes(http, components.versionedAssets, { pathPrefix: "/assets" });
 * export default http;
 * ```
 */
export function registerAssetRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: { pathPrefix?: string } = {},
) {
  const prefix = options.pathPrefix ?? "/assets";

  // Handle CORS preflight requests for version route
  http.route({
    pathPrefix: `${prefix}/v/`,
    method: "OPTIONS",
    handler: httpActionGeneric(async () => {
      return new Response(null, { status: 204, headers: corsHeaders });
    }),
  });

  // Serve files by version ID: /assets/v/{versionId}
  // NOTE: Must be registered BEFORE the general path route (more specific prefix first)
  http.route({
    pathPrefix: `${prefix}/v/`,
    method: "GET",
    handler: httpActionGeneric(async (ctx, request) => {
      const url = new URL(request.url);
      const versionId = parseVersionId(url.pathname);

      if (!versionId) {
        return new Response("Version ID required", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const result = await ctx.runQuery(
        component.assetFsHttp.getVersionForServing,
        { versionId: versionId as never }, // Type cast needed for component boundary
      );

      if (!result) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      if (result.kind === "redirect") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: result.location,
            "Cache-Control": result.cacheControl ?? "public, max-age=60",
          },
        });
      }

      const blob = await ctx.runAction(
        component.assetFsHttp.getBlobForServing,
        { storageId: result.storageId },
      );

      if (!blob) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      return new Response(blob, {
        headers: {
          ...corsHeaders,
          "Content-Type": result.contentType ?? "application/octet-stream",
          "Cache-Control":
            result.cacheControl ?? "public, max-age=31536000, immutable",
        },
      });
    }),
  });

  // Handle CORS preflight requests for path route
  http.route({
    pathPrefix: `${prefix}/`,
    method: "OPTIONS",
    handler: httpActionGeneric(async () => {
      return new Response(null, { status: 204, headers: corsHeaders });
    }),
  });

  // Serve published files by path: /assets/{folderPath}/{basename}
  http.route({
    pathPrefix: `${prefix}/`,
    method: "GET",
    handler: httpActionGeneric(async (ctx, request) => {
      const url = new URL(request.url);
      const parsed = parseAssetPath(url.pathname, prefix);

      if (!parsed) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      const { folderPath, basename } = parsed;

      const result = await ctx.runQuery(
        component.assetFsHttp.getPublishedFileForServing,
        { folderPath, basename },
      );

      if (!result) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      if (result.kind === "redirect") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: result.location,
            "Cache-Control": result.cacheControl ?? "public, max-age=60",
          },
        });
      }

      // For blob serving, we need to fetch the blob via action
      const blob = await ctx.runAction(
        component.assetFsHttp.getBlobForServing,
        { storageId: result.storageId },
      );

      if (!blob) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      return new Response(blob, {
        headers: {
          ...corsHeaders,
          "Content-Type": result.contentType ?? "application/octet-stream",
          "Cache-Control":
            result.cacheControl ?? "public, max-age=31536000, immutable",
        },
      });
    }),
  });
}

// Alias for backwards compatibility with asset-manager naming
export { registerAssetRoutes as registerAssetFsRoutes };
