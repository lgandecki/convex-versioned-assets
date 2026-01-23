#!/usr/bin/env node
/**
 * Setup CLI for convex-versioned-assets.
 *
 * Usage: npx convex-versioned-assets setup
 *
 * Simplified flow assuming user already ran `bun create convex@latest`
 * which handles auth configuration (convex-auth, Clerk, etc.)
 */
import * as path from "path";
import {
  log,
  logSuccess,
  logWarning,
  logError,
  logStep,
  logInfo,
  prompt,
  confirm,
  isGitRepo,
  isGitClean,
  directoryExists,
  fileExists,
  readFile,
  writeFile,
  detectPackageManager,
  getInstallCommand,
  runCommand,
  isPackageInstalled,
  readEnvFile,
  upsertEnvValue,
  generateAdminKey,
  pushEnvToConvex,
  getProjectRoot,
  getConvexDir,
  colors,
} from "./utils.js";
import {
  authzTemplate,
  functionsTemplate,
  versionedAssetsTemplate,
  generateUploadUrlTemplate,
  convexConfigTemplate,
  generateAgentsInstructions,
  appTsxTemplate,
} from "./templates.js";
import {
  isDefaultHttpTemplate,
  transformHttpTs,
  hasVersionedAssetsRoutes,
} from "./httpTransform.js";
import { transformMainTsx, hasConvexQueryClient } from "./mainTsxTransform.js";
import {
  replaceAppTsx,
  hasAdminPanel,
  analyzeAppTsx,
} from "./appTsxTransform.js";
import { setupTanStackRouter } from "./routerSetup.js";
import { createAdminRoute } from "./adminRouteSetup.js";
import { runR2Setup } from "./r2Setup.js";

// Total steps in the setup process
const TOTAL_STEPS = 12;

// Admin UI frontend dependencies
const ADMIN_UI_DEPS = [
  "@convex-dev/react-query",
  "@tanstack/react-query",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-slot",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "class-variance-authority",
  "clsx",
  "date-fns",
  "lucide-react",
  "prism-react-renderer",
  "react-resizable-panels",
  "sonner",
  "tailwind-merge",
];

interface SetupState {
  projectRoot: string;
  convexDir: string;
  envFile: string;
  adminEmail: string;
  adminKey: string;
  needsHttpManualUpdate: boolean;
  needsConfigManualUpdate: boolean;
  existingHttpContent?: string;
  existingConfigContent?: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Dispatch to r2setup command
  if (command === "r2setup") {
    await runR2Setup();
    return;
  }

  if (command !== "setup") {
    log(`
${colors.bright}convex-versioned-assets${colors.reset} - Setup CLI

Usage:
  npx convex-versioned-assets setup     Set up convex-versioned-assets in your project
  npx convex-versioned-assets r2setup   Push R2 env variables to Convex

Prerequisites:
  1. Create a Convex project: bun create convex@latest
  2. Run bun dev to initialize Convex
  3. Install this package: bun add convex-versioned-assets convex-helpers

For more information, see: https://github.com/lgandecki/convex-versioned-assets
`);
    process.exit(0);
  }

