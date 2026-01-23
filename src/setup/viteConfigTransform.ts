/**
 * Vite config transformation for TanStack Router.
 *
 * Adds the TanStack Router plugin to vite.config.ts for file-based routing.
 */
import { Project, SourceFile, SyntaxKind } from "ts-morph";

export interface ViteConfigTransformResult {
  success: boolean;
  transformed?: string;
  reason?: string;
  skipped?: boolean;
}

/**
 * Create a ts-morph project and parse TypeScript content.
 */
function parseContent(
  content: string,
  filename = "vite.config.ts",
): SourceFile {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      noEmit: true,
    },
  });
  return project.createSourceFile(filename, content);
}

/**
 * Check if the vite config already has TanStack Router plugin.
 */
export function hasTanStackRouterPlugin(content: string): boolean {
  return (
    content.includes("@tanstack/router-plugin") ||
    content.includes("tanstackRouter")
  );
}

/**
 * Transform vite.config.ts to add TanStack Router plugin.
 *
 * Target structure:
 * ```
 * import { defineConfig } from "vite";
 * import react from "@vitejs/plugin-react";
 * import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
 *
 * export default defineConfig({
 *   plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react()],
 * });
 * ```
 */
export function transformViteConfig(
  content: string,
): ViteConfigTransformResult {
  // Already has TanStack Router
  if (hasTanStackRouterPlugin(content)) {
    return {
      success: true,
      skipped: true,
      reason: "TanStack Router plugin already configured",
    };
  }

  try {
    const sourceFile = parseContent(content);

    // Add TanStack Router import
    const existingImports = sourceFile.getImportDeclarations();
    const lastImport = existingImports[existingImports.length - 1];

    if (lastImport) {
      lastImport
        .getParent()
        .insertStatements(
          lastImport.getChildIndex() + 1,
          'import { TanStackRouterVite } from "@tanstack/router-plugin/vite";',
        );
    } else {
      sourceFile.insertStatements(
        0,
        'import { TanStackRouterVite } from "@tanstack/router-plugin/vite";',
      );
    }

    // Find the plugins array in defineConfig
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (!defaultExport) {
      return {
        success: false,
        reason: "No default export found in vite.config.ts",
      };
    }

    // Find defineConfig call
    const callExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );
    const defineConfigCall = callExpressions.find(
      (call) => call.getExpression().getText() === "defineConfig",
    );

    if (!defineConfigCall) {
      return {
        success: false,
        reason: "No defineConfig call found in vite.config.ts",
      };
    }

    // Get the config object
    const configArg = defineConfigCall.getArguments()[0];
    if (
      !configArg ||
      configArg.getKind() !== SyntaxKind.ObjectLiteralExpression
    ) {
      return {
        success: false,
        reason: "defineConfig argument is not an object literal",
      };
    }

    // Find plugins property
    const configObj = configArg.asKindOrThrow(
      SyntaxKind.ObjectLiteralExpression,
    );
    const pluginsProperty = configObj.getProperty("plugins");

    if (!pluginsProperty) {
      // No plugins property, add one
      configObj.addPropertyAssignment({
        name: "plugins",
        initializer:
          "[TanStackRouterVite({ autoCodeSplitting: true }), react()]",
      });
    } else {
      // Find the plugins array
      const pluginsInit = pluginsProperty
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializer();

      if (
        !pluginsInit ||
        pluginsInit.getKind() !== SyntaxKind.ArrayLiteralExpression
      ) {
        return {
          success: false,
          reason: "plugins property is not an array",
        };
      }

      const pluginsArray = pluginsInit.asKindOrThrow(
        SyntaxKind.ArrayLiteralExpression,
      );

      // Insert TanStack Router plugin at the beginning
      const elements = pluginsArray.getElements();
      if (elements.length > 0) {
        pluginsArray.insertElement(
          0,
          "TanStackRouterVite({ autoCodeSplitting: true })",
        );
      } else {
        pluginsArray.addElement(
          "TanStackRouterVite({ autoCodeSplitting: true })",
        );
      }
    }

    return {
      success: true,
      transformed: sourceFile.getFullText(),
    };
  } catch (err) {
    return {
      success: false,
      reason: `Failed to transform vite.config.ts: ${err}`,
    };
  }
}
