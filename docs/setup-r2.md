# Setting Up Cloudflare R2

This guide walks you through configuring Cloudflare R2 as a storage backend for
convex-versioned-assets.

## Prerequisites

- A Cloudflare account
- A Convex project with `convex-versioned-assets` installed

## Step 1: Create an R2 Bucket

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Use Quick Search (command + K) to navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Choose a bucket name (e.g., `my-app-assets`)
5. Select a location (optional)
6. Click **Create bucket**

## Step 2: Configure CORS

CORS must be configured to allow uploads from your frontend.

1. In your bucket settings, go to **Settings** → **CORS Policy**
2. Click **Add CORS policy** and enter:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://your-app.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

**Important notes:**

- Include all origins where uploads will occur (localhost for dev, production
  domain)
- `PUT` is required for R2 uploads (not POST)
- `AllowedHeaders: ["*"]` is required for presigned URL uploads

## Step 3: Set Up a Custom Domain (Required for Public Access)

For public file access via CDN, you need a custom domain:

1. In your bucket settings click on _Custom Domains_
2. Click **Connect Domain**
3. Enter your subdomain (e.g., `assets.yourdomain.com`)
4. Follow the DNS configuration instructions
5. SSL certificate provisioning will be automatically provisioned while we
   continue with step 4

## Step 4: Create API Credentials

1. Go back to R2 Object Storage overview - Quick Search (command + K) **R2
   Object Storage**
2. In Account Details -> API Tokens click on **_Manage_**
3. Click **Create Account API token**
4. Configure the token:
   - **Token name**: e.g., `convex-versioned-assets`
   - **Permissions**: Select **Object Read & Write**
   - **Specify bucket(s)**: Select your bucket
5. Click **Create Account API Token**
6. **Save these secrets** (shown only once):
   - Access Key ID (R2_ACCESS_KEY_ID)
   - Secret Access Key (R2_SECRET_ACCESS_KEY)
7. Save the default endpoint (should look like this:
   `https://2343sdfsdf.r2.cloudflarestorage.com`) (R2_ENDPOINT)

## Step 5: Configure Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Cloudflare R2 Configuration
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://assets.yourdomain.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# Optional: Prefix for namespacing files in shared buckets
# R2_KEY_PREFIX=my-app
```

To find your account ID and endpoint:

1. Go to R2 dashboard
2. Click on your bucket
3. The endpoint is shown in the bucket details

## Step 6: Push Configuration to Convex

Run the r2setup CLI command to push your environment variables to Convex:

```bash
npx convex-versioned-assets r2setup
```

This command will:

1. Read R2 variables from your `.env.local` (or `.env`)
2. Validate that all required variables are present
3. Push them to Convex environment variables

## Verifying Your Setup

Use the admin panel to upload a file and verify it appears in your R2 bucket.

You can also verify programmatically:

```typescript
// Check the backend being used
const { intentId, uploadUrl, backend } = await ctx.runMutation(
  components.versionedAssets.assetManager.startUpload,
  {
    folderPath: "test",
    basename: "hello",
    filename: "hello.txt",
    r2Config: getR2Config(),
  },
);

console.log("Backend:", backend); // Should be "r2"
console.log("Upload URL:", uploadUrl); // Should be R2 presigned URL
```

## Migrating Existing Files to R2

If you have existing files stored in Convex storage that you want to migrate to
R2:

### Option 1: Migrate individual versions

```typescript
// In a script or admin action
const result = await ctx.runAction(
  components.versionedAssets.migration.migrateVersionToR2Action,
  {
    versionId: "version_id_here",
    r2Config: getR2Config(),
  },
);
console.log("Migrated to R2 with key:", result.r2Key);
```

### Option 2: Batch migrate all files

```typescript
// List files that need migration
const { versions, total } = await ctx.runQuery(
  components.versionedAssets.migration.listVersionsToMigrate,
  { limit: 50 },
);
console.log(`${versions.length} of ${total} files need migration`);

// Migrate each version
for (const version of versions) {
  await ctx.runAction(
    components.versionedAssets.migration.migrateVersionToR2Action,
    {
      versionId: version.versionId,
      r2Config: getR2Config(),
    },
  );
}
```

### Option 3: Backfill r2PublicUrl for existing R2 files

If you already have files in R2 but they don't have the `r2PublicUrl` stored on
each version (uploaded before this feature), run the backfill:

```typescript
// Run until done
let isDone = false;
while (!isDone) {
  const result = await ctx.runAction(
    components.versionedAssets.migration.backfillR2PublicUrlAction,
    { batchSize: 50 },
  );
  console.log(`Updated ${result.updated} of ${result.total} versions`);
  isDone = result.isDone;
}
```

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify `AllowedOrigins` includes your exact origin (including port)
2. Ensure `AllowedHeaders` is set to `["*"]`
3. Check that `PUT` is in `AllowedMethods`
4. CORS changes can take a few minutes to propagate

### 403 Forbidden on Upload

- Verify your API token has write permissions for the bucket
- Check that the token hasn't expired
- Ensure `R2_ENDPOINT` uses the correct account ID

### Files Not Accessible via Public URL

- Verify the custom domain is properly configured
- Check that the domain's SSL certificate is active
- Ensure `R2_PUBLIC_URL` is set correctly in your environment

## Next Steps

- [Public Files with CDN](./public-files.md) - Serve files through Cloudflare
  CDN
- [Private Files with Signed URLs](./private-files.md) - Auth-controlled file
  access
