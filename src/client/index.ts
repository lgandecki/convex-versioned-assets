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

  // Serve files by version ID: /assets/v/{versionId}
  // NOTE: Must be registered BEFORE the general path route (more specific prefix first)
  http.route({
    pathPrefix: `${prefix}/v/`,
    method: "GET",
    handler: httpActionGeneric(async (ctx, request) => {
      const url = new URL(request.url);
      const versionId = url.pathname.split("/v/")[1];

      if (!versionId) {
        return new Response("Version ID required", { status: 400 });
      }

      const result = await ctx.runQuery(
        component.assetFsHttp.getVersionForServing,
        { versionId: versionId as never }, // Type cast needed for component boundary
      );

      if (!result) {
        return new Response("Not found", { status: 404 });
      }

      if (result.kind === "redirect") {
        return new Response(null, {
          status: 302,
          headers: {
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
        return new Response("Not found", { status: 404 });
      }

      return new Response(blob, {
        headers: {
          "Content-Type": result.contentType ?? "application/octet-stream",
          "Cache-Control":
            result.cacheControl ?? "public, max-age=31536000, immutable",
        },
      });
    }),
  });

  // Serve published files by path: /assets/{folderPath}/{basename}
  http.route({
    pathPrefix: `${prefix}/`,
    method: "GET",
    handler: httpActionGeneric(async (ctx, request) => {
      const url = new URL(request.url);
      const pathAfterPrefix = url.pathname.slice(prefix.length + 1);
      const segments = pathAfterPrefix.split("/").filter(Boolean);

      if (segments.length === 0) {
        return new Response("Not found", { status: 404 });
      }

      const basename = segments.pop()!;
      const folderPath = segments.join("/");

      const result = await ctx.runQuery(
        component.assetFsHttp.getPublishedFileForServing,
        { folderPath, basename },
      );

      if (!result) {
        return new Response("Not found", { status: 404 });
      }

      if (result.kind === "redirect") {
        return new Response(null, {
          status: 302,
          headers: {
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
        return new Response("Not found", { status: 404 });
      }

      return new Response(blob, {
        headers: {
          "Content-Type": result.contentType ?? "application/octet-stream",
          "Cache-Control":
            result.cacheControl ?? "public, max-age=31536000, immutable",
        },
      });
    }),
  });
}
