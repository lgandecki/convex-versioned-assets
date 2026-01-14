# convex-versioned-assets

A Convex component for managing versioned assets with full version history,
instant rollback, and direct CDN delivery.

[![npm version](https://badge.fury.io/js/convex-versioned-assets.svg)](https://badge.fury.io/js/convex-versioned-assets)

## Features

- **Version History**: Every upload creates a new version, keeping full history
- **Instant Rollback**: Restore any previous version with one click
- **Direct CDN Delivery**: Serve files via HTTP routes with proper caching
- **Folder Organization**: Hierarchical folder structure for organizing assets
- **Multiple Storage Backends**: Support for Convex storage and Cloudflare R2
- **Stable URLs**: Path-based URLs that always serve the latest published
  version
- **Version URLs**: Immutable URLs for specific versions

## Used In Production

This component powers the asset management system at
[BookGenius](https://bookgenius.net)
([GitHub](https://github.com/TheBrainFamily/bookgenius)), an interactive ebook
platform with AI-powered content.

## Installation

```bash
npm install convex-versioned-assets
```

Create a `convex.config.ts` file in your app's `convex/` folder:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import versionedAssets from "convex-versioned-assets/convex.config.js";

const app = defineApp();
app.use(versionedAssets);

export default app;
```

## Usage

### Uploading Files

```ts
import { components } from "./_generated/api";

// Start upload - get presigned URL
const { intentId, uploadUrl } = await ctx.runMutation(
  components.versionedAssets.assetManager.startUpload,
  { folderPath: "images", basename: "hero", filename: "hero.png" },
);

// Upload file to the presigned URL, then finish
await ctx.runMutation(components.versionedAssets.assetManager.finishUpload, {
  intentId,
  uploadResponse: { storageId },
  size,
  contentType,
});
```

### Querying Files

```ts
// Get the current published version
const file = await ctx.runQuery(
  components.versionedAssets.assetManager.getPublishedFile,
  { folderPath: "images", basename: "hero" },
);

// Get version history
const versions = await ctx.runQuery(
  components.versionedAssets.assetManager.getAssetVersions,
  { folderPath: "images", basename: "hero" },
);

// Restore a previous version
await ctx.runMutation(components.versionedAssets.assetManager.restoreVersion, {
  versionId,
});
```

### HTTP Routes

Register HTTP routes to serve files directly:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { registerAssetRoutes } from "convex-versioned-assets";
import { components } from "./_generated/api";

const http = httpRouter();

registerAssetRoutes(http, components.versionedAssets, {
  pathPrefix: "/assets",
});

export default http;
```

This exposes:

- `GET /assets/{folderPath}/{basename}` - Serve the latest published version
- `GET /assets/v/{versionId}` - Serve a specific version by ID

## Demo

Run the example app:

```bash
npm install
npm run dev
```

## License

Apache-2.0
