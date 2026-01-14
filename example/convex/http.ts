import { httpRouter } from "convex/server";
import { registerAssetRoutes } from "convex-versioned-assets";
import { components } from "./_generated/api";

const http = httpRouter();

// Register HTTP routes for serving assets
// This exposes:
// - GET /assets/{folderPath}/{basename} - serve published files by path
// - GET /assets/v/{versionId} - serve files by version ID
registerAssetRoutes(http, components.versionedAssets, {
  pathPrefix: "/assets",
});

export default http;
