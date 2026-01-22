/**
 * AST-based http.ts detection and transformation using ts-morph.
 *
 * Detects if http.ts matches the "default" convex-auth template and
 * injects the versioned-assets routes if it does.
 */
import { Project, SyntaxKind, SourceFile, Node, ImportSpecifier, Statement, ExportAssignment, ImportDeclaration, CallExpression as TSMorphCallExpression } from "ts-morph";

export interface HttpTransformResult {
  success: boolean;
  transformed?: string;
  reason?: string;
}

/**
 * Create a ts-morph project and parse TypeScript content.
 */
function parseContent(content: string): SourceFile {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      noEmit: true,
    },
  });
  return project.createSourceFile("http.ts", content);
}

/**
 * Check if a source file has an import from a specific module with a specific named import.
 */
function hasNamedImport(sourceFile: SourceFile, moduleName: string, namedImport: string): boolean {
  const importDeclarations = sourceFile.getImportDeclarations();
  for (const importDecl of importDeclarations) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (moduleSpecifier === moduleName) {
      const namedImports = importDecl.getNamedImports();
      if (namedImports.some((ni: ImportSpecifier) => ni.getName() === namedImport)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a source file has a variable declaration with a specific name
 * initialized with a call to a specific function.
 */
function hasVariableWithCallInit(
  sourceFile: SourceFile,
  varName: string,
  funcName: string,
): boolean {
  const variableStatements = sourceFile.getVariableStatements();
  for (const statement of variableStatements) {
    for (const decl of statement.getDeclarations()) {
      if (decl.getName() === varName) {
        const initializer = decl.getInitializer();
        if (Node.isCallExpression(initializer)) {
          const expression = initializer.getExpression();
          if (Node.isIdentifier(expression) && expression.getText() === funcName) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if a source file has a specific function call as a statement.
 * e.g., auth.addHttpRoutes(http)
 */
function hasExpressionCall(
  sourceFile: SourceFile,
  objectName: string,
  methodName: string,
  argName: string,
): boolean {
  const statements = sourceFile.getStatements();
  for (const statement of statements) {
    if (Node.isExpressionStatement(statement)) {
      const expression = statement.getExpression();
      if (Node.isCallExpression(expression)) {
        const callExpr = expression.getExpression();
        if (Node.isPropertyAccessExpression(callExpr)) {
          const obj = callExpr.getExpression();
          const method = callExpr.getName();
          if (Node.isIdentifier(obj) && obj.getText() === objectName && method === methodName) {
            const args = expression.getArguments();
            if (
              args.length === 1 &&
              Node.isIdentifier(args[0]) &&
              args[0].getText() === argName
            ) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if a source file has a default export of a specific identifier.
 */
function hasDefaultExport(sourceFile: SourceFile, identifierName: string): boolean {
  const exportAssignment = sourceFile.getExportAssignment((ea: ExportAssignment) => !ea.isExportEquals());
  if (exportAssignment) {
    const expression = exportAssignment.getExpression();
    if (Node.isIdentifier(expression) && expression.getText() === identifierName) {
      return true;
    }
  }
  return false;
}

/**
 * Count total imports in a source file.
 */
function countImports(sourceFile: SourceFile): number {
  return sourceFile.getImportDeclarations().length;
}

/**
 * Count expression statements (function calls as statements) in a source file.
 */
function countExpressionStatements(sourceFile: SourceFile): number {
  return sourceFile.getStatements().filter((s: Statement) => Node.isExpressionStatement(s)).length;
}

/**
 * Check if the http.ts content matches the default convex-auth template.
 * Uses AST comparison to ignore whitespace/semicolons.
 *
 * Expected structure:
 * - 2 imports: httpRouter from "convex/server", auth from "./auth"
 * - Variable: const http = httpRouter()
 * - Call: auth.addHttpRoutes(http)
 * - Default export: http
 */
export function isDefaultHttpTemplate(content: string): boolean {
  try {
    const sourceFile = parseContent(content);

    // Check exactly 2 imports
    if (countImports(sourceFile) !== 2) {
      return false;
    }

    // Check required imports
    if (!hasNamedImport(sourceFile, "convex/server", "httpRouter")) {
      return false;
    }
    if (!hasNamedImport(sourceFile, "./auth", "auth")) {
      return false;
    }

    // Check http = httpRouter() variable
    if (!hasVariableWithCallInit(sourceFile, "http", "httpRouter")) {
      return false;
    }

    // Check auth.addHttpRoutes(http) call
    if (!hasExpressionCall(sourceFile, "auth", "addHttpRoutes", "http")) {
      return false;
    }

    // Check exactly 1 expression statement (the addHttpRoutes call)
    if (countExpressionStatements(sourceFile) !== 1) {
      return false;
    }

    // Check default export http
    if (!hasDefaultExport(sourceFile, "http")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Transform http.ts by injecting versioned-assets routes.
 * Returns the transformed code or failure reason.
 */
export function transformHttpTs(content: string): HttpTransformResult {
  // First check if it matches the default template
  if (!isDefaultHttpTemplate(content)) {
    return {
      success: false,
      reason:
        "http.ts does not match the expected default convex-auth template structure. " +
        "Manual integration required.",
    };
  }

  try {
    const sourceFile = parseContent(content);

    // Add new imports at the top, after existing imports
    const importDeclarations = sourceFile.getImportDeclarations();
    const lastImport = importDeclarations[importDeclarations.length - 1];

    // Add import { registerAssetFsRoutes } from "convex-versioned-assets"
    sourceFile.insertImportDeclaration(lastImport.getChildIndex() + 1, {
      namedImports: ["registerAssetFsRoutes"],
      moduleSpecifier: "convex-versioned-assets",
    });

    // Add import { components } from "./_generated/api"
    sourceFile.insertImportDeclaration(lastImport.getChildIndex() + 2, {
      namedImports: ["components"],
      moduleSpecifier: "./_generated/api",
    });

    // Find the export statement and insert registerAssetFsRoutes call before it
    const exportAssignment = sourceFile.getExportAssignment((ea: ExportAssignment) => !ea.isExportEquals());
    if (!exportAssignment) {
      return {
        success: false,
        reason: "Could not find default export statement.",
      };
    }

    // Insert the registerAssetFsRoutes call before the export
    sourceFile.insertStatements(exportAssignment.getChildIndex(), [
      "",
      "// Asset serving routes - serves files at /am/file/v/{versionId}",
      "registerAssetFsRoutes(http, components.versionedAssets);",
      "",
    ]);

    return {
      success: true,
      transformed: sourceFile.getFullText(),
    };
  } catch (error) {
    return {
      success: false,
      reason: `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if http.ts already has versioned-assets routes configured.
 */
export function hasVersionedAssetsRoutes(content: string): boolean {
  try {
    const sourceFile = parseContent(content);

    // Check for import from convex-versioned-assets
    const hasImport = sourceFile.getImportDeclarations().some((importDecl: ImportDeclaration) => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      return moduleSpecifier === "convex-versioned-assets";
    });

    // Check for registerAssetFsRoutes call
    const hasCall = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).some((call: TSMorphCallExpression) => {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression)) {
        return expression.getText() === "registerAssetFsRoutes";
      }
      return false;
    });

    return hasImport || hasCall;
  } catch {
    return false;
  }
}
