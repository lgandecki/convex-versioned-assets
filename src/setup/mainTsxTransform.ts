/**
 * AST-based main.tsx transformation using ts-morph.
 *
 * Transforms a fresh create-convex main.tsx to add React Query provider setup
 * required for the admin UI.
 */
import {
  Project,
  SourceFile,
  Node,
  VariableDeclarationKind,
} from "ts-morph";

export interface MainTsxTransformResult {
  success: boolean;
  transformed?: string;
  reason?: string;
  skipped?: boolean;
}

/**
 * Create a ts-morph project and parse TypeScript/TSX content.
 */
function parseContent(content: string, filename = "main.tsx"): SourceFile {
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
 * Check if ConvexQueryClient is already imported (indicating already configured).
 */
export function hasConvexQueryClient(content: string): boolean {
  try {
    const sourceFile = parseContent(content);
    return hasImportFrom(sourceFile, "@convex-dev/react-query");
  } catch {
    return false;
  }
}

/**
 * Check if the main.tsx has the expected structure for transformation.
 * Expected: imports ConvexReactClient, has a variable initialized with new ConvexReactClient.
 */
export function canTransformMainTsx(content: string): boolean {
  try {
    const sourceFile = parseContent(content);

    // Must have ConvexReactClient import
    if (!hasImportFrom(sourceFile, "convex/react")) {
      return false;
    }

    // Must have a variable initialized with new ConvexReactClient
    const hasConvexClient = sourceFile.getVariableStatements().some((stmt) => {
      return stmt.getDeclarations().some((decl) => {
        const initializer = decl.getInitializer();
        if (Node.isNewExpression(initializer)) {
          const expression = initializer.getExpression();
          if (Node.isIdentifier(expression)) {
            return expression.getText() === "ConvexReactClient";
          }
        }
        return false;
      });
    });

    return hasConvexClient;
  } catch {
    return false;
  }
}

/**
 * Find the variable name used for the ConvexReactClient instance.
 * Returns null if not found.
 */
function findConvexClientVarName(sourceFile: SourceFile): string | null {
  for (const stmt of sourceFile.getVariableStatements()) {
    for (const decl of stmt.getDeclarations()) {
      const initializer = decl.getInitializer();
      if (Node.isNewExpression(initializer)) {
        const expression = initializer.getExpression();
        if (
          Node.isIdentifier(expression) &&
          expression.getText() === "ConvexReactClient"
        ) {
          return decl.getName();
        }
      }
    }
  }
  return null;
}

/**
 * Find the index of the variable statement that declares the Convex client.
 */
function findConvexClientStatementIndex(sourceFile: SourceFile): number {
  const statements = sourceFile.getStatements();
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarations()) {
        const initializer = decl.getInitializer();
        if (Node.isNewExpression(initializer)) {
          const expression = initializer.getExpression();
          if (
            Node.isIdentifier(expression) &&
            expression.getText() === "ConvexReactClient"
          ) {
            return i;
          }
        }
      }
    }
  }
  return -1;
}

/**
 * Transform main.tsx to add React Query provider setup.
 *
 * This transformation:
 * 1. Adds imports for ConvexQueryClient and QueryClientProvider
 * 2. Adds query client setup after the ConvexReactClient variable
 * 3. Wraps the app with QueryClientProvider inside ConvexAuthProvider
 */
