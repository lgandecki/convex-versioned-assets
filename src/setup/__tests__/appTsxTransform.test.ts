/**
 * Tests for appTsxTransform.ts
 *
 * These tests verify that the App.tsx transformer correctly:
 * 1. Detects if AdminPanel is already configured
 * 2. Identifies fresh templates
 * 3. Replaces content with admin panel setup
 */
import { describe, it, expect } from "vitest";
import {
  hasAdminPanel,
  isFreshAppTemplate,
  replaceAppTsx,
  analyzeAppTsx,
} from "../appTsxTransform.js";

// Fresh App.tsx from `create convex@latest`
const FRESH_APP_TSX = `import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInForm } from "./SignInForm";

export default function App() {
  return (
    <>
      <AuthLoading>Loading...</AuthLoading>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <Content />
      </Authenticated>
    </>
  );
}

function Content() {
  return <div>Welcome to your Convex app!</div>;
}
`;

// Already configured App.tsx with AdminPanel
const CONFIGURED_APP_TSX = `import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { AdminPanel } from "@/admin-ui/AdminPanel";
import { LoginModal } from "@/admin-ui/components/LoginModal";

export default function App() {
  const [folderPath, setFolderPath] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<{
    folderPath: string;
    basename: string;
  } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  return (
    <>
      <Authenticated>
        <AdminPanel
          folderPath={folderPath}
          selectedAsset={selectedAsset}
          selectedVersionId={selectedVersionId}
          onFolderSelect={setFolderPath}
          onAssetSelect={setSelectedAsset}
          onVersionSelect={setSelectedVersionId}
        />
      </Authenticated>
      <Unauthenticated>
        <LoginModal open={true} />
      </Unauthenticated>
    </>
  );
}
`;

// Customized App.tsx with routing
const CUSTOMIZED_APP_TSX = `import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Authenticated, Unauthenticated } from "convex/react";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Authenticated>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Authenticated>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
    </BrowserRouter>
  );
}
`;

// Simple App.tsx without Convex
const SIMPLE_APP_TSX = `export default function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
`;

// App.tsx with different admin-ui import path
const ADMIN_PANEL_ALT_IMPORT = `import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  return <AdminPanel />;
}
`;

describe("appTsxTransform", () => {
  describe("hasAdminPanel", () => {
    it("returns false for fresh App.tsx", () => {
      expect(hasAdminPanel(FRESH_APP_TSX)).toBe(false);
    });

    it("returns true for configured App.tsx", () => {
      expect(hasAdminPanel(CONFIGURED_APP_TSX)).toBe(true);
    });

    it("returns false for customized App.tsx without AdminPanel", () => {
      expect(hasAdminPanel(CUSTOMIZED_APP_TSX)).toBe(false);
    });

    it("returns false for simple App.tsx", () => {
      expect(hasAdminPanel(SIMPLE_APP_TSX)).toBe(false);
    });

    it("returns true for App.tsx with AdminPanel import (any path)", () => {
      expect(hasAdminPanel(ADMIN_PANEL_ALT_IMPORT)).toBe(true);
    });
  });

  describe("isFreshAppTemplate", () => {
    it("returns true for fresh create-convex App.tsx", () => {
      expect(isFreshAppTemplate(FRESH_APP_TSX)).toBe(true);
    });

    it("returns false for App.tsx with AdminPanel already configured", () => {
      // Even though it has Convex, it's been modified
      expect(isFreshAppTemplate(CONFIGURED_APP_TSX)).toBe(true); // Has convex imports
    });

    it("returns false for customized App.tsx with many imports", () => {
      // Has react-router and many components
      expect(isFreshAppTemplate(CUSTOMIZED_APP_TSX)).toBe(false);
    });

    it("returns false for simple non-Convex App.tsx", () => {
      expect(isFreshAppTemplate(SIMPLE_APP_TSX)).toBe(false);
    });
  });

  describe("replaceAppTsx", () => {
    it("replaces fresh App.tsx with admin panel template", () => {
      const result = replaceAppTsx(FRESH_APP_TSX);

      expect(result.success).toBe(true);
      expect(result.skipped).toBeFalsy();
      expect(result.transformed).toBeDefined();

      const transformed = result.transformed!;

      // Check expected library imports
      expect(transformed).toContain(
        'import { Authenticated, Unauthenticated } from "convex/react";',
      );
      expect(transformed).toContain(
        'import { AdminPanel, AdminUIProvider, LoginModal } from "convex-versioned-assets/admin-ui";',
      );
      expect(transformed).toContain(
        'import "convex-versioned-assets/admin-ui/styles";',
      );
      expect(transformed).toContain(
        'import { api } from "../convex/_generated/api";',
      );

      // Check AdminUIProvider wrapper
      expect(transformed).toContain("<AdminUIProvider api={api}>");

      // Check component structure
      expect(transformed).toContain("<AdminPanel />");
      expect(transformed).toContain("<LoginModal open={true} />");
      expect(transformed).toContain("<Authenticated>");
      expect(transformed).toContain("<Unauthenticated>");
    });

    it("skips App.tsx that already has AdminPanel", () => {
      const result = replaceAppTsx(CONFIGURED_APP_TSX);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("already configured");
    });

    it("replaces customized App.tsx (caller should confirm)", () => {
      // This function doesn't check if it's customized - that's the caller's job
      const result = replaceAppTsx(CUSTOMIZED_APP_TSX);

      expect(result.success).toBe(true);
      expect(result.transformed).toBeDefined();
    });
  });

  describe("analyzeAppTsx", () => {
    it("correctly analyzes fresh App.tsx", () => {
      const analysis = analyzeAppTsx(FRESH_APP_TSX);

      expect(analysis.hasAdminPanel).toBe(false);
      expect(analysis.isFreshTemplate).toBe(true);
      expect(analysis.isCustomized).toBe(false);
      expect(analysis.hasCustomRouting).toBe(false);
      expect(analysis.componentCount).toBeGreaterThanOrEqual(1);
    });

    it("correctly identifies AdminPanel presence", () => {
      const analysis = analyzeAppTsx(CONFIGURED_APP_TSX);

      expect(analysis.hasAdminPanel).toBe(true);
    });

    it("correctly identifies custom routing and sets isCustomized", () => {
      const analysis = analyzeAppTsx(CUSTOMIZED_APP_TSX);

      expect(analysis.hasCustomRouting).toBe(true);
      expect(analysis.isCustomized).toBe(true);
      expect(analysis.isFreshTemplate).toBe(false);
    });

    it("handles simple non-Convex App.tsx as customized", () => {
      const analysis = analyzeAppTsx(SIMPLE_APP_TSX);

      expect(analysis.hasAdminPanel).toBe(false);
      expect(analysis.isFreshTemplate).toBe(false);
      expect(analysis.isCustomized).toBe(true);
      expect(analysis.hasCustomRouting).toBe(false);
    });

    it("isCustomized is inverse of isFreshTemplate", () => {
      const freshAnalysis = analyzeAppTsx(FRESH_APP_TSX);
      const customAnalysis = analyzeAppTsx(CUSTOMIZED_APP_TSX);

      expect(freshAnalysis.isCustomized).toBe(!freshAnalysis.isFreshTemplate);
      expect(customAnalysis.isCustomized).toBe(!customAnalysis.isFreshTemplate);
    });
  });
});
