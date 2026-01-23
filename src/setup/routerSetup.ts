/**
 * TanStack Router setup orchestration.
 *
 * Sets up file-based routing with TanStack Router:
 * - Creates src/routes/ directory with __root.tsx, index.tsx, admin.tsx
 * - Updates vite.config.ts with TanStack Router plugin
 * - Updates main.tsx with RouterProvider
 * - Updates .gitignore for routeTree.gen.ts
 */
import * as fs from "fs";
import * as path from "path";
import {
  fileExists,
  writeFile,
  readFile,
  directoryExists,
  detectPackageManager,
  getInstallCommand,
  runCommand,
  isPackageInstalled,
} from "./utils.js";
import {
  TANSTACK_ROUTER_DEPS,
  rootRouteTemplate,
  indexRouteTemplate,
  adminFileRouteTemplate,
  mainTsxWithRouterTemplate,
  assetDemoComponentTemplate,
  assetDemoCssTemplate,
} from "./templates.js";
import {
  transformViteConfig,
  hasTanStackRouterPlugin,
} from "./viteConfigTransform.js";

export interface RouterSetupResult {
  success: boolean;
  reason?: string;
  steps: {
    dependencies: boolean;
    routes: boolean;
    components: boolean;
    viteConfig: boolean;
    mainTsx: boolean;
    gitignore: boolean;
  };
}

/**
 * Install TanStack Router dependencies.
 */
export async function installRouterDeps(): Promise<{
  success: boolean;
  reason?: string;
}> {
  const pm = detectPackageManager();
  const missingDeps = TANSTACK_ROUTER_DEPS.filter(
    (dep) => !isPackageInstalled(dep),
  );

  if (missingDeps.length === 0) {
    return { success: true };
  }

  const cmd = getInstallCommand(pm, missingDeps);
  const success = runCommand(cmd);

  if (!success) {
    return {
      success: false,
      reason: `Failed to install TanStack Router dependencies: ${missingDeps.join(", ")}`,
    };
  }

  return { success: true };
}

/**
 * Create route files in src/routes/.
 */
export function createRouteFiles(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const routesDir = path.join(projectRoot, "src", "routes");

  // Create routes directory
  if (!directoryExists(routesDir)) {
    try {
      fs.mkdirSync(routesDir, { recursive: true });
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create routes directory: ${err}`,
      };
    }
  }

  // Create __root.tsx
  const rootPath = path.join(routesDir, "__root.tsx");
  if (!fileExists(rootPath)) {
    try {
      writeFile(rootPath, rootRouteTemplate);
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create __root.tsx: ${err}`,
      };
    }
  }

  // Create index.tsx
  const indexPath = path.join(routesDir, "index.tsx");
  if (!fileExists(indexPath)) {
    try {
      writeFile(indexPath, indexRouteTemplate);
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create index.tsx: ${err}`,
      };
    }
  }

  // Create admin.tsx
  const adminPath = path.join(routesDir, "admin.tsx");
  if (!fileExists(adminPath)) {
    try {
      writeFile(adminPath, adminFileRouteTemplate);
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create admin.tsx: ${err}`,
      };
    }
  }

  return { success: true };
}

/**
 * Create AssetDemo component files in src/components/.
 */
export function createAssetDemoFiles(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const componentsDir = path.join(projectRoot, "src", "components");

  // Create components directory
  if (!directoryExists(componentsDir)) {
    try {
      fs.mkdirSync(componentsDir, { recursive: true });
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create components directory: ${err}`,
      };
    }
  }

  // Create AssetDemo.tsx
  const demoPath = path.join(componentsDir, "AssetDemo.tsx");
  if (!fileExists(demoPath)) {
    try {
      writeFile(demoPath, assetDemoComponentTemplate);
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create AssetDemo.tsx: ${err}`,
      };
    }
  }

  // Create AssetDemo.css
  const cssPath = path.join(componentsDir, "AssetDemo.css");
  if (!fileExists(cssPath)) {
    try {
      writeFile(cssPath, assetDemoCssTemplate);
    } catch (err) {
      return {
        success: false,
        reason: `Failed to create AssetDemo.css: ${err}`,
      };
    }
  }

  return { success: true };
}

/**
 * Update vite.config.ts with TanStack Router plugin.
 */
