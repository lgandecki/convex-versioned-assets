/**
 * Admin route setup for apps with existing routing.
 *
 * Creates src/components/AdminRoute.tsx and generates integration instructions
 * for users to add the admin panel to their existing router.
 */
import * as fs from "fs";
import * as path from "path";
import { fileExists, writeFile, directoryExists } from "./utils.js";
import {
  adminRouteComponentTemplate,
  generateAdminRouteInstructions,
} from "./templates.js";

export interface AdminRouteSetupResult {
  success: boolean;
  adminRoutePath?: string;
  instructionsPath?: string;
  reason?: string;
}

/**
 * Create AdminRoute.tsx component for existing apps.
 * Also generates integration instructions for different routers.
 */
export function createAdminRoute(projectRoot: string): AdminRouteSetupResult {
  const componentsDir = path.join(projectRoot, "src", "components");
  const adminRoutePath = path.join(componentsDir, "AdminRoute.tsx");
  const instructionsPath = path.join(
    projectRoot,
    "admin-route-instructions.md",
  );

  // Create components directory if it doesn't exist
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

  // Check if AdminRoute.tsx already exists
  if (fileExists(adminRoutePath)) {
    return {
      success: true,
      adminRoutePath,
      reason: "AdminRoute.tsx already exists",
    };
  }

  // Write AdminRoute.tsx
  try {
    writeFile(adminRoutePath, adminRouteComponentTemplate);
  } catch (error) {
    return {
      success: false,
      reason: `Failed to create AdminRoute.tsx: ${error}`,
    };
  }

  // Write instructions
  try {
    const instructions = generateAdminRouteInstructions();
    writeFile(instructionsPath, instructions);
  } catch {
    // Instructions are optional, continue if this fails
  }

  return {
    success: true,
    adminRoutePath,
    instructionsPath,
  };
}
