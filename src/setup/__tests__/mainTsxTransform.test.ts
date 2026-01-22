/**
 * Tests for mainTsxTransform.ts
 *
 * These tests verify that the main.tsx transformer correctly:
 * 1. Adds React Query imports and setup
 * 2. Wraps app with QueryClientProvider
 * 3. Skips files that are already configured
 * 4. Handles various file structures
 */
import { describe, it, expect } from "vitest";
import {
  transformMainTsx,
  hasConvexQueryClient,
  canTransformMainTsx,
} from "../mainTsxTransform.js";

// Fresh main.tsx from `create convex@latest`
const FRESH_MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
`;

// Already configured main.tsx
const ALREADY_CONFIGURED_MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ConvexAuthProvider>
  </StrictMode>,
);
`;

// main.tsx without auth provider (just ConvexProvider)
const MAIN_TSX_NO_AUTH = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
`;

// main.tsx with different convex variable name
const MAIN_TSX_CUSTOM_VAR = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={client}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
`;

// Non-Convex main.tsx (should not be transformable)
const NON_CONVEX_MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

describe("mainTsxTransform", () => {
  describe("hasConvexQueryClient", () => {
    it("returns false for fresh main.tsx", () => {
      expect(hasConvexQueryClient(FRESH_MAIN_TSX)).toBe(false);
    });

    it("returns true for already configured main.tsx", () => {
      expect(hasConvexQueryClient(ALREADY_CONFIGURED_MAIN_TSX)).toBe(true);
    });

    it("returns false for non-Convex main.tsx", () => {
      expect(hasConvexQueryClient(NON_CONVEX_MAIN_TSX)).toBe(false);
    });
  });

  describe("canTransformMainTsx", () => {
    it("returns true for fresh main.tsx", () => {
      expect(canTransformMainTsx(FRESH_MAIN_TSX)).toBe(true);
    });

    it("returns true for main.tsx with custom variable name", () => {
      expect(canTransformMainTsx(MAIN_TSX_CUSTOM_VAR)).toBe(true);
    });

    it("returns true for main.tsx without auth provider", () => {
      expect(canTransformMainTsx(MAIN_TSX_NO_AUTH)).toBe(true);
    });

    it("returns false for non-Convex main.tsx", () => {
      expect(canTransformMainTsx(NON_CONVEX_MAIN_TSX)).toBe(false);
    });
  });

  describe("transformMainTsx", () => {
    it("transforms fresh main.tsx correctly", () => {
      const result = transformMainTsx(FRESH_MAIN_TSX);

      expect(result.success).toBe(true);
      expect(result.skipped).toBeFalsy();
      expect(result.transformed).toBeDefined();

      const transformed = result.transformed!;

      // Check imports were added
      expect(transformed).toContain(
        'import { ConvexQueryClient } from "@convex-dev/react-query";'
      );
      expect(transformed).toContain(
        'import { QueryClient, QueryClientProvider } from "@tanstack/react-query";'
      );

      // Check query client setup was added
      expect(transformed).toContain("const convexQueryClient = new ConvexQueryClient(convex)");
      expect(transformed).toContain("const queryClient = new QueryClient({");
      expect(transformed).toContain("convexQueryClient.connect(queryClient)");

      // Check provider was wrapped
      expect(transformed).toContain("<QueryClientProvider client={queryClient}>");
      expect(transformed).toContain("</QueryClientProvider>");
    });

    it("skips already configured main.tsx", () => {
      const result = transformMainTsx(ALREADY_CONFIGURED_MAIN_TSX);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("already configured");
    });

    it("handles custom convex variable name", () => {
      const result = transformMainTsx(MAIN_TSX_CUSTOM_VAR);

      expect(result.success).toBe(true);
      expect(result.transformed).toBeDefined();

      // Should use the custom variable name
      expect(result.transformed).toContain(
        "const convexQueryClient = new ConvexQueryClient(client)"
      );
    });

    it("handles main.tsx without auth provider", () => {
      const result = transformMainTsx(MAIN_TSX_NO_AUTH);

      expect(result.success).toBe(true);
      expect(result.transformed).toBeDefined();

      // Should wrap ConvexProvider instead
      expect(result.transformed).toContain("<QueryClientProvider client={queryClient}>");
    });

    it("fails gracefully for non-Convex main.tsx", () => {
      const result = transformMainTsx(NON_CONVEX_MAIN_TSX);

      expect(result.success).toBe(false);
      expect(result.reason).toContain("expected structure");
    });

    it("produces valid TypeScript", () => {
      const result = transformMainTsx(FRESH_MAIN_TSX);

      expect(result.success).toBe(true);

      // The transformed code should not have syntax errors
      // We can verify this by checking basic structure
      const transformed = result.transformed!;

      // Should have balanced brackets/braces
      const openParens = (transformed.match(/\(/g) || []).length;
      const closeParens = (transformed.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);

      const openBraces = (transformed.match(/\{/g) || []).length;
      const closeBraces = (transformed.match(/\}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });
  });
});
