/**
 * App.tsx transformation for admin panel setup.
 *
 * Unlike main.tsx which we transform, for App.tsx we check if it's a fresh
 * template and replace it entirely with the admin panel setup.
 */
import { Project, SourceFile, Node } from "ts-morph";

export interface AppTsxTransformResult {
  success: boolean;
  transformed?: string;
  reason?: string;
  skipped?: boolean;
}

/**
 * Create a ts-morph project and parse TypeScript/TSX content.
 */
function parseContent(content: string, filename = "App.tsx"): SourceFile {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      jsx: 2, // React
      allowJs: true,
      noEmit: true,
    },
  });
  return project.createSourceFile(filename, content);
}

/**
 * Check if a source file has an import from a specific module.
 */
function hasImportFrom(sourceFile: SourceFile, moduleName: string): boolean {
  return sourceFile
    .getImportDeclarations()
    .some((imp) => imp.getModuleSpecifierValue() === moduleName);
}

/**
 * Check if AdminPanel is already imported (indicating already configured).
 */
export function hasAdminPanel(content: string): boolean {
  try {
    const sourceFile = parseContent(content);
    // Check for import containing AdminPanel or @/admin-ui
    const hasAdminImport = sourceFile.getImportDeclarations().some((imp) => {
      const moduleSpec = imp.getModuleSpecifierValue();
      return (
        moduleSpec.includes("admin-ui") ||
        moduleSpec.includes("AdminPanel") ||
        imp.getNamedImports().some((ni) => ni.getName() === "AdminPanel")
      );
    });
    return hasAdminImport;
  } catch {
    return false;
  }
}

/**
 * Check if the App.tsx looks like a fresh create-convex template.
 * Fresh templates typically have simple structure with minimal imports.
 */
export function isFreshAppTemplate(content: string): boolean {
  try {
    const sourceFile = parseContent(content);

    // Fresh templates usually have few imports (React, convex, maybe auth)
    const importCount = sourceFile.getImportDeclarations().length;
    if (importCount > 6) {
      return false; // Too many imports, likely customized
    }

    // Check for routing imports - strong sign of customization
    const hasRoutingImport = sourceFile.getImportDeclarations().some((imp) => {
      const module = imp.getModuleSpecifierValue();
      return (
        module.includes("react-router") ||
        module.includes("wouter") ||
        module.includes("@tanstack/router")
      );
    });
    if (hasRoutingImport) {
      return false; // Has routing, definitely customized
    }

    // Check for common signs of a fresh template
    const hasConvexImport =
      hasImportFrom(sourceFile, "convex/react") ||
      hasImportFrom(sourceFile, "@convex-dev/auth/react");

    // Fresh template usually has a simple App function
    const defaultExport = sourceFile.getDefaultExportSymbol();
    const hasDefaultExport = !!defaultExport;

    // If it has Convex imports and a default export, it's likely transformable
    return hasConvexImport && hasDefaultExport;
  } catch {
    return false;
  }
}

/**
 * Check if App.tsx can be safely replaced with admin panel.
 *
 * We check if:
 * 1. AdminPanel is not already configured
 * 2. The file looks like a fresh template OR user confirms replacement
 */
export function canReplaceAppTsx(content: string): boolean {
  // Already has admin panel
  if (hasAdminPanel(content)) {
    return false;
  }

  // Any App.tsx can potentially be replaced (with confirmation)
  return true;
}

/**
 * The admin panel App.tsx template.
 * Uses the library import pattern with AdminUIProvider.
 */
const adminPanelTemplate = `import { Authenticated, Unauthenticated } from "convex/react";
import { AdminPanel, AdminUIProvider, LoginModal } from "convex-versioned-assets/admin-ui";
import "convex-versioned-assets/admin-ui/styles";
import { api } from "../convex/_generated/api";

export default function App() {
  return (
    <AdminUIProvider api={api}>
      <Authenticated>
        <AdminPanel />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </AdminUIProvider>
  );
}
`;

/**
 * Replace App.tsx with the admin panel template.
 */
export function replaceAppTsx(content: string): AppTsxTransformResult {
  // Check if already configured
  if (hasAdminPanel(content)) {
    return {
      success: true,
      skipped: true,
      reason: "AdminPanel is already configured in App.tsx",
    };
  }

  // Return the replacement template
  return {
    success: true,
    transformed: adminPanelTemplate,
  };
}

/**
 * Get information about whether App.tsx looks customized.
 * This helps the setup script decide whether to ask for confirmation.
 */
export function analyzeAppTsx(content: string): {
  hasAdminPanel: boolean;
  isFreshTemplate: boolean;
  componentCount: number;
  hasCustomRouting: boolean;
} {
  try {
    const sourceFile = parseContent(content);

    // Count components (function declarations and arrow function variables)
    let componentCount = 0;
    sourceFile.getFunctions().forEach((fn) => {
      if (
        fn.getName()?.match(/^[A-Z]/) ||
        fn.isDefaultExport()
      ) {
        componentCount++;
      }
    });
    sourceFile.getVariableStatements().forEach((stmt) => {
      stmt.getDeclarations().forEach((decl) => {
        if (decl.getName().match(/^[A-Z]/)) {
          const init = decl.getInitializer();
          if (init && Node.isArrowFunction(init)) {
            componentCount++;
          }
        }
      });
    });

    // Check for routing imports
    const hasCustomRouting = sourceFile.getImportDeclarations().some((imp) => {
      const module = imp.getModuleSpecifierValue();
      return (
        module.includes("react-router") ||
        module.includes("wouter") ||
        module.includes("@tanstack/router")
      );
    });

    return {
      hasAdminPanel: hasAdminPanel(content),
      isFreshTemplate: isFreshTemplate(content),
      componentCount,
      hasCustomRouting,
    };
  } catch {
    return {
      hasAdminPanel: false,
      isFreshTemplate: false,
      componentCount: 0,
      hasCustomRouting: false,
    };
  }
}

/**
 * Alias for isFreshAppTemplate for consistency.
 */
function isFreshTemplate(content: string): boolean {
  return isFreshAppTemplate(content);
}