  log(`
${colors.bright}convex-versioned-assets Setup${colors.reset}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  const state: SetupState = {
    projectRoot: getProjectRoot(),
    convexDir: getConvexDir(),
    envFile: path.join(getProjectRoot(), ".env.local"),
    adminEmail: "",
    adminKey: "",
    needsHttpManualUpdate: false,
    needsConfigManualUpdate: false,
  };

  try {
    await step1PreflightChecks(state);
    await step2Dependencies(state);
    await step3EnvironmentSetup(state);
    await step4CreateRequiredFiles(state);
    await step5UpdateConfigFiles(state);
    await step6PushToConvex(state);
    await step7InstallAdminDeps(state);
    await step8ConfigureTailwindCSS(state);
    await step9TransformMainTsx(state);
    await step10TransformAppTsx(state);
    await step11CreateConvexWrapper(state);
    await step12GenerateInstructionsAndPrintNextSteps(state);
  } catch (error) {
    logError(
      `Setup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

/**
 * Step 1: Pre-flight checks
 */
async function step1PreflightChecks(state: SetupState): Promise<void> {
  logStep(1, TOTAL_STEPS, "Pre-flight checks");

  // Check if git is initialized
  if (!isGitRepo()) {
    logWarning("No git repository detected.");
    const initGit = await confirm(
      "Initialize git and commit current state? (Recommended - lets you see what setup changed)",
      true,
    );

    if (initGit) {
      logInfo("Initializing git repository...");
      runCommand("git init");
      runCommand("git add .");
      runCommand(
        'git commit -m "Initial state before convex-versioned-assets setup"',
      );
      logSuccess(
        "Created initial commit - you can use 'git diff' after setup to see changes",
      );
    }
  } else if (!isGitClean()) {
    // Existing logic for dirty working tree
    logWarning("Git working tree is not clean.");
    const proceed = await confirm("Continue anyway?", false);
    if (!proceed) {
      throw new Error("Aborted. Please commit or stash your changes first.");
    }
  } else {
    logSuccess("Git working tree is clean");
  }

  // Check convex directory exists
  if (!directoryExists(state.convexDir)) {
    throw new Error(
      `Convex directory not found at ${state.convexDir}.\n` +
        "Please run 'bun create convex@latest' first to initialize your Convex project.",
    );
  }
  logSuccess("Convex directory found");

  // Check _generated/api exists (Convex initialized)
  // Newer Convex versions generate api.d.ts + api.js, older versions generate api.ts
  const apiTsPath = path.join(state.convexDir, "_generated", "api.ts");
  const apiDtsPath = path.join(state.convexDir, "_generated", "api.d.ts");
  const apiJsPath = path.join(state.convexDir, "_generated", "api.js");
  if (
    !fileExists(apiTsPath) &&
    !fileExists(apiDtsPath) &&
    !fileExists(apiJsPath)
  ) {
    throw new Error(
      `Convex not initialized. No api files found in ${state.convexDir}/_generated/.\n` +
        "Please run 'npx convex dev' first to initialize your Convex project.",
    );
  }
  logSuccess("Convex project initialized");
}

/**
 * Step 2: Check and install dependencies
 */
async function step2Dependencies(_state: SetupState): Promise<void> {
  logStep(2, TOTAL_STEPS, "Dependencies");

  const pm = detectPackageManager();
  logInfo(`Detected package manager: ${pm}`);

  // Collect packages that need to be installed
  const packagesToInstall: string[] = [];

  // Check for convex-versioned-assets
  if (!isPackageInstalled("convex-versioned-assets")) {
    packagesToInstall.push("convex-versioned-assets");
  } else {
    logSuccess("convex-versioned-assets is installed");
  }

  // Check for convex-helpers (required, install without asking)
  if (!isPackageInstalled("convex-helpers")) {
    packagesToInstall.push("convex-helpers");
  } else {
    logSuccess("convex-helpers is installed");
  }

  // Install missing packages automatically
  if (packagesToInstall.length > 0) {
    logInfo(`Installing required packages: ${packagesToInstall.join(", ")}`);
    const cmd = getInstallCommand(pm, packagesToInstall);
    log(`Running: ${cmd}`);
    if (!runCommand(cmd)) {
      throw new Error(
        `Failed to install packages: ${packagesToInstall.join(", ")}`,
      );
    }
    logSuccess(`Installed ${packagesToInstall.join(", ")}`);
  }
}

/**
 * Step 3: Environment setup
 */
async function step3EnvironmentSetup(state: SetupState): Promise<void> {
  logStep(3, TOTAL_STEPS, "Environment setup");

  const envMap = readEnvFile(state.envFile);

  // Check/generate CONVEX_ADMIN_KEY
  if (envMap.has("CONVEX_ADMIN_KEY")) {
    state.adminKey = envMap.get("CONVEX_ADMIN_KEY")!;
    logSuccess("CONVEX_ADMIN_KEY already set in .env.local");
  } else {
    state.adminKey = generateAdminKey();
    upsertEnvValue(state.envFile, "CONVEX_ADMIN_KEY", state.adminKey);
    logSuccess("Generated CONVEX_ADMIN_KEY and saved to .env.local");
  }

  // Check/prompt for admin email
  if (envMap.has("ADMIN_EMAILS")) {
    state.adminEmail = envMap.get("ADMIN_EMAILS")!.split(",")[0].trim();
    logSuccess(`ADMIN_EMAILS already set: ${envMap.get("ADMIN_EMAILS")}`);
  } else {
    state.adminEmail = await prompt("Enter your admin email: ");
    if (!state.adminEmail || !state.adminEmail.includes("@")) {
      throw new Error("Invalid email address");
    }
    upsertEnvValue(state.envFile, "ADMIN_EMAILS", state.adminEmail);
    logSuccess(`Saved ADMIN_EMAILS to .env.local`);
  }
}

/**
 * Step 4: Create required Convex files
 */
async function step4CreateRequiredFiles(state: SetupState): Promise<void> {
  logStep(4, TOTAL_STEPS, "Creating required files");

  // Create authz.ts
  const authzPath = path.join(state.convexDir, "authz.ts");
  if (fileExists(authzPath)) {
    logWarning("convex/authz.ts already exists - skipping");
  } else {
    writeFile(authzPath, authzTemplate);
    logSuccess("Created convex/authz.ts");
  }

  // Create functions.ts
  const functionsPath = path.join(state.convexDir, "functions.ts");
  if (fileExists(functionsPath)) {
    logWarning("convex/functions.ts already exists - skipping");
  } else {
    writeFile(functionsPath, functionsTemplate);
    logSuccess("Created convex/functions.ts");
  }

  // Create versionedAssets.ts
  const versionedAssetsPath = path.join(state.convexDir, "versionedAssets.ts");
  if (fileExists(versionedAssetsPath)) {
    logWarning("convex/versionedAssets.ts already exists - skipping");
  } else {
    writeFile(versionedAssetsPath, versionedAssetsTemplate);
    logSuccess("Created convex/versionedAssets.ts");
  }

  // Create generateUploadUrl.ts
  const generateUploadUrlPath = path.join(
    state.convexDir,
    "generateUploadUrl.ts",
  );
  if (fileExists(generateUploadUrlPath)) {
    logWarning("convex/generateUploadUrl.ts already exists - skipping");
  } else {
    writeFile(generateUploadUrlPath, generateUploadUrlTemplate);
    logSuccess("Created convex/generateUploadUrl.ts");
  }
}

/**
 * Step 5: Update/create config files
 */
async function step5UpdateConfigFiles(state: SetupState): Promise<void> {
  logStep(5, TOTAL_STEPS, "Configuration files");

  // Handle convex.config.ts
  const configPath = path.join(state.convexDir, "convex.config.ts");
  if (!fileExists(configPath)) {
    writeFile(configPath, convexConfigTemplate);
    logSuccess("Created convex/convex.config.ts");
  } else {
    const content = readFile(configPath) || "";
    if (!content.includes("versionedAssets")) {
      state.needsConfigManualUpdate = true;
      state.existingConfigContent = content;
      logWarning(
        "convex/convex.config.ts exists but doesn't include versionedAssets",
      );
      logInfo("Manual update required - instructions will be generated");
    } else {
      logSuccess("convex/convex.config.ts already configured");
    }
  }

  // Handle http.ts - AST-based detection and transformation
  await handleHttpTs(state);
}

/**
 * Handle http.ts using AST-based detection and transformation.
 */
async function handleHttpTs(state: SetupState): Promise<void> {
  const httpPath = path.join(state.convexDir, "http.ts");

  // Case 1: http.ts doesn't exist
  if (!fileExists(httpPath)) {
    throw new Error(
      `convex/http.ts not found.\n\n` +
        `This package requires authentication to be set up first.\n` +
        `Please set up authentication using one of:\n` +
        `  - convex-auth: bun create convex@latest (select auth template)\n` +
        `  - Clerk: Follow Convex + Clerk integration guide\n` +
        `  - Auth0: Follow Convex + Auth0 integration guide\n\n` +
        `After setting up auth, run this setup command again.`,
    );
  }

  const content = readFile(httpPath) || "";

  // Case 2: Already has versioned assets routes
  if (hasVersionedAssetsRoutes(content)) {
    logSuccess("convex/http.ts already has versioned-assets routes configured");
    return;
  }

  // Case 3: Matches default template - auto-transform
  if (isDefaultHttpTemplate(content)) {
    logInfo(
      "Detected default convex-auth http.ts template - auto-transforming...",
    );
    const result = transformHttpTs(content);

    if (result.success && result.transformed) {
      writeFile(httpPath, result.transformed);
      logSuccess(
        "Automatically updated convex/http.ts with versioned-assets routes",
      );
      return;
    } else {
      logWarning(`Auto-transform failed: ${result.reason}`);
      // Fall through to manual update
    }
  }

  // Case 4: Exists but different structure - generate manual instructions
  state.needsHttpManualUpdate = true;
  state.existingHttpContent = content;
  logWarning("convex/http.ts has custom structure - cannot auto-transform");
  logInfo("Manual update required - instructions will be generated");
}

/**
 * Step 6: Push environment variables to Convex
 */
async function step6PushToConvex(state: SetupState): Promise<void> {
  logStep(6, TOTAL_STEPS, "Pushing environment variables to Convex");

  // Push CONVEX_ADMIN_KEY
  const adminKeyResult = pushEnvToConvex("CONVEX_ADMIN_KEY", state.adminKey);
  if (adminKeyResult.success) {
    logSuccess("Pushed CONVEX_ADMIN_KEY to Convex");
  } else {
    logWarning(`Failed to push CONVEX_ADMIN_KEY: ${adminKeyResult.error}`);
    logInfo("  Run manually: npx convex env set CONVEX_ADMIN_KEY <your-key>");
  }

  // Push ADMIN_EMAILS
  const envMap = readEnvFile(state.envFile);
  const adminEmails = envMap.get("ADMIN_EMAILS") || state.adminEmail;
  const adminEmailsResult = pushEnvToConvex("ADMIN_EMAILS", adminEmails);
  if (adminEmailsResult.success) {
    logSuccess("Pushed ADMIN_EMAILS to Convex");
  } else {
    logWarning(`Failed to push ADMIN_EMAILS: ${adminEmailsResult.error}`);
    logInfo("  Run manually: npx convex env set ADMIN_EMAILS <your-email>");
  }
}

/**
 * Step 7: Install admin UI frontend dependencies
 */
async function step7InstallAdminDeps(_state: SetupState): Promise<void> {
  logStep(7, TOTAL_STEPS, "Installing admin UI dependencies");

  const pm = detectPackageManager();

  // Check which deps are missing
  const missingDeps = ADMIN_UI_DEPS.filter((dep) => !isPackageInstalled(dep));

  if (missingDeps.length === 0) {
    logSuccess("All admin UI dependencies already installed");
    return;
  }

  logInfo(`Installing ${missingDeps.length} dependencies...`);

  const install = await confirm(
    `Install ${missingDeps.length} admin UI dependencies now?`,
  );

  if (!install) {
    logWarning("Skipping dependency installation.");
    logInfo(`Run manually: ${getInstallCommand(pm, missingDeps)}`);
    return;
  }

  const cmd = getInstallCommand(pm, missingDeps);
  log(`Running: ${cmd}`);

  if (!runCommand(cmd)) {
    throw new Error("Failed to install admin UI dependencies");
  }

  logSuccess("Installed admin UI dependencies");
}

/**
 * Step 8: Configure Tailwind CSS to include admin-ui classes
 */
async function step8ConfigureTailwindCSS(state: SetupState): Promise<void> {
  logStep(8, TOTAL_STEPS, "Configuring Tailwind CSS");

  // Look for common CSS file locations
  const cssFileCandidates = [
    path.join(state.projectRoot, "src", "index.css"),
    path.join(state.projectRoot, "src", "globals.css"),
    path.join(state.projectRoot, "src", "styles.css"),
    path.join(state.projectRoot, "app", "globals.css"), // Next.js app router
  ];

  let cssFilePath: string | null = null;
  for (const candidate of cssFileCandidates) {
    if (fileExists(candidate)) {
      cssFilePath = candidate;
      break;
    }
  }

  if (!cssFilePath) {
    logWarning("Could not find main CSS file (index.css, globals.css, etc.)");
    logInfo('Add this line to your main CSS file after @import "tailwindcss":');
    logInfo(
      '  @source "../node_modules/convex-versioned-assets/dist/admin-ui/**/*.js";',
    );
    return;
  }

  const content = readFile(cssFilePath) || "";

  // Check if already has the @source directive
  if (content.includes("convex-versioned-assets")) {
    logSuccess("Tailwind CSS already configured for convex-versioned-assets");
    return;
  }

  // Check if it's Tailwind v4 (uses @import "tailwindcss")
  if (
    !content.includes('@import "tailwindcss"') &&
    !content.includes("@import 'tailwindcss'")
  ) {
    logWarning(
      'CSS file doesn\'t appear to use Tailwind v4 (@import "tailwindcss")',
    );
    logInfo("If using Tailwind v3, add to tailwind.config.js content array:");
    logInfo('  "./node_modules/convex-versioned-assets/dist/admin-ui/**/*.js"');
    return;
  }

  // Add @source directive after @import "tailwindcss"
  const sourceDirective =
    '\n/* Include convex-versioned-assets admin-ui classes */\n@source "../node_modules/convex-versioned-assets/dist/admin-ui/**/*.js";';

  const updatedContent = content.replace(
    /(@import\s+["']tailwindcss["'];?)/,
    `$1${sourceDirective}`,
  );

  if (updatedContent === content) {
    logWarning("Could not auto-update CSS file");
    logInfo('Add this line after @import "tailwindcss":');
    logInfo(
      '  @source "../node_modules/convex-versioned-assets/dist/admin-ui/**/*.js";',
    );
    return;
  }

  writeFile(cssFilePath, updatedContent);
  logSuccess(
    `Added Tailwind @source directive to ${path.basename(cssFilePath)}`,
  );
}

/**
 * Step 9: Transform main.tsx to add React Query
 */
async function step9TransformMainTsx(state: SetupState): Promise<void> {
  logStep(9, TOTAL_STEPS, "Configuring React Query in main.tsx");

  const mainTsxPath = path.join(state.projectRoot, "src", "main.tsx");

  if (!fileExists(mainTsxPath)) {
    logWarning("src/main.tsx not found - skipping React Query setup");
    logInfo("You'll need to add React Query provider manually");
    return;
  }

  const content = readFile(mainTsxPath) || "";

  // Check if already configured
  if (hasConvexQueryClient(content)) {
    logSuccess("React Query already configured in main.tsx");
    return;
  }

  // Transform
  const result = transformMainTsx(content);

  if (result.skipped) {
    logSuccess(result.reason || "React Query already configured");
    return;
  }

  if (!result.success) {
    logWarning(`Could not auto-transform main.tsx: ${result.reason}`);
    logInfo("You'll need to add React Query provider manually. See docs.");
    return;
  }

  writeFile(mainTsxPath, result.transformed!);
  logSuccess("Added React Query provider to main.tsx");
}

/**
 * Step 10: Transform App.tsx to add admin panel
 *
 * Flow:
 * 1. Has AdminPanel? → Skip (already configured)
 * 2. Fresh template? → Ask: "Set up with routing at /admin?"
 *    - Yes → Set up TanStack Router + routes
 *    - No → Replace with admin-only App.tsx
 * 3. Customized (with or without routing) → Create AdminRoute.tsx + instructions
 */
async function step10TransformAppTsx(state: SetupState): Promise<void> {
  logStep(10, TOTAL_STEPS, "Setting up App.tsx with admin panel");

  const appTsxPath = path.join(state.projectRoot, "src", "App.tsx");

  // Case 1: App.tsx doesn't exist - create fresh with routing option
  if (!fileExists(appTsxPath)) {
    const useRouting = await confirm(
      "Set up TanStack Router with /admin route? (Recommended for new apps)",
      true,
    );

    if (useRouting) {
      await setupWithRouting(state);
    } else {
      writeFile(appTsxPath, appTsxTemplate);
      logSuccess("Created src/App.tsx with admin panel (admin-only mode)");
    }
    return;
  }

  const content = readFile(appTsxPath) || "";

  // Case 2: Already has AdminPanel configured
  if (hasAdminPanel(content)) {
    logSuccess("AdminPanel already configured in App.tsx");
    return;
  }

  // Analyze the App.tsx
  const analysis = analyzeAppTsx(content);

  // Case 3: Fresh template - offer routing setup
  if (analysis.isFreshTemplate) {
    const useRouting = await confirm(
      "Set up TanStack Router with /admin route? (Recommended for new apps)",
      true,
    );

    if (useRouting) {
      await setupWithRouting(state);
    } else {
      // Replace with admin-only App.tsx
      const result = replaceAppTsx(content);
      if (result.success && result.transformed) {
        writeFile(appTsxPath, result.transformed);
        logSuccess("Replaced App.tsx with admin panel setup (admin-only mode)");
      }
    }
    return;
  }

  // Case 4: Customized app (with or without routing)
  // Create AdminRoute.tsx component + generate integration instructions
  logInfo(
    "Detected customized App.tsx - creating AdminRoute component for integration",
  );

  const adminRouteResult = createAdminRoute(state.projectRoot);
  if (adminRouteResult.success) {
    logSuccess("Created src/components/AdminRoute.tsx");
    if (adminRouteResult.instructionsPath) {
      logSuccess(
        "Created admin-route-instructions.md with integration examples",
      );
    }
    logInfo(
      "Add AdminRoute to your router at /admin. See admin-route-instructions.md for examples.",
    );
  } else {
    logWarning(
      `Could not create AdminRoute component: ${adminRouteResult.reason}`,
    );
    logInfo("Add AdminPanel component manually. See docs for example.");
  }
}

/**
 * Set up TanStack Router with /admin route.
 */
async function setupWithRouting(state: SetupState): Promise<void> {
  logInfo("Setting up TanStack Router with file-based routing...");

  const result = await setupTanStackRouter(state.projectRoot);

  if (!result.success) {
    logWarning(`Router setup incomplete: ${result.reason}`);
    logInfo("You may need to complete the setup manually.");
    return;
  }

  // Log what was done
  if (result.steps.dependencies) {
    logSuccess("Installed TanStack Router dependencies");
  }
  if (result.steps.routes) {
    logSuccess("Created src/routes/ with __root.tsx, index.tsx, admin.tsx");
  }
  if (result.steps.components) {
    logSuccess("Created src/components/ with AssetDemo.tsx and AssetDemo.css");
  }
  if (result.steps.viteConfig) {
    logSuccess("Added TanStack Router plugin to vite.config.ts");
  }
  if (result.steps.mainTsx) {
    logSuccess("Updated main.tsx with RouterProvider");
  }
  if (result.steps.gitignore) {
    logSuccess("Added routeTree.gen.ts to .gitignore");
  }

  logInfo("Routes created: / (demo) and /admin (admin panel)");
}

/**
 * Step 11: Create scripts/convex wrapper for authenticated CLI commands
 */
async function step11CreateConvexWrapper(state: SetupState): Promise<void> {
  logStep(11, TOTAL_STEPS, "Creating Convex CLI wrapper");

  const scriptsDir = path.join(state.projectRoot, "scripts");
  const wrapperPath = path.join(scriptsDir, "convex");

  // Create scripts directory if it doesn't exist
  if (!directoryExists(scriptsDir)) {
    const fs = await import("fs");
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  if (fileExists(wrapperPath)) {
    logWarning("scripts/convex already exists - skipping");
    return;
  }

  const wrapperScript = `#!/bin/bash
# Convex CLI wrapper that injects admin identity for 'run' commands
# Usage: ./scripts/convex run myFunction:name '{"arg": "value"}'
# This allows you to run convex functions as an authenticated admin user

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env.local from project root
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  ADMIN_EMAILS=$(grep -v '^#' "$PROJECT_ROOT/.env.local" | grep ADMIN_EMAILS | cut -d '=' -f2-)
fi

# Check if this is a 'run' command and we have admin emails
if [ "$1" = "run" ] && [ -n "$ADMIN_EMAILS" ]; then
  shift  # remove 'run'
  exec npx convex run --identity "{\\"email\\": \\"\${ADMIN_EMAILS}\\"}" "$@"
else
  # Pass through to real convex for all other commands
  exec npx convex "$@"
fi
`;

  writeFile(wrapperPath, wrapperScript);

  // Make it executable
  const fs = await import("fs");
  fs.chmodSync(wrapperPath, "755");

  logSuccess("Created scripts/convex CLI wrapper");
  logInfo(
    "Use ./scripts/convex run to execute functions as authenticated admin",
  );
}

/**
 * Step 12: Generate instructions if needed and print next steps
 * Note: CSS is now imported from the library directly via:
 * import "convex-versioned-assets/admin-ui/styles";
 */
async function step12GenerateInstructionsAndPrintNextSteps(
  state: SetupState,
): Promise<void> {
  logStep(11, TOTAL_STEPS, "Setup complete!");

  // Generate agents-instructions.md if manual steps are needed
  if (state.needsHttpManualUpdate || state.needsConfigManualUpdate) {
    const instructions = generateAgentsInstructions({
      needsHttpUpdate: state.needsHttpManualUpdate,
      needsConfigUpdate: state.needsConfigManualUpdate,
      existingHttpContent: state.existingHttpContent,
      existingConfigContent: state.existingConfigContent,
    });

    const instructionsPath = path.join(
      state.projectRoot,
      "agents-instructions.md",
    );
    writeFile(instructionsPath, instructions);
    logSuccess("Created agents-instructions.md with manual setup steps");
  }

  // Print next steps
  log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.bright}Next steps:${colors.reset}

  1. Run: ${colors.cyan}npx convex dev${colors.reset}
`);

  if (state.needsHttpManualUpdate || state.needsConfigManualUpdate) {
    log(`  2. Copy the instructions file to your AI assistant:
     ${colors.cyan}cat agents-instructions.md | pbcopy${colors.reset}
     Then paste to complete the manual setup steps.
`);
  }

  log(`  ${state.needsHttpManualUpdate || state.needsConfigManualUpdate ? "3" : "2"}. Open your app in the browser to use the admin panel

${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.bright}About storage backends:${colors.reset}

  By default, files are stored in Convex storage. This works great out of the box.

  For faster CDN delivery and free egress, you can migrate to Cloudflare R2.
  Migration is straightforward and can be done at any time without downtime.

  ${colors.cyan}See: https://github.com/lgandecki/convex-versioned-assets#r2-storage${colors.reset}

${colors.dim}For full documentation: https://github.com/lgandecki/convex-versioned-assets${colors.reset}
`);
}

// Run the CLI
main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