export function transformMainTsx(content: string): MainTsxTransformResult {
  // Check if already configured
  if (hasConvexQueryClient(content)) {
    return {
      success: true,
      skipped: true,
      reason: "React Query is already configured in main.tsx",
    };
  }

  // Check if transformable
  if (!canTransformMainTsx(content)) {
    return {
      success: false,
      reason:
        "main.tsx does not have the expected structure. " +
        "Expected ConvexReactClient import and initialization.",
    };
  }

  try {
    const sourceFile = parseContent(content);
    const convexVarName = findConvexClientVarName(sourceFile);

    if (!convexVarName) {
      return {
        success: false,
        reason: "Could not find ConvexReactClient variable name.",
      };
    }

    // Step 1: Add imports
    // Find the last import declaration to insert after
    const importDeclarations = sourceFile.getImportDeclarations();
    const lastImportIndex =
      importDeclarations.length > 0
        ? importDeclarations[importDeclarations.length - 1].getChildIndex()
        : -1;

    // Add React Query imports after existing imports
    if (lastImportIndex >= 0) {
      sourceFile.insertImportDeclaration(lastImportIndex + 1, {
        namedImports: ["ConvexQueryClient"],
        moduleSpecifier: "@convex-dev/react-query",
      });
      sourceFile.insertImportDeclaration(lastImportIndex + 2, {
        namedImports: ["QueryClient", "QueryClientProvider"],
        moduleSpecifier: "@tanstack/react-query",
      });
    }

    // Step 2: Add query client setup after convex client
    const convexStatementIndex = findConvexClientStatementIndex(sourceFile);
    if (convexStatementIndex === -1) {
      return {
        success: false,
        reason: "Could not find ConvexReactClient statement.",
      };
    }

    // Insert the query client setup statements
    sourceFile.insertVariableStatement(convexStatementIndex + 1, {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "convexQueryClient",
          initializer: `new ConvexQueryClient(${convexVarName})`,
        },
      ],
    });

    sourceFile.insertVariableStatement(convexStatementIndex + 2, {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "queryClient",
          initializer: `new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
})`,
        },
      ],
    });

    // Add the connect call
    sourceFile.insertStatements(
      convexStatementIndex + 3,
      "convexQueryClient.connect(queryClient);"
    );

    // Get the transformed code
    let transformedCode = sourceFile.getFullText();

    // Step 3: Wrap with QueryClientProvider using text manipulation
    // This is because ts-morph JSX support is limited
    transformedCode = wrapWithQueryClientProvider(transformedCode);

    return {
      success: true,
      transformed: transformedCode,
    };
  } catch (error) {
    return {
      success: false,
      reason: `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Wrap the app content with QueryClientProvider.
 * Uses text manipulation to find ConvexAuthProvider and wrap its child.
 *
 * Looks for patterns like:
 * - <ConvexAuthProvider client={convex}>\n        <App />
 * - <ConvexAuthProvider client={convex}>\n        <App />\n      </ConvexAuthProvider>
 *
 * And transforms to:
 * - <ConvexAuthProvider client={convex}>\n        <QueryClientProvider client={queryClient}>\n          <App />\n        </QueryClientProvider>
 */
function wrapWithQueryClientProvider(code: string): string {
  // Pattern to find the content inside ConvexAuthProvider
  // Match: <ConvexAuthProvider ...>CONTENT</ConvexAuthProvider>
  const authProviderPattern =
    /(<ConvexAuthProvider[^>]*>)([\s\S]*?)(<\/ConvexAuthProvider>)/;
  const match = code.match(authProviderPattern);

  if (!match) {
    // Try ConvexProvider as fallback
    const convexProviderPattern =
      /(<ConvexProvider[^>]*>)([\s\S]*?)(<\/ConvexProvider>)/;
    const convexMatch = code.match(convexProviderPattern);
    if (convexMatch) {
      return wrapProviderContent(code, convexProviderPattern);
    }
    return code; // Can't find provider, return unchanged
  }

  return wrapProviderContent(code, authProviderPattern);
}

/**
 * Helper to wrap provider content with QueryClientProvider.
 */
function wrapProviderContent(code: string, pattern: RegExp): string {
  return code.replace(pattern, (_, openTag: string, content: string, closeTag: string) => {
    // Detect indentation from the content
    const contentLines = content.split("\n");
    let baseIndent = "";

    // Find the indentation of the first non-empty line
    for (const line of contentLines) {
      if (line.trim()) {
        const leadingSpaces = line.match(/^(\s*)/);
        if (leadingSpaces) {
          baseIndent = leadingSpaces[1];
          break;
        }
      }
    }

    // Re-indent the content
    const indentedContent = contentLines
      .map((line) => {
        if (line.trim()) {
          // Add extra indentation to non-empty lines
          if (line.startsWith(baseIndent)) {
            return "  " + line;
          }
          return line;
        }
        return line;
      })
      .join("\n");

    return `${openTag}
${baseIndent}<QueryClientProvider client={queryClient}>${indentedContent}${baseIndent}</QueryClientProvider>
${baseIndent.slice(2)}${closeTag}`;
  });
}
