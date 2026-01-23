# Quick Start

The fastest way to add versioned assets to your Convex project is using our
setup CLI. It handles all the configuration automatically.

## Prerequisites

1. **Create a Convex project** with authentication:

   ```bash
   bun create convex@latest
   # Select an auth template (convex-auth, Clerk, etc.)
   ```

2. **Initialize Convex** by running the dev server once:

   ```bash
   bun dev
   ```

3. **Install the package**:
   ```bash
   bun add convex-versioned-assets convex-helpers
   ```

## Run Setup

```bash
npx convex-versioned-assets setup
```

That's it! The setup wizard will:

1. ✅ Check your git status and offer to commit current state
2. ✅ Verify Convex is initialized
3. ✅ Generate `CONVEX_ADMIN_KEY` and prompt for admin email
4. ✅ Create all required Convex files (authz.ts, functions.ts,
   versionedAssets.ts, generateUploadUrl.ts)
5. ✅ Update convex.config.ts and http.ts with versioned-assets routes
6. ✅ Push environment variables to Convex
7. ✅ Install admin UI dependencies (Radix UI, React Query, etc.)
8. ✅ Configure Tailwind CSS for admin-ui classes
9. ✅ Add React Query provider to main.tsx
10. ✅ Optionally set up TanStack Router with `/admin` route
11. ✅ Create a Convex CLI wrapper for authenticated commands

## Setup Options

### With TanStack Router (Recommended for new projects)

When setup detects a fresh project, it will ask:

```
Set up TanStack Router with /admin route? (Recommended for new apps) [Y/n]
```

Choosing **Yes** creates:

- `src/routes/__root.tsx` - Root layout with Outlet
- `src/routes/index.tsx` - Demo page at `/` showing upload + version history
- `src/routes/admin.tsx` - Full admin panel at `/admin`
- `src/components/AssetDemo.tsx` - Demo component for testing

This gives you a working demo immediately and the admin panel at `/admin`.

### Without Router (Admin-only mode)

Choosing **No** replaces your App.tsx with the admin panel directly. Your entire
app becomes the admin interface.

### Existing Projects

If you have a customized App.tsx, setup will:

1. Create `src/components/AdminRoute.tsx` - A ready-to-use admin route component
2. Generate `admin-route-instructions.md` - Integration examples for your router

## After Setup

1. **Start the dev server**:

   ```bash
   bun dev
   ```

2. **Open your app** and navigate to `/admin` (or `/` if admin-only mode)

3. **Sign in** with the email you provided during setup

You should see the admin panel where you can:

- Create folders
- Upload files with drag-and-drop
- View version history
- Restore previous versions
- Preview assets

## R2 Storage (Optional)

By default, files are stored in Convex storage. For production with faster CDN
delivery and free egress, you can migrate to Cloudflare R2.

After initial setup, run:

```bash
npx convex-versioned-assets r2setup
```

This pushes your R2 environment variables to Convex. See
[Setting Up R2](./setup-r2.md) for detailed instructions.

## What Gets Created

### Convex Files

| File                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `convex/authz.ts`             | Authorization helpers (requireAdmin, isAdmin)            |
| `convex/functions.ts`         | Custom function builders (adminQuery, publicQuery, etc.) |
| `convex/versionedAssets.ts`   | Wrapper functions for the component API                  |
| `convex/generateUploadUrl.ts` | Upload flow handlers (startUpload, finishUpload)         |

### Environment Variables

| Variable           | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `CONVEX_ADMIN_KEY` | Secret key for admin API access               |
| `ADMIN_EMAILS`     | Comma-separated list of admin email addresses |

### Other Files

| File                     | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `scripts/convex`         | CLI wrapper for running functions as admin |
| `agents-instructions.md` | Generated if manual steps are needed       |

## Troubleshooting

### "Convex directory not found"

Make sure you've run `bun create convex@latest` first to initialize a Convex
project.

### "Convex not initialized"

Run `bun dev` or `npx convex dev` once to generate the `_generated/api` files.

### "convex/http.ts not found"

The setup requires authentication to be configured first. The http.ts file is
created by auth setup (convex-auth, Clerk, etc.).

### "Custom http.ts structure detected"

If you have custom routes in http.ts, setup can't auto-transform it. Check
`agents-instructions.md` for manual integration steps.

## Manual Setup

If you prefer to set things up manually or the automated setup doesn't work for
your project, see the [Configuration](./README.md#configuration) section in the
main docs.
