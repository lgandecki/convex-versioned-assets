#!/usr/bin/env node
/**
 * R2 Setup CLI for convex-versioned-assets.
 *
 * Usage: npx convex-versioned-assets r2setup
 *
 * Reads R2 configuration from .env.local or .env and pushes
 * the environment variables to Convex.
 */
import * as path from "path";
import {
  log,
  logSuccess,
  logError,
  logStep,
  logInfo,
  logWarning,
  fileExists,
  readEnvFile,
  pushEnvToConvex,
  getProjectRoot,
  colors,
} from "./utils.js";

// R2 environment variable names
const R2_REQUIRED_VARS = [
  "R2_BUCKET",
  "R2_PUBLIC_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
] as const;

const R2_OPTIONAL_VARS = ["R2_KEY_PREFIX"] as const;

const ALL_R2_VARS = [...R2_REQUIRED_VARS, ...R2_OPTIONAL_VARS] as const;

// Total steps in the r2setup process
const TOTAL_STEPS = 3;

export async function runR2Setup(): Promise<void> {
  log(`
${colors.bright}R2 Setup for convex-versioned-assets${colors.reset}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  const projectRoot = getProjectRoot();

  // Step 1: Find and parse .env file
  logStep(1, TOTAL_STEPS, "Reading R2 configuration from .env file");

  const envLocalPath = path.join(projectRoot, ".env.local");
  const envPath = path.join(projectRoot, ".env");
  let envFile: string;

  if (fileExists(envLocalPath)) {
    envFile = envLocalPath;
    logInfo("Using .env.local");
  } else if (fileExists(envPath)) {
    envFile = envPath;
    logInfo("Using .env");
  } else {
    logError(`No .env or .env.local file found in ${projectRoot}`);
    logInfo("Create a .env.local file with your R2 configuration.");
    logInfo("See docs/setup-r2.md for required variables.");
    process.exit(1);
  }

  // Extract R2 variables
  const envMap = readEnvFile(envFile);
  const r2Config: Record<string, string> = {};

  for (const key of ALL_R2_VARS) {
    const value = envMap.get(key);
    if (value) {
      r2Config[key] = value;
    }
  }

  // Step 2: Validate required vars
  logStep(2, TOTAL_STEPS, "Validating R2 configuration");

  const missing = R2_REQUIRED_VARS.filter((k) => !r2Config[k]);

  if (missing.length > 0) {
    logError(`Missing required R2 environment variables:`);
    for (const key of missing) {
      log(`  - ${key}`);
    }
    log("");
    logInfo("Add these variables to your .env.local file:");
    log(`
${colors.dim}# Cloudflare R2 Configuration
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://assets.yourdomain.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com${colors.reset}
`);
    logInfo("See docs/setup-r2.md for detailed setup instructions.");
    process.exit(1);
  }

  logSuccess("All required R2 variables found");

  // Show what we found
  for (const key of R2_REQUIRED_VARS) {
    const value = r2Config[key];
    // Mask sensitive values
    if (key.includes("SECRET") || key.includes("ACCESS_KEY")) {
      logInfo(`  ${key}: ${"*".repeat(8)}...${value.slice(-4)}`);
    } else {
      logInfo(`  ${key}: ${value}`);
    }
  }

  // Show optional vars if present
  for (const key of R2_OPTIONAL_VARS) {
    if (r2Config[key]) {
      logInfo(`  ${key}: ${r2Config[key]}`);
    }
  }

  // Step 3: Push to Convex
  logStep(3, TOTAL_STEPS, "Pushing R2 configuration to Convex");

  let allSuccess = true;
  for (const [key, value] of Object.entries(r2Config)) {
    log(`  Setting ${key}...`);
    const result = pushEnvToConvex(key, value);
    if (result.success) {
      logSuccess(`  ${key} set successfully`);
    } else {
      logWarning(`  Failed to set ${key}: ${result.error}`);
      allSuccess = false;
    }
  }

  if (!allSuccess) {
    log("");
    logWarning(
      "Some variables failed to push. You may need to set them manually:",
    );
    logInfo("  npx convex env set <KEY> <VALUE>");
    log("");
  }

  // Success message
  log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.bright}R2 Setup Complete!${colors.reset}

${colors.dim}Next steps:${colors.reset}
  1. Run ${colors.cyan}npx convex dev${colors.reset} to deploy changes
  2. Upload a file through the admin panel
  3. Verify the file appears in your R2 bucket

${colors.dim}For existing files, run the migration:${colors.reset}
  See docs/setup-r2.md for migration instructions.
`);
}