export function updateViteConfig(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const viteConfigPath = path.join(projectRoot, "vite.config.ts");

  if (!fileExists(viteConfigPath)) {
    return {
      success: false,
      reason: "vite.config.ts not found",
    };
  }

  const content = readFile(viteConfigPath) || "";

  if (hasTanStackRouterPlugin(content)) {
    return { success: true }; // Already configured
  }

  const result = transformViteConfig(content);

  if (!result.success || !result.transformed) {
    return {
      success: false,
      reason: result.reason || "Failed to transform vite.config.ts",
    };
  }

  try {
    writeFile(viteConfigPath, result.transformed);
  } catch (err) {
    return {
      success: false,
      reason: `Failed to write vite.config.ts: ${err}`,
    };
  }

  return { success: true };
}

/**
 * Replace main.tsx with router-enabled version.
 */
export function updateMainTsx(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const mainTsxPath = path.join(projectRoot, "src", "main.tsx");

  if (!fileExists(mainTsxPath)) {
    return {
      success: false,
      reason: "src/main.tsx not found",
    };
  }

  const content = readFile(mainTsxPath) || "";

  // Check if already has RouterProvider
  if (content.includes("RouterProvider") && content.includes("routeTree")) {
    return { success: true }; // Already configured
  }

  // Replace with router-enabled template
  try {
    writeFile(mainTsxPath, mainTsxWithRouterTemplate);
  } catch (err) {
    return {
      success: false,
      reason: `Failed to write main.tsx: ${err}`,
    };
  }

  return { success: true };
}

/**
 * Update .gitignore to exclude routeTree.gen.ts.
 */
export function updateGitignore(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const entryToAdd = "# TanStack Router generated file\nsrc/routeTree.gen.ts";

  let content = "";
  if (fileExists(gitignorePath)) {
    content = readFile(gitignorePath) || "";
  }

  // Check if already has entry
  if (content.includes("routeTree.gen.ts")) {
    return { success: true };
  }

  // Append entry
  const newContent = content.endsWith("\n")
    ? content + "\n" + entryToAdd + "\n"
    : content + "\n\n" + entryToAdd + "\n";

  try {
    writeFile(gitignorePath, newContent);
  } catch (err) {
    return {
      success: false,
      reason: `Failed to update .gitignore: ${err}`,
    };
  }

  return { success: true };
}

/**
 * Delete App.tsx since we're using file-based routing.
 */
export function removeAppTsx(projectRoot: string): {
  success: boolean;
  reason?: string;
} {
  const appTsxPath = path.join(projectRoot, "src", "App.tsx");

  if (!fileExists(appTsxPath)) {
    return { success: true }; // Already gone
  }

  // Delete App.tsx (git has the history if needed)
  try {
    fs.unlinkSync(appTsxPath);
  } catch (err) {
    return {
      success: false,
      reason: `Failed to delete App.tsx: ${err}`,
    };
  }

  return { success: true };
}

/**
 * Full TanStack Router setup.
 * Orchestrates all steps needed for file-based routing.
 */
export async function setupTanStackRouter(
  projectRoot: string,
): Promise<RouterSetupResult> {
  const result: RouterSetupResult = {
    success: false,
    steps: {
      dependencies: false,
      routes: false,
      components: false,
      viteConfig: false,
      mainTsx: false,
      gitignore: false,
    },
  };

  // Step 1: Install dependencies
  const depsResult = await installRouterDeps();
  if (!depsResult.success) {
    return { ...result, reason: depsResult.reason };
  }
  result.steps.dependencies = true;

  // Step 2: Create route files
  const routesResult = createRouteFiles(projectRoot);
  if (!routesResult.success) {
    return { ...result, reason: routesResult.reason };
  }
  result.steps.routes = true;

  // Step 3: Create AssetDemo component files
  const componentsResult = createAssetDemoFiles(projectRoot);
  if (!componentsResult.success) {
    return { ...result, reason: componentsResult.reason };
  }
  result.steps.components = true;

  // Step 4: Update vite.config.ts
  const viteResult = updateViteConfig(projectRoot);
  if (!viteResult.success) {
    return { ...result, reason: viteResult.reason };
  }
  result.steps.viteConfig = true;

  // Step 5: Update main.tsx
  const mainResult = updateMainTsx(projectRoot);
  if (!mainResult.success) {
    return { ...result, reason: mainResult.reason };
  }
  result.steps.mainTsx = true;

  // Step 6: Update .gitignore
  const gitignoreResult = updateGitignore(projectRoot);
  if (!gitignoreResult.success) {
    return { ...result, reason: gitignoreResult.reason };
  }
  result.steps.gitignore = true;

  // Step 7: Remove App.tsx (routes replace it)
  removeAppTsx(projectRoot);
  // Don't fail if this doesn't work

  result.success = true;
  return result;
}
