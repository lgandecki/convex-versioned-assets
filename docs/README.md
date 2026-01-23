# convex-versioned-assets

A Convex component for managing **versioned assets** with full history,
automatic CDN delivery, and real-time sync.

[![npm version](https://badge.fury.io/js/convex-versioned-assets.svg)](https://badge.fury.io/js/convex-versioned-assets)
[![docs](https://img.shields.io/badge/docs-online-blue)](https://lgandecki.github.io/convex-versioned-assets/)
[![codecov](https://codecov.io/gh/lgandecki/convex-versioned-assets/graph/badge.svg)](https://codecov.io/gh/lgandecki/convex-versioned-assets)

## Used In Production

This component powers the asset management system at
[BookGenius](https://bookgenius.net)
([GitHub](https://github.com/TheBrainFamily/BookgeniusPlayer)), an interactive
ebook platform with AI-powered content.

## Why This Component?

Most file storage solutions treat uploads as simple key-value stores: upload a
file, get a URL. When you upload a new version, you get a new URL and must
update all references manually.

**convex-versioned-assets** takes a different approach:

- **Stable references**: An asset at `images/hero` always resolves to its
  current published version
- **Full version history**: Every upload creates a new version; old versions are
  archived, not deleted
- **Instant rollback**: Restore any previous version with a single mutation
- **Direct CDN delivery**: File URLs point directly to Cloudflare's edge
  network, not through Convex
- **Real-time sync**: Changelog-driven subscriptions notify your app of any
  changes

```
Traditional Storage          convex-versioned-assets
─────────────────────────    ─────────────────────────
Upload v1 → URL_A            Upload v1 → images/hero → v1 (published)
Upload v2 → URL_B            Upload v2 → images/hero → v2 (published)
                                                     → v1 (archived)
Must update all refs!        All refs auto-resolve to v2
Can't restore v1             Restore v1 anytime
```

## Features

| Feature                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| **Version history**          | Every upload preserved, never lost       |
| **Publish/archive workflow** | Explicit states: `published`, `archived` |
| **Instant rollback**         | Restore any previous version             |
| **Audit trail**              | Full changelog with who/what/when        |
| **Direct CDN URLs**          | Bypass Convex for file delivery          |
| **Dual storage backends**    | Convex storage or Cloudflare R2          |
| **Folder organization**      | Virtual filesystem with `/path/to/asset` |
| **Real-time sync**           | Subscribe to changes via changelog       |

## Quick Start

### Installation

```bash
npm install convex-versioned-assets
```

### Configuration

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import versionedAssets from "convex-versioned-assets/convex.config";

const app = defineApp();
app.use(versionedAssets);
export default app;
```

### Upload a File

```typescript
// 1. Start the upload (get presigned URL)
const { intentId, uploadUrl } = await ctx.runMutation(
  components.versionedAssets.assetManager.startUpload,
  { folderPath: "images", basename: "hero", filename: "hero.png" },
);

// 2. Upload to the presigned URL
await fetch(uploadUrl, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": file.type },
});

// 3. Finalize (creates version, publishes automatically)
await ctx.runMutation(components.versionedAssets.assetManager.finishUpload, {
  intentId,
  size: file.size,
  contentType: file.type,
});
```

### Serve a File

```typescript
// convex/files.ts
import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

export const getFileUrl = query({
  args: { folderPath: v.string(), basename: v.string() },
  handler: async (ctx, { folderPath, basename }) => {
    return ctx.runQuery(
      components.versionedAssets.assetManager.getPublishedFile,
      {
        folderPath,
        basename,
      },
    );
  },
});
```

```tsx
// React component
function Image({ path, name }: { path: string; name: string }) {
  const file = useQuery(api.files.getFileUrl, {
    folderPath: path,
    basename: name,
  });
  if (!file) return null;
  return <img src={file.url} alt={name} />;
}
```

When you upload a new version of `images/hero`, all components using this query
automatically re-render with the new URL.

## HTTP Routes

Register HTTP routes to serve files directly via CDN:

```typescript
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

### Architecture: Direct CDN Delivery

Unlike solutions that route every file request through your backend,
**convex-versioned-assets** returns URLs that point directly to the CDN:

```
┌─────────────────┐     1. useQuery (reactive)      ┌─────────────────┐
│                 │ ◄────────────────────────────── │                 │
│   React App     │     returns { url, versionId }  │     Convex      │
│                 │                                 │                 │
└────────┬────────┘                                 └─────────────────┘
         │
         │ 2. Direct request (no Convex hop!)
         │    https://cdn.example.com/images/hero-v3.png
         ▼
┌─────────────────┐
│   Cloudflare    │  ← Served from nearest edge
│      CDN        │  ← ~10-50ms globally
└─────────────────┘
```

## Version Management

### How Versions Work

Each asset maintains a pointer to its current published version:

```
Asset: images/hero
├── publishedVersionId → points to v3
│
└── Versions:
    ├── v1 (archived) - uploaded Jan 1
    ├── v2 (archived) - uploaded Jan 15
    └── v3 (published) - uploaded Feb 1  ← current
```

### Listing Versions

```typescript
const versions = await ctx.runQuery(
  components.versionedAssets.assetManager.getAssetVersions,
  {
    folderPath: "images",
    basename: "hero",
  },
);

// Returns all versions with metadata:
// [
//   { version: 3, state: "published", createdAt: ..., size: ..., contentType: ... },
//   { version: 2, state: "archived", createdAt: ..., size: ..., contentType: ... },
//   { version: 1, state: "archived", createdAt: ..., size: ..., contentType: ... },
// ]
```

### Restoring a Previous Version

```typescript
await ctx.runMutation(components.versionedAssets.assetManager.restoreVersion, {
  versionId: previousVersionId,
});
// v1 is now published, v3 is archived
// All queries automatically return v1's URL
```

## Real-Time Sync with Changelog

The component maintains a changelog of all operations, enabling efficient sync:

```typescript
// Subscribe to changes since a cursor
const { changes, nextCursor } = await ctx.runQuery(
  components.versionedAssets.changelog.listSince,
  {
    cursor: { createdAt: lastSync, id: "" },
    limit: 100,
  },
);
```

Change types tracked:

- `folder:create`, `folder:update`, `folder:delete`
- `asset:create`, `asset:publish`, `asset:update`, `asset:archive`,
  `asset:delete`
- `asset:move`, `asset:rename`

### Local Filesystem Sync (convex-sync)

The changelog enables powerful sync tools. See
[convex-sync](https://github.com/TheBrainFamily/bookgenius/tree/main/apps/convex-sync)
in the BookGenius repo for a complete example that maintains a **live local
filesystem mirror** of your Convex assets.

> **Note**: `convex-sync` will be moved to this repository soon.

```
┌─────────────────┐     WebSocket subscription     ┌─────────────────┐
│   Local Disk    │ ◄──────────────────────────── │     Convex      │
│                 │     changelog.listSince        │   Asset Manager │
│  /sync-folder/  │                                │                 │
│  ├── images/    │     Initial sync + real-time   │  changelog DB   │
│  │   └── hero   │     updates via cursor         │                 │
│  └── sounds/    │                                │                 │
└─────────────────┘                                └─────────────────┘
```

The sync daemon:

- Performs initial sync of all folders and files
- Subscribes to real-time changelog updates via WebSocket
- Processes each change type (publish, archive, move, rename, delete)
- Tracks downloaded versions via filesystem extended attributes (xattr)
- Resumes from last cursor on restart (no re-download of unchanged files)

This pattern is useful for:

- **Development/AI workflows**: Let AI agents work with assets locally using
  familiar fs tools
- **Build pipelines**: Sync assets to a build server for static site generation
- **Backup systems**: Maintain an offline copy of all assets

## Storage Backends

### Convex Storage (Default)

Built-in, zero configuration. Good for development and smaller files.

### Cloudflare R2

For production workloads with global CDN delivery, lower egress costs, and
custom domains.

**Prerequisites:**

1. Set up the [`@convex-dev/r2`](https://github.com/get-convex/r2) component
   following their documentation
2. Create an R2 bucket with CORS configured for your domains
3. Set up a custom domain for public CDN access

**Configure the backend:**

```typescript
await ctx.runMutation(
  components.versionedAssets.assetManager.configureStorageBackend,
  {
    backend: "r2",
    r2PublicUrl: "https://assets.yourdomain.com",
    r2KeyPrefix: "myapp", // optional namespace
  },
);
```

**Pass R2 credentials when uploading:**

```typescript
const { intentId, uploadUrl } = await ctx.runMutation(
  components.versionedAssets.assetManager.startUpload,
  {
    folderPath: "images",
    basename: "hero",
    filename: "hero.png",
    r2Config: {
      R2_BUCKET: process.env.R2_BUCKET!,
      R2_ENDPOINT: process.env.R2_ENDPOINT!,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    },
  },
);
```

See the [detailed R2 setup guide](./docs/setup-r2.md) for step-by-step
instructions including CORS configuration, custom domains, and troubleshooting.

## Documentation

📖
**[Full documentation](https://lgandecki.github.io/convex-versioned-assets/)**

| Guide                                                   | Description                                     |
| ------------------------------------------------------- | ----------------------------------------------- |
| [Setting Up R2](./docs/setup-r2.md)                     | Configure Cloudflare R2 bucket, CORS, domains   |
| [Public Files](./docs/public-files.md)                  | Serve files through Cloudflare CDN              |
| [Private Files](./docs/private-files.md)                | Auth-protected access with signed URLs          |
| [WebP via Cloudflare](./docs/webp-cloudflare-worker.md) | High-performance image conversion via CF Worker |
| [WebP in Convex](./docs/webp-pure-convex.md)            | Convert images to WebP in Convex actions        |

## API Reference

### Mutations

| Function                  | Description                     |
| ------------------------- | ------------------------------- |
| `configureStorageBackend` | Set storage backend (convex/r2) |
| `startUpload`             | Begin upload, get presigned URL |
| `finishUpload`            | Complete upload, create version |
| `createFolderByPath`      | Create a folder                 |
| `restoreVersion`          | Restore a previous version      |
| `moveAsset`               | Move asset to different folder  |
| `renameAsset`             | Rename an asset                 |
| `deleteAsset`             | Soft-delete an asset            |

### Queries

| Function                     | Description                        |
| ---------------------------- | ---------------------------------- |
| `getPublishedFile`           | Get published version with URL     |
| `listPublishedFilesInFolder` | List all published files in folder |
| `getAssetVersions`           | Get all versions of an asset       |
| `listFolders`                | List subfolders                    |
| `getFolder`                  | Get folder by path                 |
| `changelog.listSince`        | Get changes since cursor           |
| `changelog.listForFolder`    | Get changes for specific folder    |

## Demo

Run the example app:

```bash
npm install
npm run dev
```

## License

Apache-2.0
